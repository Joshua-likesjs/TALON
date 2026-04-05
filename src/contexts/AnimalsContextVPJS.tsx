'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { ref, onValue, off, get, update } from 'firebase/database';
import { database, isFirebaseConfigured } from '@/lib/firebase';
import { useAuthVPJS } from '@/contexts/AuthContextVPJS';

// Interface para localização do animal
export interface AnimalLocationVPJS {
  latitudeVPJS: number;
  longitudeVPJS: number;
  timestampVPJS: number;
}

// Interface para animal rastreado
export interface TrackedAnimalVPJS {
  codigoVPJS: string;
  nomeVPJS: string;
  fotoVPJS?: string; // URL ou base64 da foto
  location: AnimalLocationVPJS | null;
  loading: boolean;
  error: string | null;
}

interface AnimalsContextTypeVPJS {
  trackedAnimals: TrackedAnimalVPJS[];
  addAnimal: (codigo: string, nome?: string, foto?: string) => Promise<void>;
  removeAnimal: (codigo: string) => Promise<void>;
  updateAnimal: (codigo: string, data: { nomeVPJS?: string; fotoVPJS?: string }) => Promise<void>;
  getAnimalByCode: (codigo: string) => TrackedAnimalVPJS | undefined;
  isTracking: (codigo: string) => boolean;
}

const AnimalsContextVPJS = createContext<AnimalsContextTypeVPJS | undefined>(undefined);

// Local storage key for tracked animal codes (só os códigos, dados ficam no Firebase)
const LOCAL_TRACKED_ANIMALS_KEY = 'talon_tracked_animals_codes_vpjs';

export function AnimalsProviderVPJS({ children }: { children: React.ReactNode }) {
  const { userVPJS } = useAuthVPJS();
  const [trackedAnimals, setTrackedAnimals] = useState<TrackedAnimalVPJS[]>([]);
  const [animalCodes, setAnimalCodes] = useState<string[]>([]);

  // Carregar códigos de animais do localStorage (por usuário)
  useEffect(() => {
    if (typeof window === 'undefined' || !userVPJS) return;
    
    try {
      const key = `${LOCAL_TRACKED_ANIMALS_KEY}_${userVPJS.uidVPJS}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const codes = JSON.parse(stored) as string[];
        console.log('🔥 Códigos de animais carregados:', codes);
        setAnimalCodes(codes);
        
        // Inicializar animais com loading
        const initialAnimals: TrackedAnimalVPJS[] = codes.map(codigo => ({
          codigoVPJS: codigo,
          nomeVPJS: `Animal ${codigo}`,
          location: null,
          loading: true,
          error: null,
        }));
        setTrackedAnimals(initialAnimals);
      }
    } catch (e) {
      console.error('Erro ao carregar códigos de animais:', e);
    }
  }, [userVPJS]);

  // Salvar códigos no localStorage quando mudar
  useEffect(() => {
    if (typeof window === 'undefined' || !userVPJS) return;
    
    const key = `${LOCAL_TRACKED_ANIMALS_KEY}_${userVPJS.uidVPJS}`;
    localStorage.setItem(key, JSON.stringify(animalCodes));
  }, [animalCodes, userVPJS]);

  // Configurar listeners do Firebase para cada animal (localização + foto + nome)
  useEffect(() => {
    if (!isFirebaseConfigured || !database || animalCodes.length === 0) return;

    const listeners: { [codigo: string]: () => void } = {};

    animalCodes.forEach((codigo) => {
      const animalRef = ref(database, `animaisVPJS/${codigo}`);
      
      console.log(`🔥 Configurando listener para animal: ${codigo}`);
      
      const unsubscribe = onValue(animalRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          
          // Verificar se tem localização
          if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
            const location: AnimalLocationVPJS = {
              latitudeVPJS: data.latitude,
              longitudeVPJS: data.longitude,
              timestampVPJS: data.timestamp || Date.now(),
            };
            
            // Nome e foto vêm do Firebase (campos diretos sem sufixo)
            const nomeVPJS = data.nomeVPJS || data.nome || `Animal ${codigo}`;
            const fotoVPJS = data.fotoVPJS || data.foto || undefined;
            
            console.log(`🔥 Dados recebidos para ${codigo}:`, { location, nomeVPJS, fotoVPJS: fotoVPJS ? 'tem foto' : 'sem foto' });
            
            setTrackedAnimals(prev => {
              const existing = prev.find(a => a.codigoVPJS === codigo);
              if (existing) {
                return prev.map(a => 
                  a.codigoVPJS === codigo 
                    ? { ...a, nomeVPJS, fotoVPJS, location, loading: false, error: null }
                    : a
                );
              } else {
                return [...prev, {
                  codigoVPJS: codigo,
                  nomeVPJS,
                  fotoVPJS,
                  location,
                  loading: false,
                  error: null,
                }];
              }
            });
          } else if (data) {
            // Tem dados mas não tem localização válida - pode ter nome/foto
            const nomeVPJS = data.nomeVPJS || data.nome || `Animal ${codigo}`;
            const fotoVPJS = data.fotoVPJS || data.foto || undefined;
            
            setTrackedAnimals(prev => prev.map(a => 
              a.codigoVPJS === codigo 
                ? { ...a, nomeVPJS, fotoVPJS, loading: false, error: 'Dados de localização inválidos' }
                : a
            ));
          } else {
            setTrackedAnimals(prev => prev.map(a => 
              a.codigoVPJS === codigo 
                ? { ...a, loading: false, error: 'Animal não encontrado' }
                : a
            ));
          }
        } else {
          setTrackedAnimals(prev => prev.map(a => 
            a.codigoVPJS === codigo 
              ? { ...a, loading: false, error: 'Animal não encontrado' }
              : a
          ));
        }
      }, (error) => {
        console.error(`Erro ao escutar animal ${codigo}:`, error);
        setTrackedAnimals(prev => prev.map(a => 
          a.codigoVPJS === codigo 
            ? { ...a, loading: false, error: 'Erro ao carregar localização' }
            : a
        ));
      });

      listeners[codigo] = () => off(animalRef);
    });

    return () => {
      Object.values(listeners).forEach(unsubscribe => unsubscribe());
    };
  }, [animalCodes.join(',')]);

  const addAnimal = useCallback(async (codigo: string, nome?: string, foto?: string) => {
    if (!codigo || codigo.trim() === '') {
      throw new Error('Código do animal é obrigatório');
    }

    const codigoTrimmed = codigo.trim();

    // Verificar se já está rastreando
    if (animalCodes.includes(codigoTrimmed)) {
      throw new Error('Este animal já está sendo rastreado');
    }

    // Se tem Firebase, verificar se o animal existe e salvar nome/foto
    if (isFirebaseConfigured && database) {
      try {
        const animalRef = ref(database, `animaisVPJS/${codigoTrimmed}`);
        const snapshot = await get(animalRef);
        
        if (!snapshot.exists()) {
          throw new Error('Animal não encontrado no sistema');
        }

        // Se tem nome ou foto, atualizar no nó do animal
        if (nome || foto) {
          const updateData: { [key: string]: any } = {};
          if (nome) updateData.nomeVPJS = nome;
          if (foto) updateData.fotoVPJS = foto;
          
          await update(animalRef, updateData);
          console.log(`🔥 Nome/foto salvos em animaisVPJS/${codigoTrimmed}:`, updateData);
        }
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Erro ao verificar animal');
      }
    }

    // Adicionar código à lista
    setAnimalCodes(prev => [...prev, codigoTrimmed]);
    
    // Adicionar animal inicial
    setTrackedAnimals(prev => [...prev, {
      codigoVPJS: codigoTrimmed,
      nomeVPJS: nome || `Animal ${codigoTrimmed}`,
      fotoVPJS: foto,
      location: null,
      loading: true,
      error: null,
    }]);
  }, [animalCodes]);

  const removeAnimal = useCallback(async (codigo: string) => {
    setAnimalCodes(prev => prev.filter(c => c !== codigo));
    setTrackedAnimals(prev => prev.filter(a => a.codigoVPJS !== codigo));
  }, []);

  const updateAnimal = useCallback(async (codigo: string, data: { nomeVPJS?: string; fotoVPJS?: string }) => {
    // Atualizar no Firebase
    if (isFirebaseConfigured && database) {
      try {
        const animalRef = ref(database, `animaisVPJS/${codigo}`);
        await update(animalRef, data);
        console.log(`🔥 Animal ${codigo} atualizado no Firebase:`, data);
      } catch (error) {
        console.error('Erro ao atualizar animal:', error);
        throw error;
      }
    }
    
    // Atualizar localmente também
    setTrackedAnimals(prev => prev.map(a => 
      a.codigoVPJS === codigo 
        ? { ...a, ...data }
        : a
    ));
  }, []);

  const getAnimalByCode = useCallback((codigo: string) => {
    return trackedAnimals.find(a => a.codigoVPJS === codigo);
  }, [trackedAnimals]);

  const isTracking = useCallback((codigo: string) => {
    return animalCodes.includes(codigo);
  }, [animalCodes]);

  const value = useMemo(() => ({
    trackedAnimals,
    addAnimal,
    removeAnimal,
    updateAnimal,
    getAnimalByCode,
    isTracking,
  }), [trackedAnimals, addAnimal, removeAnimal, updateAnimal, getAnimalByCode, isTracking]);

  return (
    <AnimalsContextVPJS.Provider value={value}>
      {children}
    </AnimalsContextVPJS.Provider>
  );
}

export function useAnimalsVPJS() {
  const context = useContext(AnimalsContextVPJS);
  if (context === undefined) {
    throw new Error('useAnimalsVPJS must be used within an AnimalsProviderVPJS');
  }
  return context;
}
