import { NextRequest, NextResponse } from 'next/server';
import { sendAlertEmail, formatEmailSubject } from '@/lib/talon/alerts';

// Este endpoint ainda existe para chamadas manuais/externas,
// mas o /api/alerts/check agora chama sendAlertEmail() diretamente.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      animalName,
      animalCode,
      polygonName,
      eventType,
      timestamp,
      latitude,
      longitude,
    } = body;

    if (!email || !animalName || !polygonName || !eventType) {
      return NextResponse.json({ error: 'Parâmetros obrigatórios faltando' }, { status: 400 });
    }

    const result = await sendAlertEmail({
      email,
      animalName,
      animalCode,
      polygonName,
      eventType,
      timestamp,
      latitude,
      longitude,
    });

    if (!result.success) {
      return NextResponse.json({
        error: 'Erro ao enviar email',
        details: result.error,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      simulated: result.simulated || false,
      emailId: result.emailId,
      to: email,
      subject: formatEmailSubject(animalName, animalCode, polygonName, eventType),
      provider: 'emailjs',
    });

  } catch (error) {
    console.error('Erro no envio de email:', error);
    return NextResponse.json({
      error: 'Erro no envio de email',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
