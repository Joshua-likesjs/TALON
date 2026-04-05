'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { TrackedAnimalVPJS, HistoryPointVPJS, useAnimalsVPJS } from '@/contexts/AnimalsContextVPJS';

// Period options (same as timer)
const periodOptions = [
  { label: '15min', seconds: 900 },
  { label: '30min', seconds: 1800 },
  { label: '1h', seconds: 3600 },
  { label: '3h', seconds: 10800 },
  { label: '6h', seconds: 21600 },
  { label: '12h', seconds: 43200 },
  { label: '24h', seconds: 86400 },
  { label: '3 dias', seconds: 259200 },
  { label: '7 dias', seconds: 604800 },
];

// View mode
type ViewMode = 'heatmap' | 'rastro' | 'ambos';

// Create marker icon for selected time position
const createPositionIcon = () => {
  return L.divIcon({
    className: 'position-marker',
    html: `
      <div style="
        width: 20px;
        height: 20px;
        background: #3b82f6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

// Heatmap layer component
function HeatmapLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();
  const heatLayerRef = useRef<L.HeatLayer | null>(null);

  useEffect(() => {
    if (!map || points.length === 0) return;

    // Remove existing layer
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }

    // Create new heat layer
    // @ts-ignore - leaflet.heat types
    heatLayerRef.current = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.0: 'blue',
        0.25: 'cyan',
        0.5: 'lime',
        0.75: 'yellow',
        1.0: 'red',
      },
    });

    heatLayerRef.current.addTo(map);

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [map, points]);

  return null;
}

// Component to fit bounds
function FitBounds({ points }: { points: HistoryPointVPJS[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    const bounds = L.latLngBounds(points.map(p => [p.latitude, p.longitude]));
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, points]);

  return null;
}

interface AnimalHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  animal: TrackedAnimalVPJS | null;
}

export function AnimalHistoryDialog({ open, onOpenChange, animal }: AnimalHistoryDialogProps) {
  const { loadAnimalHistory } = useAnimalsVPJS();
  const [history, setHistory] = useState<HistoryPointVPJS[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<HistoryPointVPJS[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(periodOptions[3]); // default 3h
  const [timeSliderValue, setTimeSliderValue] = useState(100);
  const [viewMode, setViewMode] = useState<ViewMode>('ambos');
  const [selectedPoint, setSelectedPoint] = useState<HistoryPointVPJS | null>(null);

  // Load history when dialog opens
  const loadHistory = useCallback(async () => {
    if (!animal) return;
    
    setLoading(true);
    try {
      const points = await loadAnimalHistory(animal.codigoVPJS, 2000);
      setHistory(points);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [animal, loadAnimalHistory]);

  // Load history when dialog opens
  useEffect(() => {
    if (open && animal) {
      loadHistory();
    }
  }, [open, animal, loadHistory]);

  // Filter history by period - compute derived state
  const computedFilteredHistory = history.length === 0 
    ? [] 
    : history.filter(p => p.timestamp >= Date.now() - (selectedPeriod.seconds * 1000));

  // Update filtered history when period changes
  useEffect(() => {
    setFilteredHistory(computedFilteredHistory);
    setTimeSliderValue(100);
  }, [computedFilteredHistory.length, selectedPeriod.seconds]);

  // Compute selected point based on slider
  const computedSelectedPoint = filteredHistory.length === 0
    ? null
    : filteredHistory[Math.floor((timeSliderValue / 100) * (filteredHistory.length - 1))];

  // Update selected point when slider or filtered history changes
  useEffect(() => {
    setSelectedPoint(computedSelectedPoint);
  }, [computedSelectedPoint]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setHistory([]);
      setFilteredHistory([]);
      setTimeSliderValue(100);
    }
  }, [open]);

  // Prepare heatmap data
  const heatmapPoints: [number, number, number][] = filteredHistory.map(p => [
    p.latitude,
    p.longitude,
    0.5, // intensity
  ]);

  // Prepare polyline data
  const polylinePoints: [number, number][] = filteredHistory.map(p => [
    p.latitude,
    p.longitude,
  ]);

  // Format time for display
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get time range for slider
  const getTimeRange = () => {
    if (filteredHistory.length < 2) return { start: '--:--', end: '--:--' };
    return {
      start: formatTime(filteredHistory[0].timestamp),
      end: formatTime(filteredHistory[filteredHistory.length - 1].timestamp),
    };
  };

  const timeRange = getTimeRange();

  if (!animal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
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
            <span>Histórico: {animal.nomeVPJS}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Period selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Período:</span>
              <select
                value={selectedPeriod.seconds}
                onChange={(e) => {
                  const period = periodOptions.find(p => p.seconds === Number(e.target.value));
                  if (period) setSelectedPeriod(period);
                }}
                className="text-sm border rounded px-2 py-1 bg-background"
              >
                {periodOptions.map((p) => (
                  <option key={p.seconds} value={p.seconds}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* View mode toggle */}
            <div className="flex gap-1 ml-auto">
              <Button
                variant={viewMode === 'heatmap' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('heatmap')}
              >
                🔥 Heatmap
              </Button>
              <Button
                variant={viewMode === 'rastro' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('rastro')}
              >
                📍 Rastro
              </Button>
              <Button
                variant={viewMode === 'ambos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('ambos')}
              >
                Ambos
              </Button>
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 min-h-[300px] rounded-lg overflow-hidden border border-border">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">Carregando histórico...</span>
                </div>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <span className="text-muted-foreground">Nenhum dado encontrado para este período</span>
              </div>
            ) : (
              <MapContainer
                center={[filteredHistory[0]?.latitude || 0, filteredHistory[0]?.longitude || 0]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                className="leaflet-container"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <FitBounds points={filteredHistory} />

                {/* Heatmap */}
                {(viewMode === 'heatmap' || viewMode === 'ambos') && (
                  <HeatmapLayer points={heatmapPoints} />
                )}

                {/* Polyline (Rastro) */}
                {(viewMode === 'rastro' || viewMode === 'ambos') && polylinePoints.length > 1 && (
                  <Polyline
                    positions={polylinePoints}
                    pathOptions={{
                      color: '#f97316',
                      weight: 3,
                      opacity: 0.7,
                    }}
                  />
                )}

                {/* Selected position marker */}
                {selectedPoint && (
                  <Marker
                    position={[selectedPoint.latitude, selectedPoint.longitude]}
                    icon={createPositionIcon()}
                  />
                )}
              </MapContainer>
            )}
          </div>

          {/* Time slider */}
          {filteredHistory.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{timeRange.start}</span>
                <span>{timeRange.end}</span>
              </div>
              <Slider
                value={[timeSliderValue]}
                onValueChange={([value]) => setTimeSliderValue(value)}
                max={100}
                step={1}
                className="w-full"
              />
              {selectedPoint && (
                <div className="text-center text-sm text-muted-foreground">
                  📍 {formatTime(selectedPoint.timestamp)}
                </div>
              )}
            </div>
          )}

          {/* Points count */}
          <div className="text-xs text-muted-foreground text-center">
            {filteredHistory.length} pontos encontrados
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
