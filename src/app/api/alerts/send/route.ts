import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { formatEmailSubject, formatEmailBody } from '@/lib/alerts';

// Inicializar Resend (requer RESEND_API_KEY no .env.local)
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      alertId,
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

    // Verificar se a API key do Resend está configurada
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ RESEND_API_KEY não configurada - simulando envio de email');
      console.log(`📧 Email simulado para ${email}:`);
      console.log(`   Assunto: ${formatEmailSubject(animalName, animalCode, polygonName, eventType)}`);
      
      return NextResponse.json({
        success: true,
        simulated: true,
        message: 'Email simulado (RESEND_API_KEY não configurada)',
        to: email,
        subject: formatEmailSubject(animalName, animalCode, polygonName, eventType),
      });
    }

    // Enviar email usando Resend
    const { data, error } = await resend.emails.send({
      from: 'TALON Alerts <alerts@talon.app>', // Substitua pelo seu domínio verificado
      to: email,
      subject: formatEmailSubject(animalName, animalCode, polygonName, eventType),
      html: formatEmailBody(
        animalName,
        animalCode,
        polygonName,
        eventType,
        timestamp || Date.now(),
        latitude,
        longitude
      ),
    });

    if (error) {
      console.error('Erro ao enviar email:', error);
      return NextResponse.json({
        error: 'Erro ao enviar email',
        details: error.message
      }, { status: 500 });
    }

    console.log(`✅ Email enviado para ${email}: ${data?.id}`);

    return NextResponse.json({
      success: true,
      emailId: data?.id,
      to: email,
    });

  } catch (error) {
    console.error('Erro no envio de email:', error);
    return NextResponse.json({
      error: 'Erro no envio de email',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
