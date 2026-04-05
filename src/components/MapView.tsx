"use client";

import { useEffect, useState, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import * as turf from "@turf/turf";
import { Point, LocalPolygon } from "@/lib/types";
import { TrackedAnimalVPJS } from "@/contexts/AnimalsContextVPJS";

// Fix for default marker icons in Leaflet with Next.js
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: icon.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Create icon with specific color
const createIcon = (color: string, size: number = 24) => {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 0 2px ${color}40;
        cursor: grab;
        pointer-events: auto;
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

const primaryIcon = createIcon("#585c2b", 24);

// Create animal icon (different from user marker)
const createAnimalIcon = (size: number = 32, photoUrl?: string) => {
  // Se tem foto, criar ícone com a foto
  if (photoUrl) {
    return L.divIcon({
      className: "animal-marker",
      html: `
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -100%);
          width: 0;
          height: 0;
          pointer-events: auto;
        ">
          <div style="
            width: ${size}px;
            height: ${size}px;
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          ">
            <img 
              src="${photoUrl}" 
              alt="Animal" 
              style="
                width: ${size - 6}px;
                height: ${size - 6}px;
                border-radius: 50%;
                object-fit: cover;
                transform: rotate(45deg);
              "
            />
          </div>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size],
      popupAnchor: [0, -size],
    });
  }
  
  // Ícone padrão sem foto
  return L.divIcon({
    className: "animal-marker",
    html: `
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -100%);
        width: 0;
        height: 0;
        pointer-events: auto;
      ">
        <div style="
          width: ${size}px;
          height: ${size}px;
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 2px 10px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg style="transform: rotate(45deg)" width="${size * 0.5}px" height="${size * 0.5}px" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3c0 1.6.8 2.4 1.5 3.5C11.3 9.6 12 10.8 12 12c0-1.2.7-2.4 1.5-3.5C14.2 7.4 15 6.6 15 5a3 3 0 0 0-3-3Z"/>
            <path d="M12 12c0 1.2-.7 2.4-1.5 3.5-.7 1.1-1.5 1.9-1.5 3.5a3 3 0 0 0 6 0c0-1.6-.8-2.4-1.5-3.5-.8-1.1-1.5-2.3-1.5-3.5Z"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

const animalIcon = createAnimalIcon(32);



function MapEvents({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to expose map methods
const MapController = forwardRef<{ centerOnPosition: (lat: number, lng: number) => void }, object>(
  function MapController(props, ref) {
    const map = useMap();

    useImperativeHandle(ref, () => ({
      centerOnPosition: (lat: number, lng: number) => {
        map.flyTo([lat, lng], 17, {
          duration: 1.5,
          easeLinearity: 0.25,
        });
      },
    }));

    return null;
  }
);

function LocationMarker({
  position,
  onLocationFound,
  refreshKey,
}: {
  position: Point | null;
  onLocationFound: (lat: number, lng: number) => void;
  refreshKey: number;
}) {
  const map = useMap();
  const prevRefreshKey = useRef(0);
  const hasLocatedRef = useRef(false);
  const hasCenteredRef = useRef(false); // Controla se já centralizou

  useEffect(() => {
    // Só localiza uma vez no início
    if (hasLocatedRef.current) return;
    hasLocatedRef.current = true;

    const handleLocationFound = (e: { latlng: { lat: number; lng: number } }) => {
      onLocationFound(e.latlng.lat, e.latlng.lng);
      // Só centraliza na primeira vez que entra no site
      if (!hasCenteredRef.current) {
        hasCenteredRef.current = true;
        map.flyTo([e.latlng.lat, e.latlng.lng], 17, { duration: 1.5 });
      }
    };

    const handleLocationError = () => {
      console.log('Erro ao obter localização, usando localização padrão');
      onLocationFound(-23.5505, -46.6333);
    };

    map.locate({ setView: false, enableHighAccuracy: true, timeout: 10000 });

    map.on("locationfound", handleLocationFound);
    map.on("locationerror", handleLocationError);

    return () => {
      map.off("locationfound", handleLocationFound);
      map.off("locationerror", handleLocationError);
    };
  }, [map, onLocationFound]);

  useEffect(() => {
    // Atualiza localização sem centralizar (para o timer)
    if (position && refreshKey > 0 && refreshKey !== prevRefreshKey.current) {
      prevRefreshKey.current = refreshKey;
      map.locate({ setView: false, enableHighAccuracy: true, timeout: 10000 });
    }
  }, [map, position, refreshKey]);

  return position ? (
    <Marker position={[position.latitude, position.longitude]} icon={primaryIcon} />
  ) : null;
}

// Helper to mix two hex colors with additive mixing (like light)
// Blue + Green = Cyan, Red + Green = Yellow, Red + Blue = Magenta
function mixColors(color1: string, color2: string): string {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substring(0, 2), 16);
  const g1 = parseInt(hex1.substring(2, 4), 16);
  const b1 = parseInt(hex1.substring(4, 6), 16);
  
  const r2 = parseInt(hex2.substring(0, 2), 16);
  const g2 = parseInt(hex2.substring(2, 4), 16);
  const b2 = parseInt(hex2.substring(4, 6), 16);
  
  // Additive color mixing - add values and cap at 255
  const r = Math.min(255, r1 + r2);
  const g = Math.min(255, g1 + g2);
  const b = Math.min(255, b1 + b2);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Convert polygon vertices to GeoJSON coordinates
function verticesToCoords(vertices: Point[]): number[][] {
  const coordinates = vertices.map(v => [v.longitude, v.latitude]);
  // Close the polygon (first point = last point)
  coordinates.push([vertices[0].longitude, vertices[0].latitude]);
  return coordinates;
}

// Calculate intersection between two polygons
function getPolygonIntersection(poly1: Point[], poly2: Point[]): Point[][] | null {
  if (poly1.length < 3 || poly2.length < 3) return null;
  
  try {
    const coords1 = verticesToCoords(poly1);
    const coords2 = verticesToCoords(poly2);
    
    const polygon1 = turf.polygon([coords1]);
    const polygon2 = turf.polygon([coords2]);
    
    const intersection = turf.intersect(turf.featureCollection([polygon1, polygon2]));
    
    if (!intersection) return null;
    
    const geometry = intersection.geometry;
    
    if (geometry.type === 'Polygon') {
      const rings = geometry.coordinates.map(ring => 
        ring.slice(0, -1).map(([lng, lat]) => ({ latitude: lat, longitude: lng }))
      );
      return rings as Point[][];
    }
    
    // Handle MultiPolygon
    if (geometry.type === 'MultiPolygon') {
      const allRings: Point[][] = [];
      geometry.coordinates.forEach(polygonCoords => {
        polygonCoords.forEach(ring => {
          allRings.push(ring.slice(0, -1).map(([lng, lat]) => ({ latitude: lat, longitude: lng })));
        });
      });
      return allRings.length > 0 ? allRings : null;
    }
  } catch (e) {
    // Intersection failed (polygons might not overlap)
    console.log('Interseção falhou:', e);
  }
  
  return null;
}

// Polygon layer for multiple polygons with intersection coloring
function MultiPolygonLayer({
  polygons,
  selectedPolygonId,
  onDragEnd,
}: {
  polygons: LocalPolygon[];
  selectedPolygonId: string | null;
  onDragEnd: (polygonId: string, index: number, lat: number, lng: number) => void;
}) {
  const map = useMap();
  const layersRef = useRef<{ [id: string]: L.Polygon | L.Polyline }>({});
  const intersectionsRef = useRef<{ [id: string]: L.Polygon }>({});
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const prevPolygonsRef = useRef<string>('');
  const prevSelectedRef = useRef<string | null>(null);
  
  // Usar ref para onDragEnd para evitar re-renderizações
  const onDragEndRef = useRef(onDragEnd);
  
  useEffect(() => {
    onDragEndRef.current = onDragEnd;
  }, [onDragEnd]);

  useEffect(() => {
    // Serializar polígonos para comparar
    const polygonsJson = JSON.stringify(polygons.map(p => ({
      id: p.id,
      cor: p.cor,
      vertices: p.vertices,
    })));
    
    // Se nada mudou (exceto seleção), só atualizar estilos
    const onlySelectionChanged = polygonsJson === prevPolygonsRef.current && 
                                  prevSelectedRef.current !== selectedPolygonId;
    
    prevPolygonsRef.current = polygonsJson;
    prevSelectedRef.current = selectedPolygonId;

    // Remover camadas que não existem mais
    Object.keys(layersRef.current).forEach((id) => {
      if (!polygons.find(p => p.id === id)) {
        layersRef.current[id].remove();
        delete layersRef.current[id];
      }
    });

    // Remover interseções de polígonos que não existem mais
    Object.keys(intersectionsRef.current).forEach((id) => {
      const parts = id.split('_');
      const poly1Id = parts[1];
      const poly2Id = parts[2];
      if (!polygons.find(p => p.id === poly1Id) || !polygons.find(p => p.id === poly2Id)) {
        intersectionsRef.current[id].remove();
        delete intersectionsRef.current[id];
      }
    });

    // Remover marcadores de polígonos que não existem mais
    Object.keys(markersRef.current).forEach((key) => {
      const polygonId = key.split('_')[0];
      if (!polygons.find(p => p.id === polygonId)) {
        markersRef.current[key].remove();
        delete markersRef.current[key];
      }
    });

    // Criar/atualizar polígonos
    polygons.forEach((polygon) => {
      const isSelected = polygon.id === selectedPolygonId;
      const latlngs: [number, number][] = polygon.vertices.map(v => [v.latitude, v.longitude]);
      const existingLayer = layersRef.current[polygon.id];
      
      // Se já existe e só mudou seleção, atualizar apenas o estilo
      // IMPORTANTE: NÃO usar return aqui, pois precisamos processar os marcadores abaixo!
      if (existingLayer && onlySelectionChanged) {
        existingLayer.setStyle({
          weight: isSelected ? 4 : 2,
          opacity: isSelected ? 1 : 0.7,
        });
        // Continua para processar os marcadores (não usar return!)
      } else if (existingLayer) {
        // Se já existe e tem a mesma quantidade de pontos, atualizar coordenadas
        const currentLatLngs = existingLayer.getLatLngs()[0] as L.LatLng[];
        
        // Verificar se precisa recriar (mudou de polyline para polygon ou vice-versa)
        const wasPolygon = existingLayer instanceof L.Polygon;
        const isNowPolygon = latlngs.length >= 3;
        
        if (wasPolygon === isNowPolygon && currentLatLngs.length === latlngs.length) {
          // Mesmo tipo e mesma quantidade - só atualizar
          existingLayer.setLatLngs(latlngs);
          existingLayer.setStyle({
            color: polygon.cor,
            fillColor: polygon.cor,
            fillOpacity: 0.35,
            weight: isSelected ? 4 : 2,
            opacity: isSelected ? 1 : 0.7,
          });
        } else {
          // Precisa recriar (mudou de 2 para 3+ pontos ou vice-versa)
          existingLayer.remove();
          
          if (latlngs.length >= 3) {
            layersRef.current[polygon.id] = L.polygon(latlngs, {
              color: polygon.cor,
              fillColor: polygon.cor,
              fillOpacity: 0.35,
              weight: isSelected ? 4 : 2,
              opacity: isSelected ? 1 : 0.7,
              lineCap: 'round',
              lineJoin: 'round',
            }).addTo(map);
          } else if (latlngs.length === 2) {
            layersRef.current[polygon.id] = L.polyline(latlngs, {
              color: polygon.cor,
              weight: isSelected ? 4 : 2,
              opacity: isSelected ? 1 : 0.7,
              dashArray: '5, 5',
              lineCap: 'round',
              lineJoin: 'round',
            }).addTo(map);
          } else {
            delete layersRef.current[polygon.id];
          }
        }
      } else {
        // Criar nova camada
        if (latlngs.length >= 3) {
          layersRef.current[polygon.id] = L.polygon(latlngs, {
            color: polygon.cor,
            fillColor: polygon.cor,
            fillOpacity: 0.35,
            weight: isSelected ? 4 : 2,
            opacity: isSelected ? 1 : 0.7,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);
        } else if (latlngs.length === 2) {
          layersRef.current[polygon.id] = L.polyline(latlngs, {
            color: polygon.cor,
            weight: isSelected ? 4 : 2,
            opacity: isSelected ? 1 : 0.7,
            dashArray: '5, 5',
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);
        }
      }

      // Remover marcadores antigos deste polígono
      Object.keys(markersRef.current).forEach((key) => {
        if (key.startsWith(polygon.id + '_')) {
          markersRef.current[key].remove();
          delete markersRef.current[key];
        }
      });

      // Criar marcadores apenas para o polígono selecionado
      if (isSelected && polygon.vertices.length > 0) {
        const iconLarge = createIcon(polygon.cor, 28);
        
        polygon.vertices.forEach((vertex, index) => {
          const markerKey = `${polygon.id}_${index}`;
          const marker = L.marker([vertex.latitude, vertex.longitude], {
            icon: iconLarge,
            draggable: true,
          }).addTo(map);

          marker.on('drag', (e) => {
            const latlng = e.target.getLatLng();
            // Atualizar polígono visualmente
            if (layersRef.current[polygon.id]) {
              const currentLatLngs = polygon.vertices.map((v, i) => 
                i === index ? [latlng.lat, latlng.lng] as [number, number] : [v.latitude, v.longitude] as [number, number]
              );
              layersRef.current[polygon.id].setLatLngs(currentLatLngs);
            }
          });

          marker.on('dragend', (e) => {
            const latlng = e.target.getLatLng();
            onDragEndRef.current(polygon.id, index, latlng.lat, latlng.lng);
          });

          markersRef.current[markerKey] = marker;
        });
      }
    });

    // Calcular e renderizar INTERSEÇÕES com cor misturada
    const validPolygons = polygons.filter(p => p.vertices.length >= 3);
    
    // Limpar interseções antigas
    Object.keys(intersectionsRef.current).forEach((id) => {
      intersectionsRef.current[id].remove();
      delete intersectionsRef.current[id];
    });
    
    for (let i = 0; i < validPolygons.length; i++) {
      for (let j = i + 1; j < validPolygons.length; j++) {
        const poly1 = validPolygons[i];
        const poly2 = validPolygons[j];
        
        const intersections = getPolygonIntersection(poly1.vertices, poly2.vertices);
        
        if (intersections && intersections.length > 0) {
          const mixedColor = mixColors(poly1.cor, poly2.cor);
          
          intersections.forEach((ring, ringIndex) => {
            const latlngs: [number, number][] = ring.map(v => [v.latitude, v.longitude]);
            const intersectionId = `intersection_${poly1.id}_${poly2.id}_${ringIndex}`;
            
            if (latlngs.length >= 3) {
              intersectionsRef.current[intersectionId] = L.polygon(latlngs, {
                color: mixedColor,
                fillColor: mixedColor,
                fillOpacity: 0.85,
                weight: 3,
                opacity: 1,
                lineCap: 'round',
                lineJoin: 'round',
              }).addTo(map);
            }
          });
        }
      }
    }
  }, [polygons, selectedPolygonId, map]);

  // Cleanup apenas quando o componente desmontar de verdade
  useEffect(() => {
    return () => {
      Object.values(layersRef.current).forEach(p => p.remove());
      Object.values(intersectionsRef.current).forEach(p => p.remove());
      Object.values(markersRef.current).forEach(m => m.remove());
    };
  }, []);

  return null;
}

// Component to render animal markers
function AnimalMarkers({ animals }: { animals: TrackedAnimalVPJS[] }) {
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const map = useMap();
  const prevTimestampsRef = useRef<{ [key: string]: number }>({});
  
  useEffect(() => {
    // Remove markers for animals that no longer exist
    Object.keys(markersRef.current).forEach((codigo) => {
      if (!animals.find(a => a.codigoVPJS === codigo)) {
        markersRef.current[codigo].remove();
        delete markersRef.current[codigo];
        delete prevTimestampsRef.current[codigo];
      }
    });
    
    // Add or update markers for tracked animals
    animals.forEach((animal) => {
      if (animal.location && !animal.loading && !animal.error) {
        const existingMarker = markersRef.current[animal.codigoVPJS];
        const prevTimestamp = prevTimestampsRef.current[animal.codigoVPJS];
        const currentTimestamp = animal.location.timestampVPJS;
        
        // Check if timestamp changed
        const timestampChanged = prevTimestamp !== undefined && prevTimestamp !== currentTimestamp;
        
        // Create icon with animal photo if available
        const icon = createAnimalIcon(40, animal.fotoVPJS);
        
        if (existingMarker) {
          // Update position
          existingMarker.setLatLng([animal.location.latitudeVPJS, animal.location.longitudeVPJS]);
          
          // Update icon (in case photo changed)
          existingMarker.setIcon(icon);
          
          // Update popup content if timestamp changed or always update to be safe
          existingMarker.setPopupContent(`
            <div style="text-align: center; min-width: 150px;">
              <strong style="font-size: 14px;">${animal.nomeVPJS}</strong>
              <br/>
              <span style="font-size: 12px; color: #666;">Código: ${animal.codigoVPJS}</span>
              <br/>
              <span style="font-size: 11px; color: #999;">
                Atualizado: ${new Date(animal.location.timestampVPJS).toLocaleString('pt-BR')}
              </span>
            </div>
          `);
          
          // If timestamp changed, log it
          if (timestampChanged) {
            console.log(`🔥 Animal ${animal.codigoVPJS} atualizado - Novo timestamp: ${new Date(currentTimestamp).toLocaleString('pt-BR')}`);
          }
        } else {
          // Create new marker with photo icon
          const marker = L.marker([animal.location.latitudeVPJS, animal.location.longitudeVPJS], {
            icon: icon,
          }).addTo(map);
          
          // Add popup with animal info
          marker.bindPopup(`
            <div style="text-align: center; min-width: 150px;">
              <strong style="font-size: 14px;">${animal.nomeVPJS}</strong>
              <br/>
              <span style="font-size: 12px; color: #666;">Código: ${animal.codigoVPJS}</span>
              <br/>
              <span style="font-size: 11px; color: #999;">
                Atualizado: ${new Date(animal.location.timestampVPJS).toLocaleString('pt-BR')}
              </span>
            </div>
          `);
          
          markersRef.current[animal.codigoVPJS] = marker;
        }
        
        // Update stored timestamp
        prevTimestampsRef.current[animal.codigoVPJS] = currentTimestamp;
      }
    });
  }, [animals, map]);
  
  // Cleanup apenas quando o componente desmontar
  useEffect(() => {
    return () => {
      Object.values(markersRef.current).forEach(m => m.remove());
    };
  }, []);
  
  return null;
}

interface MapViewProps {
  allPolygons: LocalPolygon[];
  selectedPolygonId: string | null;
  onAddPoint: (point: Point) => void;
  onUpdatePoint: (index: number, point: Point) => void;
  userPosition: Point | null;
  onUserPositionChange: (point: Point) => void;
  onCheckPosition: () => void;
  onClearPoints: () => void;
  checkResult: "inside" | "outside" | null;
  refreshKey?: number;
  onCreatePolygon: () => void;
  onSelectPolygon: (id: string) => void;
  onDeletePolygon: (id: string) => void;
  onRenamePolygon: () => void;
  trackedAnimals?: TrackedAnimalVPJS[];
}

export default function MapView({
  allPolygons,
  selectedPolygonId,
  onAddPoint,
  onUpdatePoint,
  userPosition,
  onUserPositionChange,
  onCheckPosition,
  onClearPoints,
  checkResult,
  refreshKey = 0,
  onCreatePolygon,
  onSelectPolygon,
  onDeletePolygon,
  onRenamePolygon,
  trackedAnimals = [],
}: MapViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isCentering, setIsCentering] = useState(false);
  const mapRef = useRef<{ centerOnPosition: (lat: number, lng: number) => void } | null>(null);
  
  // Derivar pontos do polígono selecionado
  const selectedPolygon = allPolygons.find(p => p.id === selectedPolygonId);
  const polygonPoints = selectedPolygon?.vertices || [];

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      onAddPoint({ latitude: lat, longitude: lng });
    },
    [onAddPoint]
  );

  const handleLocationFound = useCallback(
    (lat: number, lng: number) => {
      onUserPositionChange({ latitude: lat, longitude: lng });
      setIsLoading(false);
    },
    [onUserPositionChange]
  );

  const handleVertexDragEnd = useCallback(
    (polygonId: string, index: number, lat: number, lng: number) => {
      if (polygonId === selectedPolygonId) {
        onUpdatePoint(index, { latitude: lat, longitude: lng });
      }
    },
    [selectedPolygonId, onUpdatePoint]
  );

  const handleCenterOnUser = () => {
    if (userPosition && mapRef.current) {
      setIsCentering(true);
      mapRef.current.centerOnPosition(userPosition.latitude, userPosition.longitude);
      setTimeout(() => setIsCentering(false), 1500);
    }
  };

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <img src="/logo-icon.png" alt="TALON" className="w-12 h-12 animate-pulse" />
            <p className="text-muted-foreground text-sm">Obtendo localização...</p>
          </div>
        </div>
      )}

      {/* Center on user button */}
      <button
        onClick={handleCenterOnUser}
        disabled={!userPosition}
        className={`absolute top-4 right-4 z-[1000] h-12 w-12 rounded-full shadow-lg bg-card hover:bg-accent text-primary border border-border flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${isCentering ? 'scale-110' : 'scale-100'}`}
      >
        {isCentering && (
          <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping opacity-30" />
        )}
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`relative z-10 ${isCentering ? 'animate-pulse' : ''}`}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
        </svg>
      </button>

      {/* Polygon selector - abaixo do botão de centralizar */}
      <div className="absolute top-20 right-4 z-[1000] flex flex-col gap-2 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Botão de criar novo polígono */}
        <button
          onClick={onCreatePolygon}
          className="h-12 w-12 rounded-full shadow-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-all"
          title="Novo polígono"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" x2="12" y1="5" y2="19" />
            <line x1="5" x2="19" y1="12" y2="12" />
          </svg>
        </button>

        {/* Lista de polígonos */}
        {allPolygons.map((polygon) => (
          <div key={polygon.id} className="relative group">
            <button
              onClick={() => onSelectPolygon(polygon.id)}
              className={`h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition-all ${
                polygon.id === selectedPolygonId
                  ? 'ring-2 ring-primary ring-offset-2'
                  : ''
              }`}
              style={{ backgroundColor: polygon.cor }}
              title={polygon.nome}
            >
              <span className="text-white font-bold text-sm">
                {polygon.nome.charAt(0).toUpperCase()}
              </span>
            </button>
            
            {/* Menu de contexto (mostra no hover para o selecionado) */}
            {polygon.id === selectedPolygonId && (
              <div className="absolute right-14 top-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRenamePolygon();
                  }}
                  className="h-8 w-8 rounded-full bg-card shadow flex items-center justify-center hover:bg-accent"
                  title="Renomear"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePolygon(polygon.id);
                  }}
                  className="h-8 w-8 rounded-full bg-red-500 text-white shadow flex items-center justify-center hover:bg-red-600"
                  title="Excluir"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <MapContainer
        center={[-23.5505, -46.6333]}
        zoom={15}
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
        className="leaflet-container"
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          noWrap={true}
        />

        <MapEvents onMapClick={handleMapClick} />
        <MapController ref={mapRef} />
        <LocationMarker
          position={userPosition}
          onLocationFound={handleLocationFound}
          refreshKey={refreshKey}
        />
        
        {/* Renderizar múltiplos polígonos */}
        <MultiPolygonLayer
          polygons={allPolygons}
          selectedPolygonId={selectedPolygonId}
          onDragEnd={handleVertexDragEnd}
        />
        
        {/* Renderizar marcadores de animais */}
        <AnimalMarkers animals={trackedAnimals} />
      </MapContainer>

      {/* Control Panel */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] p-3 bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="max-w-md mx-auto space-y-3">
          {/* Result Display */}
          {checkResult && (
            <div
              className={`p-3 rounded-lg text-center font-medium text-sm ${
                checkResult === "inside"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
              }`}
            >
              {checkResult === "inside"
                ? "✅ Você está DENTRO de uma área!"
                : "❌ Você está FORA de todas as áreas!"}
            </div>
          )}

          {/* Selected polygon info */}
          {selectedPolygonId && (
            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-muted-foreground">
                {allPolygons.find(p => p.id === selectedPolygonId)?.nome || 'Polígono'}
              </span>
              <span className="font-bold text-primary">
                {polygonPoints.length} pts
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={onCheckPosition}
              disabled={allPolygons.every(p => p.vertices.length < 3)}
              size="sm"
              className="w-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="1" />
              </svg>
              Verificar
            </Button>
            <Button
              onClick={onClearPoints}
              variant="destructive"
              disabled={polygonPoints.length === 0}
              size="sm"
              className="w-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              Limpar
            </Button>
          </div>
          
          {/* Help text when no polygon */}
          {allPolygons.length === 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Clique no mapa para criar seu primeiro polígono
            </p>
          )}
          
          {/* Help text when has polygons but none selected */}
          {allPolygons.length > 0 && !selectedPolygonId && (
            <p className="text-xs text-muted-foreground text-center">
              Selecione um polígono para editar
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
