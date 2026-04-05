"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { isPointInPolygon } from "geolib";
import { useAuthVPJS } from "@/contexts/AuthContextVPJS";
import { useAnimalsVPJS, TrackedAnimalVPJS } from "@/contexts/AnimalsContextVPJS";
import { LoginPageVPJS } from "@/components/LoginPageVPJS";
import { Point, LocalPolygon, POLYGON_COLORS } from "@/lib/types";

// Import MapView dynamically to avoid SSR issues with Leaflet
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="map-wrapper flex items-center justify-center bg-muted">
      <div className="flex flex-col items-center gap-4">
        <img src="/logo-icon.png" alt="TALON" className="w-12 h-12 animate-pulse" />
        <p className="text-muted-foreground text-sm">Carregando mapa...</p>
      </div>
    </div>
  ),
});

// Import AnimalHistoryDialog dynamically to avoid SSR issues with Leaflet
const AnimalHistoryDialog = dynamic(() => import("@/components/AnimalHistoryDialog").then(mod => ({ default: mod.AnimalHistoryDialog })), {
  ssr: false,
});



// Timer options
const timerOptions = [
  { label: "15s", seconds: 15 },
  { label: "30s", seconds: 30 },
  { label: "1min", seconds: 60 },
  { label: "3min", seconds: 180 },
  { label: "15min", seconds: 900 },
  { label: "30min", seconds: 1800 },
  { label: "1h", seconds: 3600 },
  { label: "2h", seconds: 7200 },
  { label: "10h", seconds: 36000 },
];

export default function Home() {
  const { userVPJS, loadingVPJS, signOutVPJS, savePolygonsVPJS, polygonsVPJS, saveTimerVPJS, timerVPJS } = useAuthVPJS();
  const { trackedAnimals, addAnimal, removeAnimal, updateAnimal, isTracking } = useAnimalsVPJS();
  
  // Estado local dos polígonos
  const [polygons, setPolygons] = useState<LocalPolygon[]>([]);
  const [selectedPolygonId, setSelectedPolygonId] = useState<string | null>(null);
  
  const [userPosition, setUserPosition] = useState<Point | null>(null);
  const [checkResult, setCheckResult] = useState<"inside" | "outside" | null>(null);
  
  // Flag para controlar quando podemos salvar
  const isInitializedRef = useRef(false);
  const lastPolygonsJsonRef = useRef<string>("");
  const isLocalChangeRef = useRef(false); // Flag para mudanças locais

  // Carregar polígonos do Firebase (apenas uma vez na inicialização)
  useEffect(() => {
    if (polygonsVPJS !== null && !isInitializedRef.current) {
      const polygonsJson = JSON.stringify(polygonsVPJS);
      
      if (polygonsJson !== lastPolygonsJsonRef.current) {
        lastPolygonsJsonRef.current = polygonsJson;
        
        if (polygonsVPJS.length > 0) {
          const loadedPolygons: LocalPolygon[] = polygonsVPJS.map((p) => ({
            id: p.idVPJS,
            nome: p.nomeVPJS,
            cor: p.corVPJS,
            vertices: p.verticesVPJS.map((v) => ({
              latitude: v.latitudeVPJS,
              longitude: v.longitudeVPJS,
            })),
          }));
          console.log('🔥 Carregando polígonos do Firebase:', loadedPolygons.length);
          queueMicrotask(() => {
            setPolygons(loadedPolygons);
            // Selecionar o primeiro polígono se houver
            if (loadedPolygons.length > 0) {
              setSelectedPolygonId(loadedPolygons[0].id);
            }
          });
        } else {
          console.log('🔥 Nenhum polígono salvo no Firebase');
          queueMicrotask(() => {
            setPolygons([]);
            setSelectedPolygonId(null);
          });
        }
      }
      
      const timer = setTimeout(() => {
        isInitializedRef.current = true;
        console.log('🔥 Inicialização completa');
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [polygonsVPJS]);

  // Salvar polígonos no Firebase
  useEffect(() => {
    if (!userVPJS || !isInitializedRef.current) return;

    const timeoutId = setTimeout(async () => {
      try {
        const firebasePolygons = polygons.map((p) => ({
          idVPJS: p.id,
          nomeVPJS: p.nome,
          corVPJS: p.cor,
          verticesVPJS: p.vertices.map((v) => ({
            latitudeVPJS: v.latitude,
            longitudeVPJS: v.longitude,
          })),
          createdAtVPJS: Date.now(),
        }));
        const newJson = JSON.stringify(firebasePolygons);
        
        if (newJson !== lastPolygonsJsonRef.current) {
          lastPolygonsJsonRef.current = newJson;
          isLocalChangeRef.current = true; // Marcar como mudança local
          console.log('🔥 Salvando polígonos no Firebase:', polygons.length);
          await savePolygonsVPJS(firebasePolygons);
          console.log('🔥 Polígonos salvos!');
          // Resetar flag após um pequeno delay
          setTimeout(() => {
            isLocalChangeRef.current = false;
          }, 500);
        }
      } catch (error) {
        console.error('🔥 Erro ao salvar polígonos:', error);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [polygons, userVPJS, savePolygonsVPJS]);

  // Dialogs
  const [timerDialogOpen, setTimerDialogOpen] = useState(false);
  const [animalsDialogOpen, setAnimalsDialogOpen] = useState(false);
  const [howToUseDialogOpen, setHowToUseDialogOpen] = useState(false);
  const [newPolygonDialogOpen, setNewPolygonDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deletePolygonsDialogOpen, setDeletePolygonsDialogOpen] = useState(false);
  
  // Delete polygons state
  const [selectedPolygonIds, setSelectedPolygonIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [animalCode, setAnimalCode] = useState("");
  const [animalName, setAnimalName] = useState("");
  const [animalFoto, setAnimalFoto] = useState<string>("");
  const [animalError, setAnimalError] = useState<string | null>(null);
  const [animalSuccess, setAnimalSuccess] = useState<string | null>(null);
  
  // Edit animal state
  const [editAnimalDialogOpen, setEditAnimalDialogOpen] = useState(false);
  const [editAnimalCodigo, setEditAnimalCodigo] = useState<string>("");
  const [editAnimalNome, setEditAnimalNome] = useState<string>("");
  const [editAnimalFoto, setEditAnimalFoto] = useState<string>("");
  
  // History dialog state
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyAnimal, setHistoryAnimal] = useState<TrackedAnimalVPJS | null>(null);
  
  const [newPolygonName, setNewPolygonName] = useState("");
  const [renameValue, setRenameValue] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);
  const pendingCheckRef = useRef(false);
  const lastCheckTimeRef = useRef<number>(0);
  
  // Primeiro ponto temporário (para criar primeiro polígono)
  const [pendingFirstPoint, setPendingFirstPoint] = useState<Point | null>(null);

  // History for undo
  const historyRef = useRef<{ polygons: LocalPolygon[] }[]>([]);
  const historyIndexRef = useRef<number>(-1);

  // Timer sync
  useEffect(() => {
    if (!timerVPJS || !timerVPJS.isActiveVPJS) {
      queueMicrotask(() => setTimeRemaining(0));
      return;
    }

    const calculateRemaining = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - timerVPJS.startedAtVPJS) / 1000);
      const remaining = timerVPJS.durationVPJS - (elapsed % timerVPJS.durationVPJS);
      return remaining > 0 ? remaining : timerVPJS.durationVPJS;
    };

    queueMicrotask(() => setTimeRemaining(calculateRemaining()));

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - timerVPJS.startedAtVPJS) / 1000);
      const remaining = timerVPJS.durationVPJS - (elapsed % timerVPJS.durationVPJS);
      
      setTimeRemaining(remaining);
      
      if (remaining === timerVPJS.durationVPJS && now - lastCheckTimeRef.current >= timerVPJS.durationVPJS * 1000 - 500) {
        lastCheckTimeRef.current = now;
        console.log('🔥 Timer completou! Atualizando localização...');
        setRefreshKey(k => k + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timerVPJS]);

  const startTimer = useCallback(async (seconds: number) => {
    if (!userVPJS) return;
    try {
      await saveTimerVPJS({
        isActiveVPJS: true,
        durationVPJS: seconds,
        startedAtVPJS: Date.now(),
      });
      lastCheckTimeRef.current = Date.now();
    } catch (error) {
      console.error('🔥 Erro ao iniciar timer:', error);
    }
  }, [userVPJS, saveTimerVPJS]);

  const stopTimer = useCallback(async () => {
    if (!userVPJS) return;
    try {
      await saveTimerVPJS(null);
      setTimeRemaining(0);
    } catch (error) {
      console.error('🔥 Erro ao parar timer:', error);
    }
  }, [userVPJS, saveTimerVPJS]);

  // Save to history
  const saveToHistory = useCallback((currentPolygons: LocalPolygon[]) => {
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push({ polygons: JSON.parse(JSON.stringify(currentPolygons)) });
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
  }, []);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const previousState = historyRef.current[historyIndexRef.current];
      setPolygons(previousState.polygons);
      setCheckResult(null);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo]);

  // Add point to selected polygon
  const handleAddPoint = useCallback((point: Point) => {
    // Se não há nenhum polígono, abrir diálogo para nomear o primeiro
    if (polygons.length === 0) {
      setPendingFirstPoint(point);
      setNewPolygonDialogOpen(true);
      return;
    }
    
    if (!selectedPolygonId) {
      // Se não há polígono selecionado mas existem polígonos, selecionar o primeiro
      if (polygons.length > 0) {
        setSelectedPolygonId(polygons[0].id);
      }
      return;
    }
    
    setPolygons((prev) => {
      const newPolygons = prev.map((p) => {
        if (p.id === selectedPolygonId) {
          return { ...p, vertices: [...p.vertices, point] };
        }
        return p;
      });
      saveToHistory(newPolygons);
      return newPolygons;
    });
    setCheckResult(null);
  }, [selectedPolygonId, polygons, saveToHistory]);

  // Update point in selected polygon
  const handleUpdatePoint = useCallback((index: number, point: Point) => {
    if (!selectedPolygonId) return;
    
    setPolygons((prev) => {
      const newPolygons = prev.map((p) => {
        if (p.id === selectedPolygonId) {
          const newVertices = [...p.vertices];
          newVertices[index] = point;
          return { ...p, vertices: newVertices };
        }
        return p;
      });
      saveToHistory(newPolygons);
      setCheckResult(null);
      return newPolygons;
    });
  }, [selectedPolygonId, saveToHistory]);

  // User position change - usar ref para polygons para evitar recriações
  const polygonsRef = useRef(polygons);
  
  useEffect(() => {
    polygonsRef.current = polygons;
  }, [polygons]);
  
  const handleUserPositionChange = useCallback((point: Point) => {
    setUserPosition(point);
    
    if (pendingCheckRef.current) {
      pendingCheckRef.current = false;
      // Check against all polygons
      const anyInside = polygonsRef.current.some(p => 
        p.vertices.length >= 3 && isPointInPolygon(point, p.vertices)
      );
      setCheckResult(anyInside ? "inside" : "outside");
    }
  }, []);

  const handleCheckPosition = useCallback(() => {
    if (!userPosition) return;
    
    // Check against all polygons
    const anyInside = polygons.some(p => 
      p.vertices.length >= 3 && isPointInPolygon(userPosition, p.vertices)
    );
    setCheckResult(anyInside ? "inside" : "outside");
  }, [userPosition, polygons]);

  // Clear selected polygon
  const handleClearPoints = useCallback(() => {
    if (!selectedPolygonId) return;
    
    setPolygons((prev) => {
      const newPolygons = prev.map((p) => {
        if (p.id === selectedPolygonId) {
          return { ...p, vertices: [] };
        }
        return p;
      });
      saveToHistory(newPolygons);
      return newPolygons;
    });
    setCheckResult(null);
  }, [selectedPolygonId, saveToHistory]);

  // Create new polygon
  const handleCreatePolygon = useCallback(() => {
    if (!newPolygonName.trim()) return;
    
    const newId = `polygon_${Date.now()}`;
    const newPolygon: LocalPolygon = {
      id: newId,
      nome: newPolygonName.trim(),
      cor: POLYGON_COLORS[polygons.length % POLYGON_COLORS.length].cor,
      vertices: pendingFirstPoint ? [pendingFirstPoint] : [],
    };
    
    const newPolygons = [...polygons, newPolygon];
    setPolygons(newPolygons);
    setSelectedPolygonId(newId);
    saveToHistory(newPolygons);
    setNewPolygonName("");
    setNewPolygonDialogOpen(false);
    setPendingFirstPoint(null);
  }, [newPolygonName, polygons, saveToHistory, pendingFirstPoint]);

  // Delete polygon
  const handleDeletePolygon = useCallback((id: string) => {
    setPolygons((prev) => {
      const newPolygons = prev.filter(p => p.id !== id);
      saveToHistory(newPolygons);
      
      // Selecionar outro polígono se o deletado estava selecionado
      if (selectedPolygonId === id) {
        setSelectedPolygonId(newPolygons.length > 0 ? newPolygons[0].id : null);
      }
      
      return newPolygons;
    });
  }, [selectedPolygonId, saveToHistory]);

  // Rename polygon
  const handleRenamePolygon = useCallback(() => {
    if (!selectedPolygonId || !renameValue.trim()) return;
    
    setPolygons((prev) => {
      const newPolygons = prev.map((p) => {
        if (p.id === selectedPolygonId) {
          return { ...p, nome: renameValue.trim() };
        }
        return p;
      });
      saveToHistory(newPolygons);
      return newPolygons;
    });
    setRenameValue("");
    setRenameDialogOpen(false);
  }, [selectedPolygonId, renameValue, saveToHistory]);

  // Select polygon
  const handleSelectPolygon = useCallback((id: string) => {
    setSelectedPolygonId(id);
    setCheckResult(null);
  }, []);

  // Toggle polygon selection for deletion
  const togglePolygonSelection = useCallback((id: string) => {
    setSelectedPolygonIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Delete multiple polygons
  const handleDeleteMultiplePolygons = useCallback(() => {
    if (!confirmDelete || selectedPolygonIds.size === 0) return;
    
    setPolygons((prev) => {
      const newPolygons = prev.filter(p => !selectedPolygonIds.has(p.id));
      saveToHistory(newPolygons);
      
      // Se o polígono selecionado foi deletado, selecionar outro
      if (selectedPolygonIds.has(selectedPolygonId || '')) {
        const remaining = newPolygons;
        setSelectedPolygonId(remaining.length > 0 ? remaining[0].id : null);
      }
      
      return newPolygons;
    });
    
    // Reset states
    setSelectedPolygonIds(new Set());
    setConfirmDelete(false);
    setDeletePolygonsDialogOpen(false);
    setCheckResult(null);
  }, [selectedPolygonIds, confirmDelete, selectedPolygonId, saveToHistory]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Auto-hide check result
  useEffect(() => {
    if (checkResult) {
      const timer = setTimeout(() => setCheckResult(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [checkResult]);

  // Reset on logout
  useEffect(() => {
    if (!userVPJS) {
      isInitializedRef.current = false;
      lastPolygonsJsonRef.current = "";
      queueMicrotask(() => {
        setPolygons([]);
        setSelectedPolygonId(null);
      });
    }
  }, [userVPJS]);

  const handleLogoutVPJS = async () => {
    try {
      await signOutVPJS();
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  if (loadingVPJS) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo-icon.png" alt="TALON" className="w-16 h-16 animate-pulse" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!userVPJS) {
    return <LoginPageVPJS />;
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="z-1001 bg-background/95 backdrop-blur-sm border-b border-border shrink-0 h-14 sticky top-0">
        <div className="px-4 py-2 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" x2="20" y1="12" y2="12" />
                    <line x1="4" x2="20" y1="6" y2="6" />
                    <line x1="4" x2="20" y1="18" y2="18" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setTimerDialogOpen(true)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Temporizador
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAnimalsDialogOpen(true)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M12 2a3 3 0 0 0-3 3c0 1.6.8 2.4 1.5 3.5C11.3 9.6 12 10.8 12 12c0-1.2.7-2.4 1.5-3.5C14.2 7.4 15 6.6 15 5a3 3 0 0 0-3-3Z" />
                    <path d="M12 12c0 1.2-.7 2.4-1.5 3.5-.7 1.1-1.5 1.9-1.5 3.5a3 3 0 0 0 6 0c0-1.6-.8-2.4-1.5-3.5-.8-1.1-1.5-2.3-1.5-3.5Z" />
                  </svg>
                  Animais
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setHowToUseDialogOpen(true)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <path d="M12 17h.01" />
                  </svg>
                  Como usar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    setSelectedPolygonIds(new Set());
                    setConfirmDelete(false);
                    setDeletePolygonsDialogOpen(true);
                  }}
                  disabled={polygons.length === 0}
                  className="text-red-500 focus:text-red-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                  Deletar Polígonos
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogoutVPJS} className="text-red-500 focus:text-red-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" x2="9" y1="12" y2="12" />
                  </svg>
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
              <img src="/logo-icon.png" alt="TALON" className="w-full h-full object-contain p-1" />
            </div>
            <div>
              <h1 className="text-base font-bold">TALON</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">{userVPJS.nomeVPJS}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {userPosition && (
              <Badge variant="outline" className="hidden sm:flex">
                <span className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse" />
                GPS
              </Badge>
            )}
            {timerVPJS?.isActiveVPJS && (
              <Badge variant="outline" className="hidden sm:flex bg-primary/10">
                <span className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse" />
                {formatTime(timeRemaining)}
              </Badge>
            )}
            {trackedAnimals.length > 0 && (
              <Badge variant="outline" className="hidden sm:flex bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <path d="M12 2a3 3 0 0 0-3 3c0 1.6.8 2.4 1.5 3.5C11.3 9.6 12 10.8 12 12c0-1.2.7-2.4 1.5-3.5C14.2 7.4 15 6.6 15 5a3 3 0 0 0-3-3Z" />
                  <path d="M12 12c0 1.2-.7 2.4-1.5 3.5-.7 1.1-1.5 1.9-1.5 3.5a3 3 0 0 0 6 0c0-1.6-.8-2.4-1.5-3.5-.8-1.1-1.5-2.3-1.5-3.5Z" />
                </svg>
                {trackedAnimals.length} animal{trackedAnimals.length !== 1 ? 's' : ''}
              </Badge>
            )}
            <Badge variant="secondary">{polygons.length} polígono{polygons.length !== 1 ? 's' : ''}</Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex" onClick={handleLogoutVPJS} title="Sair">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
            </Button>
          </div>
        </div>
      </header>

      {/* Map Container */}
      <div className="flex-1 relative overflow-hidden">
        <MapView
          allPolygons={polygons}
          selectedPolygonId={selectedPolygonId}
          onAddPoint={handleAddPoint}
          onUpdatePoint={handleUpdatePoint}
          userPosition={userPosition}
          onUserPositionChange={handleUserPositionChange}
          onCheckPosition={handleCheckPosition}
          onClearPoints={handleClearPoints}
          checkResult={checkResult}
          refreshKey={refreshKey}
          onCreatePolygon={() => setNewPolygonDialogOpen(true)}
          onSelectPolygon={handleSelectPolygon}
          onDeletePolygon={handleDeletePolygon}
          onRenamePolygon={() => {
            const p = polygons.find(x => x.id === selectedPolygonId);
            if (p) {
              setRenameValue(p.nome);
              setRenameDialogOpen(true);
            }
          }}
          trackedAnimals={trackedAnimals}
        />
      </div>

      {/* New Polygon Dialog */}
      <Dialog open={newPolygonDialogOpen} onOpenChange={(open) => {
        setNewPolygonDialogOpen(open);
        if (!open) {
          setPendingFirstPoint(null);
          setNewPolygonName("");
        }
      }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{polygons.length === 0 ? 'Primeiro Polígono' : 'Novo Polígono'}</DialogTitle>
            <DialogDescription>
              {polygons.length === 0 
                ? 'Dê um nome para sua primeira área de geofencing'
                : 'Dê um nome para o novo polígono'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nome do polígono..."
              value={newPolygonName}
              onChange={(e) => setNewPolygonName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreatePolygon()}
              autoFocus
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => {
                setNewPolygonDialogOpen(false);
                setPendingFirstPoint(null);
              }}>Cancelar</Button>
              <Button className="flex-1" onClick={handleCreatePolygon}>Criar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Renomear Polígono</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Novo nome..."
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRenamePolygon()}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRenameDialogOpen(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleRenamePolygon}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Timer Dialog */}
      <Dialog open={timerDialogOpen} onOpenChange={setTimerDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Temporizador</DialogTitle>
            <DialogDescription>Selecione um tempo para o temporizador em loop</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {timerVPJS?.isActiveVPJS ? (
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-4xl font-mono font-bold text-primary">{formatTime(timeRemaining)}</div>
                <p className="text-sm text-muted-foreground mt-1">Loop a cada {timerOptions.find(t => t.seconds === timerVPJS.durationVPJS)?.label}</p>
                <Button variant="destructive" size="sm" className="mt-3" onClick={stopTimer}>Parar</Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {timerOptions.map((option) => (
                  <Button key={option.seconds} variant="outline" onClick={() => startTimer(option.seconds)} className="h-14 flex flex-col">
                    <span className="text-lg font-bold">{option.label}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Animals Dialog */}
      <Dialog open={animalsDialogOpen} onOpenChange={(open) => {
        setAnimalsDialogOpen(open);
        if (!open) {
          setAnimalCode("");
          setAnimalName("");
          setAnimalFoto("");
          setAnimalError(null);
          setAnimalSuccess(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Animais</DialogTitle>
            <DialogDescription>Adicione animais para rastrear no mapa</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Formulário para adicionar animal */}
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg border border-border">
              <div className="space-y-2">
                <label className="text-sm font-medium">Código do Animal</label>
                <Input 
                  placeholder="Ex: ANIMAL001" 
                  value={animalCode} 
                  onChange={(e) => {
                    setAnimalCode(e.target.value);
                    setAnimalError(null);
                  }} 
                  className="text-center" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome (opcional)</label>
                <Input 
                  placeholder="Ex: Bessy" 
                  value={animalName} 
                  onChange={(e) => setAnimalName(e.target.value)} 
                  className="text-center" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Foto (opcional)</label>
                <div className="flex items-center gap-3">
                  {animalFoto ? (
                    <div className="relative">
                      <img src={animalFoto} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-primary" />
                      <button
                        onClick={() => setAnimalFoto("")}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="w-16 h-16 rounded-full bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:bg-muted/80 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                          <circle cx="9" cy="9" r="2" />
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setAnimalFoto(ev.target?.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  )}
                  <span className="text-xs text-muted-foreground">Clique para adicionar foto</span>
                </div>
              </div>
              
              {/* Mensagens de erro/sucesso */}
              {animalError && (
                <p className="text-sm text-red-500 text-center">{animalError}</p>
              )}
              {animalSuccess && (
                <p className="text-sm text-green-600 text-center">{animalSuccess}</p>
              )}
              
              <Button 
                className="w-full" 
                onClick={async () => {
                  if (!animalCode.trim()) {
                    setAnimalError("Digite o código do animal");
                    return;
                  }
                  
                  if (isTracking(animalCode.trim())) {
                    setAnimalError("Este animal já está sendo rastreado");
                    return;
                  }
                  
                  try {
                    await addAnimal(animalCode.trim(), animalName.trim() || undefined, animalFoto || undefined);
                    setAnimalSuccess(`Animal ${animalCode.trim()} adicionado!`);
                    setAnimalCode("");
                    setAnimalName("");
                    setAnimalFoto("");
                    setTimeout(() => setAnimalSuccess(null), 3000);
                  } catch (error) {
                    if (error instanceof Error) {
                      setAnimalError(error.message);
                    } else {
                      setAnimalError("Erro ao adicionar animal");
                    }
                  }
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <line x1="12" x2="12" y1="5" y2="19" />
                  <line x1="5" x2="19" y1="12" y2="12" />
                </svg>
                Adicionar Animal
              </Button>
            </div>
            
            {/* Lista de animais rastreados */}
            {trackedAnimals.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Animais Rastreados</label>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {trackedAnimals.map((animal) => (
                    <div 
                      key={animal.codigoVPJS}
                      className="flex items-center justify-between p-3 bg-card rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3">
                        {animal.fotoVPJS ? (
                          <img src={animal.fotoVPJS} alt={animal.nomeVPJS} className="w-10 h-10 rounded-full object-cover border-2 border-orange-400" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 2a3 3 0 0 0-3 3c0 1.6.8 2.4 1.5 3.5C11.3 9.6 12 10.8 12 12c0-1.2.7-2.4 1.5-3.5C14.2 7.4 15 6.6 15 5a3 3 0 0 0-3-3Z" />
                              <path d="M12 12c0 1.2-.7 2.4-1.5 3.5-.7 1.1-1.5 1.9-1.5 3.5a3 3 0 0 0 6 0c0-1.6-.8-2.4-1.5-3.5-.8-1.1-1.5-2.3-1.5-3.5Z" />
                            </svg>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">{animal.nomeVPJS}</p>
                          <p className="text-xs text-muted-foreground">{animal.codigoVPJS}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {animal.loading && (
                          <span className="text-xs text-muted-foreground mr-2">Carregando...</span>
                        )}
                        {animal.error && (
                          <span className="text-xs text-red-500 mr-2">{animal.error}</span>
                        )}
                        {animal.location && (
                          <div className="flex flex-col items-end mr-2">
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                              Online
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(animal.location.timestampVPJS).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => {
                            setHistoryAnimal(animal);
                            setHistoryDialogOpen(true);
                          }}
                          title="Ver histórico"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => {
                            setEditAnimalCodigo(animal.codigoVPJS);
                            setEditAnimalNome(animal.nomeVPJS);
                            setEditAnimalFoto(animal.fotoVPJS || "");
                            setEditAnimalDialogOpen(true);
                          }}
                          title="Editar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                          </svg>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => removeAnimal(animal.codigoVPJS)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" x2="6" y1="6" y2="18" />
                            <line x1="6" x2="18" y1="6" y2="18" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {trackedAnimals.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum animal sendo rastreado. Adicione um animal pelo código.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Animal Dialog */}
      <Dialog open={editAnimalDialogOpen} onOpenChange={setEditAnimalDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Animal</DialogTitle>
            <DialogDescription>Altere o nome e a foto do animal</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Código</label>
              <Input value={editAnimalCodigo} disabled className="bg-muted text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <Input 
                placeholder="Nome do animal" 
                value={editAnimalNome} 
                onChange={(e) => setEditAnimalNome(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Foto</label>
              <div className="flex items-center gap-3">
                {editAnimalFoto ? (
                  <div className="relative">
                    <img src={editAnimalFoto} alt="Preview" className="w-20 h-20 rounded-full object-cover border-2 border-primary" />
                    <button
                      onClick={() => setEditAnimalFoto("")}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <div className="w-20 h-20 rounded-full bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:bg-muted/80 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                      </svg>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setEditAnimalFoto(ev.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
                <span className="text-xs text-muted-foreground">Clique para {editAnimalFoto ? 'trocar' : 'adicionar'} foto</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditAnimalDialogOpen(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={() => {
                updateAnimal(editAnimalCodigo, {
                  nomeVPJS: editAnimalNome.trim() || `Animal ${editAnimalCodigo}`,
                  fotoVPJS: editAnimalFoto || undefined,
                });
                setEditAnimalDialogOpen(false);
              }}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* How to Use Dialog */}
      <Dialog open={howToUseDialogOpen} onOpenChange={setHowToUseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Como usar</DialogTitle>
            <DialogDescription>Crie múltiplas áreas de geofencing</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#585c2b] flex items-center justify-center text-white text-xs font-bold shrink-0">1</div>
              <p className="text-sm text-muted-foreground">Clique no mapa para criar seu primeiro polígono e dê um nome a ele</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#6b7336] flex items-center justify-center text-white text-xs font-bold shrink-0">2</div>
              <p className="text-sm text-muted-foreground">Continue clicando no mapa para adicionar pontos ao polígono selecionado</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#7a8044] flex items-center justify-center text-white text-xs font-bold shrink-0">3</div>
              <p className="text-sm text-muted-foreground">Use os botões coloridos à direita para selecionar qual polígono editar</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#4a4e24] flex items-center justify-center text-white text-xs font-bold shrink-0">4</div>
              <p className="text-sm text-muted-foreground">Todos os polígonos são exibidos no mapa. Áreas sobrepostas têm cores misturadas</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#3d401e] flex items-center justify-center text-white text-xs font-bold shrink-0">5</div>
              <p className="text-sm text-muted-foreground">Clique em "Verificar" para saber se está dentro de qualquer área</p>
            </div>
            <div className="pt-3 border-t border-border space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Atalhos:</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-xs bg-muted px-2 py-1 rounded">Ctrl+Z</span>
                Desfazer última ação
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Polygons Dialog */}
      <Dialog open={deletePolygonsDialogOpen} onOpenChange={(open) => {
        setDeletePolygonsDialogOpen(open);
        if (!open) {
          setSelectedPolygonIds(new Set());
          setConfirmDelete(false);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-500">Deletar Polígonos</DialogTitle>
            <DialogDescription>
              Selecione os polígonos que deseja deletar. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Lista de polígonos */}
            {polygons.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum polígono para deletar.
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {polygons.map((polygon) => (
                  <div
                    key={polygon.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedPolygonIds.has(polygon.id)
                        ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
                        : 'bg-muted/50 border-border hover:bg-muted'
                    }`}
                    onClick={() => togglePolygonSelection(polygon.id)}
                  >
                    <Checkbox
                      checked={selectedPolygonIds.has(polygon.id)}
                      onCheckedChange={() => togglePolygonSelection(polygon.id)}
                      className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                    />
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: polygon.cor }}
                    />
                    <span className="flex-1 font-medium text-sm truncate">{polygon.nome}</span>
                    <span className="text-xs text-muted-foreground">
                      {polygon.vertices.length} pts
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Selecionar todos / Limpar */}
            {polygons.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    const allIds = new Set(polygons.map(p => p.id));
                    setSelectedPolygonIds(allIds);
                  }}
                >
                  Selecionar todos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setSelectedPolygonIds(new Set())}
                >
                  Limpar seleção
                </Button>
              </div>
            )}

            {/* Confirmação */}
            {selectedPolygonIds.size > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                <Checkbox
                  id="confirm-delete"
                  checked={confirmDelete}
                  onCheckedChange={(checked) => setConfirmDelete(checked as boolean)}
                  className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                />
                <label
                  htmlFor="confirm-delete"
                  className="text-sm font-medium text-red-700 dark:text-red-400 cursor-pointer"
                >
                  Tenho certeza que quero deletar {selectedPolygonIds.size} polígono{selectedPolygonIds.size !== 1 ? 's' : ''}
                </label>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDeletePolygonsDialogOpen(false);
                setSelectedPolygonIds(new Set());
                setConfirmDelete(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={selectedPolygonIds.size === 0 || !confirmDelete}
              onClick={handleDeleteMultiplePolygons}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              Deletar {selectedPolygonIds.size > 0 ? `(${selectedPolygonIds.size})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Animal History Dialog */}
      <AnimalHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        animal={historyAnimal}
      />
    </div>
  );
}
