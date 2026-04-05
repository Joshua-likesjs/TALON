'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { ref, onValue, off, get } from 'firebase/database';
import { database, isFirebaseConfigured } from '@/lib/firebase';

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
  location: AnimalLocationVPJS | null;
  loading: boolean;
  error: string | null;
}

interface AnimalsContextTypeVPJS {
  trackedAnimals: TrackedAnimalVPJS[];
  addAnimal: (codigo: string, nome?: string) => Promise<void>;
  removeAnimal: (codigo: string) => void;
  getAnimalByCode: (codigo: string) => TrackedAnimalVPJS | undefined;
  isTracking: (codigo: string) => boolean;
}

const AnimalsContextVPJS = createContext<AnimalsContextTypeVPJS | undefined>(undefined);

// Local storage key for tracked animals
const LOCAL_TRACKED_ANIMALS_KEY = 'talon_tracked_animals_vpjs';

export function AnimalsProviderVPJS({ children }: { children: React.ReactNode }) {
  const [trackedAnimals, setTrackedAnimals] = useState<TrackedAnimalVPJS[]>([]);

  // Carregar animais salvos do localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(LOCAL_TRACKED_ANIMALS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { codigoVPJS: string; nomeVPJS: string }[];
        // Inicializar animais sem localização (será carregada via Firebase)
        const initialAnimals: TrackedAnimalVPJS[] = parsed.map(a => ({
          codigoVPJS: a.codigoVPJS,
          nomeVPJS: a.nomeVPJS,
          location: null,
          loading: true,
          error: null,
        }));
        setTrackedAnimals(initialAnimals);
      }
    } catch (e) {
      console.error('Erro ao carregar animais salvos:', e);
    }
  }, []);

  // Salvar animais no localStorage quando mudar
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const toSave = trackedAnimals.map(a => ({
      codigoVPJS: a.codigoVPJS,
      nomeVPJS: a.nomeVPJS,
    }));
    localStorage.setItem(LOCAL_TRACKED_ANIMALS_KEY, JSON.stringify(toSave));
  }, [trackedAnimals]);

  // Configurar listeners do Firebase para cada animal
  useEffect(() => {
    if (!isFirebaseConfigured || !database) return;

    const listeners: { [codigo: string]: () => void } = {};

    trackedAnimals.forEach((animal) => {
      const animalRef = ref(database, `animaisVPJS/${animal.codigoVPJS}`);
      
      console.log(`🔥 Configurando listener para animal: ${animal.codigoVPJS}`);
      
      const unsubscribe = onValue(animalRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          
          // Verificar se os dados existem
          if (data && typeof data.latitudeVPJS === 'number' && typeof data.longitudeVPJS === 'number') {
            const location: AnimalLocationVPJS = {
              latitudeVPJS: data.latitudeVPJS,
              longitudeVPJS: data.longitudeVPJS,
              timestampVPJS: data.timestampVPJS || Date.now(),
            };
            
            console.log(`🔥 Localização recebida para ${animal.codigoVPJS}:`, location);
            
            setTrackedAnimals(prev => prev.map(a => 
              a.codigoVPJS === animal.codigoVPJS 
                ? { ...a, location, loading: false, error: null }
                : a
            ));
          } else {
            setTrackedAnimals(prev => prev.map(a => 
              a.codigoVPJS === animal.codigoVPJS 
                ? { ...a, loading: false, error: 'Dados de localização inválidos' }
                : a
            ));
          }
        } else {
          setTrackedAnimals(prev => prev.map(a => 
            a.codigoVPJS === animal.codigoVPJS 
              ? { ...a, loading: false, error: 'Animal não encontrado' }
              : a
          ));
        }
      }, (error) => {
        console.error(`Erro ao escutar animal ${animal.codigoVPJS}:`, error);
        setTrackedAnimals(prev => prev.map(a => 
          a.codigoVPJS === animal.codigoVPJS 
            ? { ...a, loading: false, error: 'Erro ao carregar localização' }
            : a
        ));
      });

      listeners[animal.codigoVPJS] = () => off(animalRef);
    });

    return () => {
      Object.values(listeners).forEach(unsubscribe => unsubscribe());
    };
  }, [trackedAnimals.map(a => a.codigoVPJS).join(',')]);

  const addAnimal = useCallback(async (codigo: string, nome?: string) => {
    if (!codigo || codigo.trim() === '') {
      throw new Error('Código do animal é obrigatório');
    }

    const codigoTrimmed = codigo.trim();

    // Verificar se já está rastreando
    if (trackedAnimals.some(a => a.codigoVPJS === codigoTrimmed)) {
      throw new Error('Este animal já está sendo rastreado');
    }

    // Adicionar animal imediatamente (loading = true)
    const newAnimal: TrackedAnimalVPJS = {
      codigoVPJS: codigoTrimmed,
      nomeVPJS: nome || `Animal ${codigoTrimmed}`,
      location: null,
      loading: true,
      error: null,
    };

    setTrackedAnimals(prev => [...prev, newAnimal]);

    // Se tem Firebase, verificar se o animal existe
    if (isFirebaseConfigured && database) {
      try {
        const animalRef = ref(database, `animaisVPJS/${codigoTrimmed}`);
        const snapshot = await get(animalRef);
        
        if (!snapshot.exists()) {
          // Animal não existe - remover da lista
          setTrackedAnimals(prev => prev.filter(a => a.codigoVPJS !== codigoTrimmed));
          throw new Error('Animal não encontrado no sistema');
        }
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Erro ao verificar animal');
      }
    }
  }, [trackedAnimals]);

  const removeAnimal = useCallback((codigo: string) => {
    setTrackedAnimals(prev => prev.filter(a => a.codigoVPJS !== codigo));
  }, []);

  const getAnimalByCode = useCallback((codigo: string) => {
    return trackedAnimals.find(a => a.codigoVPJS === codigo);
  }, [trackedAnimals]);

  const isTracking = useCallback((codigo: string) => {
    return trackedAnimals.some(a => a.codigoVPJS === codigo);
  }, [trackedAnimals]);

  const value = useMemo(() => ({
    trackedAnimals,
    addAnimal,
    removeAnimal,
    getAnimalByCode,
    isTracking,
  }), [trackedAnimals, addAnimal, removeAnimal, getAnimalByCode, isTracking]);

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
