'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { isPointInPolygon } from 'geolib';
import { Loader2 } from 'lucide-react';

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

interface PointVPJS {
  latitudeVPJS: number;
  longitudeVPJS: number;
}

// Timer options with label and seconds
const timerOptionsVPJS = [
  { labelVPJS: "15s", secondsVPJS: 15 },
  { labelVPJS: "30s", secondsVPJS: 30 },
  { labelVPJS: "1min", secondsVPJS: 60 },
  { labelVPJS: "3min", secondsVPJS: 180 },
  { labelVPJS: "15min", secondsVPJS: 900 },
  { labelVPJS: "30min", secondsVPJS: 1800 },
  { labelVPJS: "1h", secondsVPJS: 3600 },
  { labelVPJS: "2h", secondsVPJS: 7200 },
  { labelVPJS: "10h", secondsVPJS: 36000 },
];

export default function DashboardPage() {
  const { userVPJS, loadingVPJS: authLoadingVPJS, signOutVPJS } = useAuthVPJS();
  const routerVPJS = useRouter();
  
  const [polygonPointsVPJS, setPolygonPointsVPJS] = useState<PointVPJS[]>([]);
  const [userPositionVPJS, setUserPositionVPJS] = useState<PointVPJS | null>(null);
  const [checkResultVPJS, setCheckResultVPJS] = useState<"inside" | "outside" | null>(null);

  // View states
  const [timerDialogOpenVPJS, setTimerDialogOpenVPJS] = useState(false);
  const [animalsDialogOpenVPJS, setAnimalsDialogOpenVPJS] = useState(false);
  const [howToUseDialogOpenVPJS, setHowToUseDialogOpenVPJS] = useState(false);
  
  // Timer state
  const [selectedTimerVPJS, setSelectedTimerVPJS] = useState<number | null>(null);
  const [timerRunningVPJS, setTimerRunningVPJS] = useState(false);
  const [timeRemainingVPJS, setTimeRemainingVPJS] = useState(0);
  const [animalCodeVPJS, setAnimalCodeVPJS] = useState("");

  // Refresh location trigger
  const [refreshKeyVPJS, setRefreshKeyVPJS] = useState(0);
  
  // Flag to check position after location update
  const pendingCheckRefVPJS = useRef(false);

  // History for undo (Ctrl+Z)
  const historyRefVPJS = useRef<PointVPJS[][]>([]);
  const historyIndexRefVPJS = useRef<number>(-1);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoadingVPJS && !userVPJS) {
      routerVPJS.push('/login');
    }
  }, [userVPJS, authLoadingVPJS, routerVPJS]);

  // Save to history
  const saveToHistoryVPJS = useCallback((points: PointVPJS[]) => {
    const newHistoryVPJS = historyRefVPJS.current.slice(0, historyIndexRefVPJS.current + 1);
    newHistoryVPJS.push([...points]);
    historyRefVPJS.current = newHistoryVPJS;
    historyIndexRefVPJS.current = newHistoryVPJS.length - 1;
  }, []);

  // Undo last action
  const handleUndoVPJS = useCallback(() => {
    if (historyIndexRefVPJS.current > 0) {
      historyIndexRefVPJS.current--;
      const previousStateVPJS = historyRefVPJS.current[historyIndexRefVPJS.current];
      setPolygonPointsVPJS([...previousStateVPJS]);
      setCheckResultVPJS(null);
    }
  }, []);

  // Keyboard shortcut for Ctrl+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        handleUndoVPJS();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndoVPJS]);

  const handleAddPointVPJS = useCallback((point: PointVPJS) => {
    setPolygonPointsVPJS((prev) => {
      const newPointsVPJS = [...prev, point];
      saveToHistoryVPJS(newPointsVPJS);
      setCheckResultVPJS(null);
      return newPointsVPJS;
    });
  }, [saveToHistoryVPJS]);

  const handleUpdatePointVPJS = useCallback((index: number, point: PointVPJS) => {
    setPolygonPointsVPJS((prev) => {
      const newPointsVPJS = [...prev];
      newPointsVPJS[index] = point;
      saveToHistoryVPJS(newPointsVPJS);
      setCheckResultVPJS(null);
      return newPointsVPJS;
    });
  }, [saveToHistoryVPJS]);

  // This is called when location is updated
  const handleUserPositionChangeVPJS = useCallback((point: PointVPJS) => {
    setUserPositionVPJS(point);
    
    if (pendingCheckRefVPJS.current) {
      pendingCheckRefVPJS.current = false;
      setPolygonPointsVPJS((currentPolygons) => {
        if (currentPolygons.length >= 3) {
          const isInside = isPointInPolygon(
            { latitude: point.latitudeVPJS, longitude: point.longitudeVPJS },
            currentPolygons.map(p => ({ latitude: p.latitudeVPJS, longitude: p.longitudeVPJS }))
          );
          setCheckResultVPJS(isInside ? "inside" : "outside");
        }
        return currentPolygons;
      });
    }
  }, []);

  const handleCheckPositionVPJS = useCallback(() => {
    if (!userPositionVPJS || polygonPointsVPJS.length < 3) return;

    const isInside = isPointInPolygon(
      { latitude: userPositionVPJS.latitudeVPJS, longitude: userPositionVPJS.longitudeVPJS },
      polygonPointsVPJS.map(p => ({ latitude: p.latitudeVPJS, longitude: p.longitudeVPJS }))
    );
    setCheckResultVPJS(isInside ? "inside" : "outside");
  }, [userPositionVPJS, polygonPointsVPJS]);

  const handleClearPointsVPJS = useCallback(() => {
    if (polygonPointsVPJS.length > 0) {
      saveToHistoryVPJS([]);
    }
    setPolygonPointsVPJS([]);
    setCheckResultVPJS(null);
  }, [polygonPointsVPJS, saveToHistoryVPJS]);

  const formatTimeVPJS = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startTimerVPJS = (seconds: number) => {
    setSelectedTimerVPJS(seconds);
    setTimeRemainingVPJS(seconds);
    setTimerRunningVPJS(true);
  };

  const stopTimerVPJS = () => {
    setTimerRunningVPJS(false);
    setTimeRemainingVPJS(0);
    setSelectedTimerVPJS(null);
    pendingCheckRefVPJS.current = false;
  };

  // Timer effect - loops and refreshes location
  useEffect(() => {
    if (timerRunningVPJS && timeRemainingVPJS > 0) {
      const interval = setInterval(() => {
        setTimeRemainingVPJS((prev) => {
          if (prev <= 1) {
            pendingCheckRefVPJS.current = true;
            setRefreshKeyVPJS((k) => k + 1);
            return selectedTimerVPJS || 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timerRunningVPJS, timeRemainingVPJS, selectedTimerVPJS]);

  // Handle animal confirm
  const handleAnimalConfirmVPJS = () => {
    setAnimalCodeVPJS("");
  };

  // Auto-hide check result after 5 seconds
  useEffect(() => {
    if (checkResultVPJS) {
      const timer = setTimeout(() => {
        setCheckResultVPJS(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [checkResultVPJS]);

  // Handle logout
  const handleLogoutVPJS = async () => {
    await signOutVPJS();
    routerVPJS.push('/login');
  };

  // Show loading while checking auth
  if (authLoadingVPJS) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!userVPJS) {
    return null;
  }

  // Adapt PointVPJS to Point for MapView component
  const adaptedPolygonPoints = polygonPointsVPJS.map(p => ({
    latitude: p.latitudeVPJS,
    longitude: p.longitudeVPJS
  }));

  const adaptedUserPosition = userPositionVPJS ? {
    latitude: userPositionVPJS.latitudeVPJS,
    longitude: userPositionVPJS.longitudeVPJS
  } : null;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="z-1001 bg-background/95 backdrop-blur-sm border-b border-border shrink-0 h-14">
        <div className="px-4 py-2 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Menu Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="4" x2="20" y1="12" y2="12" />
                    <line x1="4" x2="20" y1="6" y2="6" />
                    <line x1="4" x2="20" y1="18" y2="18" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setTimerDialogOpenVPJS(true)}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Temporizador
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAnimalsDialogOpenVPJS(true)}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <path d="M12 2a3 3 0 0 0-3 3c0 1.6.8 2.4 1.5 3.5C11.3 9.6 12 10.8 12 12c0-1.2.7-2.4 1.5-3.5C14.2 7.4 15 6.6 15 5a3 3 0 0 0-3-3Z" />
                    <path d="M12 12c0 1.2-.7 2.4-1.5 3.5-.7 1.1-1.5 1.9-1.5 3.5a3 3 0 0 0 6 0c0-1.6-.8-2.4-1.5-3.5-.8-1.1-1.5-2.3-1.5-3.5Z" />
                  </svg>
                  Animais
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setHowToUseDialogOpenVPJS(true)}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <path d="M12 17h.01" />
                  </svg>
                  Como usar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogoutVPJS} className="text-destructive focus:text-destructive">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" x2="9" y1="12" y2="12" />
                  </svg>
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
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
            {/* User info */}
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-medium text-xs">
                  {userVPJS.nomeVPJS.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-muted-foreground max-w-100px truncate">
                {userVPJS.nomeVPJS}
              </span>
            </div>
            {userPositionVPJS && (
              <Badge variant="outline" className="hidden sm:flex">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                GPS
              </Badge>
            )}
            <Badge variant="secondary">{polygonPointsVPJS.length} pts</Badge>
          </div>
        </div>
      </header>

      {/* Map Container */}
      <div className="flex-1 relative min-h-0 map-wrapper">
        <MapView
          polygonPoints={adaptedPolygonPoints}
          onAddPoint={(point) => handleAddPointVPJS({ latitudeVPJS: point.latitude, longitudeVPJS: point.longitude })}
          onUpdatePoint={(index, point) => handleUpdatePointVPJS(index, { latitudeVPJS: point.latitude, longitudeVPJS: point.longitude })}
          userPosition={adaptedUserPosition}
          onUserPositionChange={(point) => handleUserPositionChangeVPJS({ latitudeVPJS: point.latitude, longitudeVPJS: point.longitude })}
          onCheckPosition={handleCheckPositionVPJS}
          onClearPoints={handleClearPointsVPJS}
          checkResult={checkResultVPJS}
          refreshKey={refreshKeyVPJS}
        />
      </div>

      {/* Timer Dialog */}
      <Dialog open={timerDialogOpenVPJS} onOpenChange={setTimerDialogOpenVPJS}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Temporizador</DialogTitle>
            <DialogDescription>
              Selecione um tempo para o temporizador em loop
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {timerRunningVPJS && selectedTimerVPJS && (
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-4xl font-mono font-bold text-primary">
                  {formatTimeVPJS(timeRemainingVPJS)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Loop a cada {timerOptionsVPJS.find(t => t.secondsVPJS === selectedTimerVPJS)?.labelVPJS}
                </p>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="mt-3"
                  onClick={stopTimerVPJS}
                >
                  Parar
                </Button>
              </div>
            )}

            {!timerRunningVPJS && (
              <div className="grid grid-cols-3 gap-2">
                {timerOptionsVPJS.map((option) => (
                  <Button
                    key={option.secondsVPJS}
                    variant={selectedTimerVPJS === option.secondsVPJS ? "default" : "outline"}
                    onClick={() => startTimerVPJS(option.secondsVPJS)}
                    className="h-14 flex flex-col"
                  >
                    <span className="text-lg font-bold">{option.labelVPJS}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Animals Dialog */}
      <Dialog open={animalsDialogOpenVPJS} onOpenChange={setAnimalsDialogOpenVPJS}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Animais</DialogTitle>
            <DialogDescription>
              Digite o código do animal
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Código</label>
              <Input
                placeholder="Digite o código..."
                value={animalCodeVPJS}
                onChange={(e) => setAnimalCodeVPJS(e.target.value)}
                className="text-center text-lg"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setAnimalCodeVPJS("")}
              >
                Limpar
              </Button>
              <Button 
                className="flex-1"
                onClick={handleAnimalConfirmVPJS}
              >
                Confirmar
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              Funcionalidade em desenvolvimento
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* How to Use Dialog */}
      <Dialog open={howToUseDialogOpenVPJS} onOpenChange={setHowToUseDialogOpenVPJS}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Como usar</DialogTitle>
            <DialogDescription>
              Crie áreas de geofencing
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                1
              </div>
              <p className="text-sm text-muted-foreground">
                O mapa centra automaticamente na sua posição atual
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                2
              </div>
              <p className="text-sm text-muted-foreground">
                Clique no mapa para adicionar pontos e desenhar a área do polígono
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                3
              </div>
              <p className="text-sm text-muted-foreground">
                Clique em "Verificar" para saber se você está dentro ou fora da área
              </p>
            </div>

            <div className="pt-3 border-t border-border space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Legenda:</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                Sua posição
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                Pontos do polígono
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-3 h-3 rounded bg-green-500/30 border border-green-500"></span>
                Área delimitada
              </div>
            </div>

            <div className="pt-3 border-t border-border space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Dicas:</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-xs bg-muted px-2 py-1 rounded">Ctrl+Z</span>
                Desfazer última ação
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Arraste os pontos para ajustar a área
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
