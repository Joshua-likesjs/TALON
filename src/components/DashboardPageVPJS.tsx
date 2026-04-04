'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useAuthVPJS } from '@/contexts/AuthContextVPJS';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { isPointInPolygon } from 'geolib';
import { Loader2, MapPin, Navigation, Clock, Hexagon, Plus, Send } from 'lucide-react';

// Import MapView dynamically to avoid SSR issues with Leaflet
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="map-wrapper flex items-center justify-center bg-muted">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Carregando mapa...</p>
      </div>
    </div>
  ),
});

interface Point {
  latitude: number;
  longitude: number;
}

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

export default function DashboardPageVPJS() {
  const { 
    userVPJS, 
    signOutVPJS, 
    saveAnimalLocationVPJS,
    animalsVPJS
  } = useAuthVPJS();
  
  // Map states
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([]);
  const [userPosition, setUserPosition] = useState<Point | null>(null);
  const [checkResult, setCheckResult] = useState<"inside" | "outside" | null>(null);

  // View states
  const [timerDialogOpen, setTimerDialogOpen] = useState(false);
  const [animalsDialogOpen, setAnimalsDialogOpen] = useState(false);
  const [howToUseDialogOpen, setHowToUseDialogOpen] = useState(false);
  const [addAnimalDialogOpen, setAddAnimalDialogOpen] = useState(false);
  
  // Animal form
  const [newAnimalName, setNewAnimalName] = useState('');
  const [saveLocationLoading, setSaveLocationLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Timer state
  const [selectedTimer, setSelectedTimer] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Refresh location trigger
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Flag to check position after location update
  const pendingCheckRef = useRef(false);

  // History for undo (Ctrl+Z)
  const historyRef = useRef<Point[][]>([]);
  const historyIndexRef = useRef<number>(-1);

  // Save to history
  const saveToHistory = useCallback((points: Point[]) => {
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push([...points]);
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
  }, []);

  // Undo last action
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const previousState = historyRef.current[historyIndexRef.current];
      setPolygonPoints([...previousState]);
      setCheckResult(null);
    }
  }, []);

  // Keyboard shortcut for Ctrl+Z
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

  const handleAddPoint = useCallback((point: Point) => {
    setPolygonPoints((prev) => {
      const newPoints = [...prev, point];
      saveToHistory(newPoints);
      setCheckResult(null);
      return newPoints;
    });
  }, [saveToHistory]);

  const handleUpdatePoint = useCallback((index: number, point: Point) => {
    setPolygonPoints((prev) => {
      const newPoints = [...prev];
      newPoints[index] = point;
      saveToHistory(newPoints);
      setCheckResult(null);
      return newPoints;
    });
  }, [saveToHistory]);

  const handleUserPositionChange = useCallback((point: Point) => {
    setUserPosition(point);
    
    if (pendingCheckRef.current) {
      pendingCheckRef.current = false;
      setPolygonPoints((currentPolygons) => {
        if (currentPolygons.length >= 3) {
          const isInside = isPointInPolygon(point, currentPolygons);
          setCheckResult(isInside ? "inside" : "outside");
        }
        return currentPolygons;
      });
    }
  }, []);

  const handleCheckPosition = useCallback(() => {
    if (!userPosition || polygonPoints.length < 3) return;

    const isInside = isPointInPolygon(userPosition, polygonPoints);
    setCheckResult(isInside ? "inside" : "outside");
  }, [userPosition, polygonPoints]);

  const handleClearPoints = useCallback(() => {
    if (polygonPoints.length > 0) {
      saveToHistory([]);
    }
    setPolygonPoints([]);
    setCheckResult(null);
  }, [polygonPoints, saveToHistory]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startTimer = (seconds: number) => {
    setSelectedTimer(seconds);
    setTimeRemaining(seconds);
    setTimerRunning(true);
  };

  const stopTimer = () => {
    setTimerRunning(false);
    setTimeRemaining(0);
    setSelectedTimer(null);
    pendingCheckRef.current = false;
  };

  // Timer effect
  useEffect(() => {
    if (timerRunning && timeRemaining > 0) {
      const interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            pendingCheckRef.current = true;
            setRefreshKey((k) => k + 1);
            return selectedTimer || 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timerRunning, timeRemaining, selectedTimer]);

  // Auto-hide check result after 5 seconds
  useEffect(() => {
    if (checkResult) {
      const timer = setTimeout(() => {
        setCheckResult(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [checkResult]);

  const handleLogout = async () => {
    await signOutVPJS();
    setPolygonPoints([]);
    setCheckResult(null);
  };

  // Save animal location
  const handleSaveAnimalLocation = async () => {
    if (!newAnimalName.trim()) {
      setError('Digite o nome do animal.');
      return;
    }
    if (!userPosition) {
      setError('Localização não disponível. Aguarde o GPS.');
      return;
    }

    setSaveLocationLoading(true);
    setError('');
    
    try {
      await saveAnimalLocationVPJS(newAnimalName.trim(), userPosition.latitude, userPosition.longitude);
      setSuccess(`Localização do animal "${newAnimalName}" salva com sucesso!`);
      setNewAnimalName('');
      setAddAnimalDialogOpen(false);
    } catch (error: any) {
      setError(error.message || 'Erro ao salvar localização.');
    } finally {
      setSaveLocationLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="z-[1001] bg-background/95 backdrop-blur-sm border-b border-border shrink-0 h-14">
        <div className="px-4 py-2 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Menu Dropdown */}
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
                  <Clock className="w-4 h-4 mr-2" />
                  Temporizador
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAnimalsDialogOpen(true)}>
                  <MapPin className="w-4 h-4 mr-2" />
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
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" x2="9" y1="12" y2="12" />
                  </svg>
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                <line x1="9" x2="9" y1="3" y2="18" />
                <line x1="15" x2="15" y1="6" y2="21" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold">GeoFence App VPJS</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-medium text-xs">
                  {userVPJS?.nomeVPJS?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-muted-foreground max-w-[100px] truncate">
                {userVPJS?.nomeVPJS}
              </span>
            </div>
            {userPosition && (
              <Badge variant="outline" className="hidden sm:flex">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                GPS
              </Badge>
            )}
            <Badge variant="secondary">{polygonPoints.length} pts</Badge>
            <Badge variant="outline">{animalsVPJS.length} animais</Badge>
          </div>
        </div>
      </header>

      {/* Map Container */}
      <div className="flex-1 relative min-h-0 map-wrapper">
        <MapView
          polygonPoints={polygonPoints}
          onAddPoint={handleAddPoint}
          onUpdatePoint={handleUpdatePoint}
          userPosition={userPosition}
          onUserPositionChange={handleUserPositionChange}
          onCheckPosition={handleCheckPosition}
          onClearPoints={handleClearPoints}
          checkResult={checkResult}
          refreshKey={refreshKey}
        />
      </div>

      {/* Timer Dialog */}
      <Dialog open={timerDialogOpen} onOpenChange={setTimerDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Temporizador</DialogTitle>
            <DialogDescription>Selecione um tempo para o temporizador em loop</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {timerRunning && selectedTimer && (
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-4xl font-mono font-bold text-primary">{formatTime(timeRemaining)}</div>
                <p className="text-sm text-muted-foreground mt-1">Loop a cada {timerOptions.find(t => t.seconds === selectedTimer)?.label}</p>
                <Button variant="destructive" size="sm" className="mt-3" onClick={stopTimer}>Parar</Button>
              </div>
            )}
            {!timerRunning && (
              <div className="grid grid-cols-3 gap-2">
                {timerOptions.map((option) => (
                  <Button key={option.seconds} variant={selectedTimer === option.seconds ? "default" : "outline"} onClick={() => startTimer(option.seconds)} className="h-14 flex flex-col">
                    <span className="text-lg font-bold">{option.label}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Animals Dialog */}
      <Dialog open={animalsDialogOpen} onOpenChange={setAnimalsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Animais Rastreados</DialogTitle>
            <DialogDescription>Gerencie os animais cadastrados</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Add new animal button */}
            <Button 
              className="w-full" 
              onClick={() => {
                setAnimalsDialogOpen(false);
                setAddAnimalDialogOpen(true);
              }}
              disabled={!userPosition}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Animal com Localização Atual
            </Button>

            {/* Animals list */}
            {animalsVPJS.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum animal cadastrado</p>
                <p className="text-xs">Adicione animais para rastrear suas localizações</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {animalsVPJS.map((animal) => (
                  <div 
                    key={animal.nomeAnimalVPJS}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{animal.nomeAnimalVPJS}</p>
                      {animal.locationVPJS && animal.locationVPJS.timestampVPJS > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Lat: {animal.locationVPJS.latitudeVPJS.toFixed(6)}, 
                          Lng: {animal.locationVPJS.longitudeVPJS.toFixed(6)}
                        </p>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={async () => {
                        if (userPosition) {
                          await saveAnimalLocationVPJS(
                            animal.nomeAnimalVPJS, 
                            userPosition.latitude, 
                            userPosition.longitude
                          );
                        }
                      }}
                      disabled={!userPosition}
                    >
                      <Send className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <p className="text-xs text-muted-foreground text-center">
              Clique no botão de envio para atualizar a localização do animal
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Animal Dialog */}
      <Dialog open={addAnimalDialogOpen} onOpenChange={setAddAnimalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Animal</DialogTitle>
            <DialogDescription>
              Cadastre um novo animal com sua localização atual
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="animalName">Nome do Animal</Label>
              <Input
                id="animalName"
                placeholder="Ex: Rex, Mimosa..."
                value={newAnimalName}
                onChange={(e) => setNewAnimalName(e.target.value)}
              />
            </div>

            {userPosition && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Localização atual:</p>
                <p className="text-xs text-muted-foreground">
                  Lat: {userPosition.latitude.toFixed(6)}, 
                  Lng: {userPosition.longitude.toFixed(6)}
                </p>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setNewAnimalName('');
                  setAddAnimalDialogOpen(false);
                }}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1"
                onClick={handleSaveAnimalLocation}
                disabled={saveLocationLoading || !userPosition}
              >
                {saveLocationLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* How to Use Dialog */}
      <Dialog open={howToUseDialogOpen} onOpenChange={setHowToUseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Como usar</DialogTitle>
            <DialogDescription>Crie áreas de geofencing e rastreie animais</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">1</div>
              <p className="text-sm text-muted-foreground">O mapa centra automaticamente na sua posição atual</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold shrink-0">2</div>
              <p className="text-sm text-muted-foreground">Clique no mapa para adicionar pontos e desenhar a área do polígono</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold shrink-0">3</div>
              <p className="text-sm text-muted-foreground">Clique em "Verificar" para saber se você está dentro ou fora da área</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0">4</div>
              <p className="text-sm text-muted-foreground">Use o menu "Animais" para cadastrar e rastrear animais com sua localização atual</p>
            </div>
            <div className="pt-3 border-t border-border space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Legenda:</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="w-3 h-3 rounded-full bg-blue-500"></span>Sua posição</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="w-3 h-3 rounded-full bg-red-500"></span>Pontos do polígono</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="w-3 h-3 rounded bg-green-500/30 border border-green-500"></span>Área delimitada</div>
            </div>
            <div className="pt-3 border-t border-border space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Dicas:</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="text-xs bg-muted px-2 py-1 rounded">Ctrl+Z</span>Desfazer última ação</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Toast */}
      {success && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[2000]">
          <Alert className="border-green-200 bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
