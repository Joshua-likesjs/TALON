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

// Formatar corpo do email em HTML (mantido para referência/preview)
// Com EmailJS, o template é gerenciado no dashboard do EmailJS
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
        .header { background: linear-gradient(135deg, #585c2b 0%, #7a8238 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
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

// ─────────────────────────────────────────────────────────────────
// Envio de email via EmailJS (chamada direta, sem HTTP fetch interno)
// ─────────────────────────────────────────────────────────────────

interface SendAlertEmailOptions {
  email: string;
  animalName: string;
  animalCode: string;
  polygonName: string;
  eventType: 'entry' | 'exit';
  timestamp?: number;
  latitude?: number;
  longitude?: number;
}

export interface SendAlertEmailResult {
  success: boolean;
  simulated?: boolean;
  emailId?: string;
  error?: string;
}

/**
 * Envia um email de alerta via EmailJS REST API.
 * Esta função é chamada DIRETAMENTE pelo servidor, sem precisar de fetch HTTP interno.
 */
export async function sendAlertEmail(options: SendAlertEmailOptions): Promise<SendAlertEmailResult> {
  const { email, animalName, animalCode, polygonName, eventType } = options;

  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  // Verificar se o EmailJS está configurado
  if (!serviceId || !templateId || !publicKey) {
    console.log('⚠️ EmailJS não configurado - simulando envio de email');
    console.log(`📧 Email simulado para ${email}:`);
    console.log(`   Assunto: ${formatEmailSubject(animalName, animalCode, polygonName, eventType)}`);
    return {
      success: true,
      simulated: true,
      error: 'EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID ou EMAILJS_PUBLIC_KEY não configurados',
    };
  }

  // Montar parâmetros do template
  const templateParams = buildEmailJSTemplateParams(options);

  // Montar payload para a API REST do EmailJS
  const payload: Record<string, string | undefined | Record<string, string>> = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: templateParams,
  };

  // Incluir accessToken para uso server-side (mais seguro)
  if (privateKey) {
    payload.accessToken = privateKey;
  }

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro ao enviar email via EmailJS:', errorText);
      return { success: false, error: errorText };
    }

    const resultText = await response.text();
    console.log(`✅ Email enviado via EmailJS para ${email}: ${resultText}`);
    return { success: true, emailId: resultText };

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('❌ Erro no envio de email:', err);
    return { success: false, error: message };
  }
}

// Gerar parâmetros para o template do EmailJS
// Essas variáveis devem corresponder às configuradas no template do dashboard EmailJS
export function buildEmailJSTemplateParams(options: {
  email: string;
  animalName: string;
  animalCode: string;
  polygonName: string;
  eventType: 'entry' | 'exit';
  timestamp?: number;
  latitude?: number;
  longitude?: number;
}): Record<string, string> {
  const {
    email,
    animalName,
    animalCode,
    polygonName,
    eventType,
    timestamp,
    latitude,
    longitude,
  } = options;

  const action = eventType === 'entry' ? 'entrou na área' : 'saiu da área';
  const date = new Date(timestamp || Date.now()).toLocaleString('pt-BR');
  const coordinates = latitude && longitude
    ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
    : 'Não disponível';

  return {
    to_email: email,
    animal_name: animalName || animalCode,
    animal_code: animalCode,
    polygon_name: polygonName,
    event_type: eventType === 'entry' ? 'Entrada' : 'Saída',
    event_action: action,
    date_time: date,
    coordinates,
    alert_subject: formatEmailSubject(animalName, animalCode, polygonName, eventType),
  };
}
