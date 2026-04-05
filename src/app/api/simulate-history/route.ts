import { NextRequest, NextResponse } from 'next/server';
import { ref, push, set } from 'firebase/database';
import { database, isFirebaseConfigured } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseConfigured || !database) {
      return NextResponse.json({ error: 'Firebase não configurado' }, { status: 500 });
    }

    const body = await request.json();
    const { codigo, baseLat, baseLng, numPoints } = body;

    if (!codigo || !baseLat || !baseLng) {
      return NextResponse.json({ error: 'Parâmetros obrigatórios: codigo, baseLat, baseLng' }, { status: 400 });
    }

    const pointsCount = numPoints || 20;
    const now = Date.now();
    const intervalMs = 5 * 60 * 1000; // 5 minutos entre cada ponto

    const historyRef = ref(database, `animaisVPJS/${codigo}/historicoVPJS`);
    
    let addedCount = 0;

    for (let i = 0; i < pointsCount; i++) {
      // Criar variação aleatória na posição (simulando movimento)
      // ~50-200 metros de variação
      const latOffset = (Math.random() - 0.5) * 0.004; // ~±200m
      const lngOffset = (Math.random() - 0.5) * 0.004;
      
      const pointLat = baseLat + latOffset;
      const pointLng = baseLng + lngOffset;
      const pointTimestamp = now - (pointsCount - i) * intervalMs;

      const newPointRef = push(historyRef);
      await set(newPointRef, {
        latitude: pointLat,
        longitude: pointLng,
        timestamp: pointTimestamp,
      });
      
      addedCount++;
    }

    return NextResponse.json({ 
      success: true, 
      message: `${addedCount} pontos de histórico simulados para ${codigo}`,
      codigo,
      pointsAdded: addedCount
    });

  } catch (error) {
    console.error('Erro ao simular histórico:', error);
    return NextResponse.json({ 
      error: 'Erro ao simular histórico',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
