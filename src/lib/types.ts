// Tipos compartilhados do GeoFence App

export interface Point {
  latitude: number;
  longitude: number;
}

export interface LocalPolygon {
  id: string;
  nome: string;
  cor: string;
  vertices: Point[];
}

// Cores disponíveis para polígonos
export const POLYGON_COLORS = [
  { nome: 'Verde', cor: '#22c55e' },
  { nome: 'Azul', cor: '#3b82f6' },
  { nome: 'Vermelho', cor: '#ef4444' },
  { nome: 'Roxo', cor: '#a855f7' },
  { nome: 'Laranja', cor: '#f97316' },
  { nome: 'Rosa', cor: '#ec4899' },
  { nome: 'Amarelo', cor: '#eab308' },
  { nome: 'Ciano', cor: '#06b6d4' },
];
