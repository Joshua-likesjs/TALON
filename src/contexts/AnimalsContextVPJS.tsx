'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback, useRef } from 'react';
import { ref, onValue, off, get, update, push, set, query, orderByKey, limitToLast } from 'firebase/database';
import { database, isFirebaseConfigured } from '@/lib/talon/firebase';
import { useAuthVPJS } from '@/contexts/AuthContextVPJS';

// Interface para localização do animal
export interface AnimalLocationVPJS {
  latitudeVPJS: number;
  longitudeVPJS: number;
  timestampVPJS: number;
}

// Interface para ponto do histórico
export interface HistoryPointVPJS {
  latitude: number;
  longitude: number;
  timestamp: number;
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
  loadAnimalHistory: (codigo: string, maxPoints?: number) => Promise<HistoryPointVPJS[]>;
}

const AnimalsContextVPJS = createContext<AnimalsContextTypeVPJS | undefined>(undefined);

// Função para sincronizar animal com Prisma (para sistema de alertas)
async function syncAnimalWithPrisma(firebaseUid: string, animalCode: string, animalName?: string) {
  try {
    await fetch('/api/animals/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firebaseUid, animalCode, animalName }),
    });
    console.log(`🔥 Animal ${animalCode} sincronizado com Prisma`);
  } catch (error) {
    console.error('Erro ao sincronizar animal com Prisma:', error);
  }
}

// Função para remover animal do Prisma
async function removeAnimalFromPrisma(firebaseUid: string, animalCode: string) {
  try {
    await fetch('/api/animals/sync', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firebaseUid, animalCode }),
    });
    console.log(`🔥 Animal ${animalCode} removido do Prisma`);
  } catch (error) {
    console.error('Erro ao remover animal do Prisma:', error);
  }
}

// Local storage key for tracked animal codes (só os códigos, dados ficam no Firebase)
const LOCAL_TRACKED_ANIMALS_KEY = 'talon_tracked_animals_codes_vpjs';

// Manter histórico de 7 dias (em ms)
const HISTORY_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

// Máximo de pontos por animal
const MAX_HISTORY_POINTS = 500;

// Distância mínima em metros para salvar novo ponto (evitar pontos muito próximos)
const MIN_DISTANCE_METERS = 10;

// Calcular distância entre dois pontos em metros (fórmula de Haversine)
function getDistanceInMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Raio da Terra em metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function AnimalsProviderVPJS({ children }: { children: React.ReactNode }) {
  const { userVPJS } = useAuthVPJS();
  const [trackedAnimals, setTrackedAnimals] = useState<TrackedAnimalVPJS[]>([]);
  const [animalCodes, setAnimalCodes] = useState<string[]>([]);
  const prevLocationsRef = useRef<{ [codigo: string]: { lat: number; lng: number; timestamp: number } }>({});

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

        // Sincronizar TODOS os animais com Prisma ao carregar
        // (necessário para o sistema de alertas funcionar no backend)
        codes.forEach(codigo => {
          syncAnimalWithPrisma(userVPJS.uidVPJS, codigo);
        });
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

  // Função para salvar no histórico
  const saveToHistory = useCallback(async (codigo: string, lat: number, lng: number, timestamp: number) => {
    if (!isFirebaseConfigured || !database) return;
    
    try {
      const allHistoryRef = ref(database, `animaisVPJS/${codigo}/historicoVPJS`);
      const snapshot = await get(allHistoryRef);
      
      // Verificar distância mínima do último ponto
      if (snapshot.exists()) {
        const data = snapshot.val();
        const points = Object.entries(data).map(([key, value]: [string, any]) => ({
          key,
          ...value,
        }));
        
        // Ordenar por timestamp e pegar o mais recente
        points.sort((a, b) => b.timestamp - a.timestamp);
        
        if (points.length > 0) {
          const lastPoint = points[0];
          const distance = getDistanceInMeters(lat, lng, lastPoint.latitude, lastPoint.longitude);
          
          if (distance < MIN_DISTANCE_METERS) {
            console.log(`🔥 Pulando histórico para ${codigo}: distância muito pequena (${distance.toFixed(1)}m)`);
            return;
          }
        }
        
        // Limpar pontos antigos (mais de 7 dias) e excesso de pontos
        const cutoffTime = Date.now() - HISTORY_RETENTION_MS;
        const deletePromises: Promise<void>[] = [];
        
        // Filtrar pontos válidos
        const validPoints = points.filter(p => p.timestamp >= cutoffTime);
        
        // Se ainda tem muitos pontos, remover os mais antigos
        if (validPoints.length >= MAX_HISTORY_POINTS) {
          const pointsToRemove = validPoints.slice(MAX_HISTORY_POINTS - 1);
          pointsToRemove.forEach(p => {
            const oldRef = ref(database!, `animaisVPJS/${codigo}/historicoVPJS/${p.key}`);
            deletePromises.push(set(oldRef, null));
          });
          console.log(`🔥 Removendo ${pointsToRemove.length} pontos excedentes de ${codigo}`);
        }
        
        // Remover pontos muito antigos
        points.forEach(p => {
          if (p.timestamp < cutoffTime) {

            const oldRef = ref(database!, `animaisVPJS/${codigo}/historicoVPJS/${p.key}`);
            deletePromises.push(set(oldRef, null));
          }
        });
        
        if (deletePromises.length > 0) {
          await Promise.all(deletePromises);
        }
      }
      
      // Salvar novo ponto no histórico
      const historyRef = ref(database, `animaisVPJS/${codigo}/historicoVPJS`);
      const newPointRef = push(historyRef);
      await set(newPointRef, {
        latitude: lat,
        longitude: lng,
        timestamp: timestamp,
      });
      console.log(`🔥 Histórico salvo para ${codigo}:`, { lat, lng, timestamp });
      
    } catch (error) {
      console.error('Erro ao salvar histórico:', error);
    }
  }, []);

  // Debounced alert check - evita múltiplas chamadas quando vários animais se movem ao mesmo tempo
  const alertCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAlertCheckRef = useRef<number>(0);
  const ALERT_CHECK_COOLDOWN = 10_000; // 10 segundos entre verificações

  const triggerAlertCheck = useCallback(() => {
    const now = Date.now();
    // Respeitar cooldown mínimo entre verificações
    if (now - lastAlertCheckRef.current < ALERT_CHECK_COOLDOWN) return;

    if (alertCheckTimeoutRef.current) {
      clearTimeout(alertCheckTimeoutRef.current);
    }

    alertCheckTimeoutRef.current = setTimeout(async () => {
      try {
        lastAlertCheckRef.current = Date.now();
        const response = await fetch('/api/alerts/check', { method: 'POST' });
        const result = await response.json();
        if (result.eventsDetected > 0) {
          console.log('🚨 Alertas detectados em tempo real:', result.events);
        }
      } catch (error) {
        console.error('Erro na verificação automática de alertas:', error);
      }
    }, 3000); // Aguarda 3s para acumular mudanças de múltiplos animais
  }, []);

  // Configurar listeners do Firebase para cada animal (localização + foto + nome)
  useEffect(() => {
    if (!isFirebaseConfigured || !database || animalCodes.length === 0) return;

    const listeners: { [codigo: string]: () => void } = {};

    animalCodes.forEach((codigo) => {
      const animalRef = ref(database!, `animaisVPJS/${codigo}`);
      
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
            
            // Verificar se a localização mudou para salvar no histórico
            const prevLoc = prevLocationsRef.current[codigo];
            const locationChanged = !prevLoc || 
              prevLoc.lat !== location.latitudeVPJS || 
              prevLoc.lng !== location.longitudeVPJS;
            
            if (locationChanged) {
              // Salvar no histórico
              saveToHistory(codigo, location.latitudeVPJS, location.longitudeVPJS, location.timestampVPJS);
              
              // Atualizar posição anterior
              prevLocationsRef.current[codigo] = {
                lat: location.latitudeVPJS,
                lng: location.longitudeVPJS,
                timestamp: location.timestampVPJS,
              };

              // Verificar alertas de geofencing quando a posição mudar (debounced)
              triggerAlertCheck();
            }
            
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
      if (alertCheckTimeoutRef.current) {
        clearTimeout(alertCheckTimeoutRef.current);
      }
    };
  }, [animalCodes.join(','), saveToHistory]);

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
    
    // Sincronizar com Prisma (para sistema de alertas)
    if (userVPJS?.uidVPJS) {
      syncAnimalWithPrisma(userVPJS.uidVPJS, codigoTrimmed, nome);
    }
  }, [animalCodes, userVPJS]);

  const removeAnimal = useCallback(async (codigo: string) => {
    setAnimalCodes(prev => prev.filter(c => c !== codigo));
    setTrackedAnimals(prev => prev.filter(a => a.codigoVPJS !== codigo));
    
    // Remover do Prisma
    if (userVPJS?.uidVPJS) {
      removeAnimalFromPrisma(userVPJS.uidVPJS, codigo);
    }
  }, [userVPJS]);

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

  // Carregar histórico do animal
  const loadAnimalHistory = useCallback(async (codigo: string, maxPoints: number = 1000): Promise<HistoryPointVPJS[]> => {
    console.log(`🔥 loadAnimalHistory chamado para: ${codigo}`);
    
    if (!isFirebaseConfigured || !database) {
      console.log(`🔥 Firebase não configurado`);
      return [];
    }

    try {
      const historyRef = ref(database, `animaisVPJS/${codigo}/historicoVPJS`);
      console.log(`🔥 Buscando em: animaisVPJS/${codigo}/historicoVPJS`);
      
      const historyQuery = query(historyRef, orderByKey(), limitToLast(maxPoints));
      const snapshot = await get(historyQuery);
      
      console.log(`🔥 Snapshot existe: ${snapshot.exists()}`);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log(`🔥 Dados brutos:`, data);
        
        const points: HistoryPointVPJS[] = [];
        
        Object.keys(data).forEach((key) => {
          const point = data[key];
          console.log(`🔥 Ponto ${key}:`, point);
          if (point && typeof point.latitude === 'number' && typeof point.longitude === 'number') {
            points.push({
              latitude: point.latitude,
              longitude: point.longitude,
              timestamp: point.timestamp || 0,
            });
          }
        });
        
        // Ordenar por timestamp
        points.sort((a, b) => a.timestamp - b.timestamp);
        console.log(`🔥 Histórico carregado para ${codigo}: ${points.length} pontos`);
        return points;
      }
      
      console.log(`🔥 Nenhum snapshot encontrado`);
      return [];
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      return [];
    }
  }, []);

  const value = useMemo(() => ({
    trackedAnimals,
    addAnimal,
    removeAnimal,
    updateAnimal,
    getAnimalByCode,
    isTracking,
    loadAnimalHistory,
  }), [trackedAnimals, addAnimal, removeAnimal, updateAnimal, getAnimalByCode, isTracking, loadAnimalHistory]);

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
