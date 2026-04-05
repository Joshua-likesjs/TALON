'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { ref, onValue, off, get, update, remove } from 'firebase/database';
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

export function AnimalsProviderVPJS({ children }: { children: React.ReactNode }) {
  const { userVPJS } = useAuthVPJS();
  const [trackedAnimals, setTrackedAnimals] = useState<TrackedAnimalVPJS[]>([]);
  const [animaisUsuario, setAnimaisUsuario] = useState<{ [codigo: string]: { nomeVPJS: string; fotoVPJS?: string } }>({});

  // Carregar lista de animais do usuário do Firebase e sincronizar em tempo real
  useEffect(() => {
    if (!userVPJS || !isFirebaseConfigured || !database) {
      // Se não tem usuário logado, limpar lista
      setTrackedAnimals([]);
      setAnimaisUsuario({});
      return;
    }

    const animaisRef = ref(database, `usuarios/${userVPJS.uidVPJS}/animaisVPJS`);
    
    console.log('🔥 Configurando listener para animais do usuário');
    
    const unsubscribe = onValue(animaisRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log('🔥 Animais do usuário carregados:', data);
        
        const animaisMap: { [codigo: string]: { nomeVPJS: string; fotoVPJS?: string } } = {};
        const animalsList: TrackedAnimalVPJS[] = [];
        
        Object.keys(data).forEach((codigo) => {
          const animalData = data[codigo];
          animaisMap[codigo] = {
            nomeVPJS: animalData.nomeVPJS || `Animal ${codigo}`,
            fotoVPJS: animalData.fotoVPJS,
          };
          
          animalsList.push({
            codigoVPJS: codigo,
            nomeVPJS: animalData.nomeVPJS || `Animal ${codigo}`,
            fotoVPJS: animalData.fotoVPJS,
            location: null,
            loading: true,
            error: null,
          });
        });
        
        setAnimaisUsuario(animaisMap);
        setTrackedAnimals(animalsList);
      } else {
        console.log('🔥 Nenhum animal salvo para o usuário');
        setAnimaisUsuario({});
        setTrackedAnimals([]);
      }
    }, (error) => {
      console.error('Erro ao carregar animais do usuário:', error);
    });

    return () => {
      off(animaisRef);
    };
  }, [userVPJS]);

  // Configurar listeners do Firebase para localização de cada animal
  useEffect(() => {
    if (!isFirebaseConfigured || !database || trackedAnimals.length === 0) return;

    const listeners: { [codigo: string]: () => void } = {};

    trackedAnimals.forEach((animal) => {
      const animalRef = ref(database, `animaisVPJS/${animal.codigoVPJS}`);
      
      console.log(`🔥 Configurando listener de localização para animal: ${animal.codigoVPJS}`);
      
      const unsubscribe = onValue(animalRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          
          // Verificar se os dados existem (campos sem sufixo VPJS no Firebase)
          if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
            const location: AnimalLocationVPJS = {
              latitudeVPJS: data.latitude,
              longitudeVPJS: data.longitude,
              timestampVPJS: data.timestamp || Date.now(),
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
  }, [trackedAnimals.map(a => a.codigoVPJS).join(','), userVPJS]);

  const addAnimal = useCallback(async (codigo: string, nome?: string, foto?: string) => {
    if (!codigo || codigo.trim() === '') {
      throw new Error('Código do animal é obrigatório');
    }

    const codigoTrimmed = codigo.trim();

    // Verificar se já está rastreando
    if (trackedAnimals.some(a => a.codigoVPJS === codigoTrimmed)) {
      throw new Error('Este animal já está sendo rastreado');
    }

    // Se tem Firebase, verificar se o animal existe e salvar
    if (isFirebaseConfigured && database) {
      try {
        // Verificar se o animal existe no nó de animais
        const animalRef = ref(database, `animaisVPJS/${codigoTrimmed}`);
        const snapshot = await get(animalRef);
        
        if (!snapshot.exists()) {
          throw new Error('Animal não encontrado no sistema');
        }

        // Salvar no nó do usuário
        if (userVPJS) {
          const usuarioAnimalRef = ref(database, `usuarios/${userVPJS.uidVPJS}/animaisVPJS/${codigoTrimmed}`);
          await update(usuarioAnimalRef, {
            nomeVPJS: nome || `Animal ${codigoTrimmed}`,
            fotoVPJS: foto || null,
            adicionadoEmVPJS: Date.now(),
          });
          console.log(`🔥 Animal ${codigoTrimmed} salvo no Firebase do usuário`);
        }
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Erro ao verificar animal');
      }
    } else {
      // Modo demo - adicionar localmente
      const newAnimal: TrackedAnimalVPJS = {
        codigoVPJS: codigoTrimmed,
        nomeVPJS: nome || `Animal ${codigoTrimmed}`,
        fotoVPJS: foto,
        location: null,
        loading: false,
        error: null,
      };
      setTrackedAnimals(prev => [...prev, newAnimal]);
    }
  }, [trackedAnimals, userVPJS]);

  const removeAnimal = useCallback(async (codigo: string) => {
    if (isFirebaseConfigured && database && userVPJS) {
      try {
        const usuarioAnimalRef = ref(database, `usuarios/${userVPJS.uidVPJS}/animaisVPJS/${codigo}`);
        await remove(usuarioAnimalRef);
        console.log(`🔥 Animal ${codigo} removido do Firebase`);
      } catch (error) {
        console.error('Erro ao remover animal:', error);
      }
    } else {
      setTrackedAnimals(prev => prev.filter(a => a.codigoVPJS !== codigo));
    }
  }, [userVPJS]);

  const updateAnimal = useCallback(async (codigo: string, data: { nomeVPJS?: string; fotoVPJS?: string }) => {
    if (isFirebaseConfigured && database && userVPJS) {
      try {
        const usuarioAnimalRef = ref(database, `usuarios/${userVPJS.uidVPJS}/animaisVPJS/${codigo}`);
        await update(usuarioAnimalRef, {
          ...data,
          atualizadoEmVPJS: Date.now(),
        });
        console.log(`🔥 Animal ${codigo} atualizado no Firebase:`, data);
      } catch (error) {
        console.error('Erro ao atualizar animal:', error);
        throw error;
      }
    } else {
      setTrackedAnimals(prev => prev.map(a => 
        a.codigoVPJS === codigo 
          ? { ...a, ...data }
          : a
      ));
    }
  }, [userVPJS]);

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
