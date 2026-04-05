import { isPointInPolygon } from 'geolib';

// Tipos para vértices de polígonos
export interface Vertex {
  latitude: number;
  longitude: number;
}

// Tipo para posição de animal
export interface AnimalPosition {
  codigo: string;
  nome?: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

// Tipo para polígono com configurações de alerta
export interface PolygonWithAlerts {
  id: string;
  userId: string;
  name: string;
  color: string;
  vertices: Vertex[];
  alertOnExit: boolean;
  alertOnEntry: boolean;
  isActive: boolean;
}

// Tipo para resultado de verificação
export interface CheckResult {
  animalCode: string;
  animalName?: string;
  polygonId: string;
  polygonName: string;
  eventType: 'entry' | 'exit';
  userEmail: string;
  userId: string;
}

// Verificar se um ponto está dentro de um polígono
export function isInsidePolygon(lat: number, lng: number, vertices: Vertex[]): boolean {
  if (vertices.length < 3) return false;
  
  return isPointInPolygon(
    { latitude: lat, longitude: lng },
    vertices.map(v => ({ latitude: v.latitude, longitude: v.longitude }))
  );
}

// Verificar todos os animais contra todos os polígonos
export function checkAllAnimalsInPolygons(
  animals: AnimalPosition[],
  polygons: PolygonWithAlerts[],
  previousStates: Map<string, Set<string>> // Map<animalCode, Set<polygonId>>
): { events: CheckResult[]; newStates: Map<string, Set<string>> } {
  
  const events: CheckResult[] = [];
  const newStates = new Map<string, Set<string>>();

  for (const animal of animals) {
    const currentPolygons = new Set<string>();
    const previousPolygons = previousStates.get(animal.codigo) || new Set<string>();

    for (const polygon of polygons) {
      if (!polygon.isActive) continue;

      const isInside = isInsidePolygon(animal.latitude, animal.longitude, polygon.vertices);
      
      if (isInside) {
        currentPolygons.add(polygon.id);
        
        // Detectar ENTRADA (não estava antes, está agora)
        if (!previousPolygons.has(polygon.id) && polygon.alertOnEntry) {
          events.push({
            animalCode: animal.codigo,
            animalName: animal.nome,
            polygonId: polygon.id,
            polygonName: polygon.name,
            eventType: 'entry',
            userEmail: '', // Será preenchido depois
            userId: '', // Será preenchido depois
          });
        }
      } else {
        // Detectar SAÍDA (estava antes, não está mais)
        if (previousPolygons.has(polygon.id) && polygon.alertOnExit) {
          events.push({
            animalCode: animal.codigo,
            animalName: animal.nome,
            polygonId: polygon.id,
            polygonName: polygon.name,
            eventType: 'exit',
            userEmail: '', // Será preenchido depois
            userId: '', // Será preenchido depois
          });
        }
      }
    }

    newStates.set(animal.codigo, currentPolygons);
  }

  return { events, newStates };
}

// Formatar mensagem de alerta
export function formatAlertMessage(
  animalName: string,
  animalCode: string,
  polygonName: string,
  eventType: 'entry' | 'exit'
): string {
  const action = eventType === 'entry' ? 'entrou na área' : 'saiu da área';
  return `🚨 ALERTA: O animal ${animalName || animalCode} ${action} "${polygonName}"`;
}

// Formatar assunto do email
export function formatEmailSubject(
  animalName: string,
  animalCode: string,
  polygonName: string,
  eventType: 'entry' | 'exit'
): string {
  const action = eventType === 'entry' ? 'entrou em' : 'saiu de';
  return `TALON Alert: ${animalName || animalCode} ${action} ${polygonName}`;
}

// Formatar corpo do email em HTML
export function formatEmailBody(
  animalName: string,
  animalCode: string,
  polygonName: string,
  eventType: 'entry' | 'exit',
  timestamp: number,
  latitude?: number,
  longitude?: number
): string {
  const action = eventType === 'entry' ? 'entrou na área' : 'saiu da área';
  const actionColor = eventType === 'entry' ? '#22c55e' : '#ef4444';
  const date = new Date(timestamp).toLocaleString('pt-BR');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .alert-box { background: white; border-left: 4px solid ${actionColor}; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        .logo { font-size: 24px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🦅 TALON</div>
          <p>Sistema de Rastreamento de Animais</p>
        </div>
        <div class="content">
          <h2>⚠️ Alerta de Geofencing</h2>
          <div class="alert-box">
            <strong>${animalName || animalCode}</strong> ${action} <strong>"${polygonName}"</strong>
          </div>
          <p><strong>Data/Hora:</strong> ${date}</p>
          ${latitude && longitude ? `<p><strong>Coordenadas:</strong> ${latitude.toFixed(6)}, ${longitude.toFixed(6)}</p>` : ''}
          <p>Acesse o aplicativo para mais detalhes.</p>
        </div>
        <div class="footer">
          <p>Este é um email automático do sistema TALON.</p>
          <p>Para mais informações, acesse seu painel de controle.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
