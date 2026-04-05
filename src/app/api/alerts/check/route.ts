import { NextRequest, NextResponse } from 'next/server';
import { ref, get } from 'firebase/database';
import { database, isFirebaseConfigured } from '@/lib/firebase';
import { db } from '@/lib/db';
import { checkAllAnimalsInPolygons, formatAlertMessage, PolygonWithAlerts, AnimalPosition } from '@/lib/alerts';

// Armazena o estado anterior de cada animal (em memória)
// Em produção, isso deveria ser persistido no banco
const previousStates = new Map<string, Set<string>>();

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseConfigured || !database) {
      return NextResponse.json({ error: 'Firebase não configurado' }, { status: 500 });
    }

    // 1. Buscar todos os usuários com seus polígonos
    const users = await db.user.findMany({
      include: {
        polygons: {
          where: { isActive: true }
        },
        animals: true
      }
    });

    if (users.length === 0) {
      return NextResponse.json({ message: 'Nenhum usuário encontrado', events: [] });
    }

    // 2. Coletar todos os códigos de animais únicos
    const allAnimalCodes = new Set<string>();
    users.forEach(user => {
      user.animals.forEach(animal => allAnimalCodes.add(animal.animalCode));
    });

    // 3. Buscar posições atuais dos animais no Firebase
    const animalPositions: AnimalPosition[] = [];
    
    for (const codigo of allAnimalCodes) {
      const animalRef = ref(database, `animaisVPJS/${codigo}`);
      const snapshot = await get(animalRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          animalPositions.push({
            codigo,
            nome: data.nomeVPJS || data.nome || codigo,
            latitude: data.latitude,
            longitude: data.longitude,
            timestamp: data.timestamp || Date.now(),
          });
        }
      }
    }

    if (animalPositions.length === 0) {
      return NextResponse.json({ message: 'Nenhum animal com posição encontrada', events: [] });
    }

    // 4. Verificar cada usuário separadamente
    const allEvents: any[] = [];

    for (const user of users) {
      if (user.polygons.length === 0) continue;

      // Converter polígonos do formato DB
      const polygons: PolygonWithAlerts[] = user.polygons.map(p => ({
        id: p.id,
        userId: p.userId,
        name: p.name,
        color: p.color,
        vertices: JSON.parse(p.vertices),
        alertOnExit: p.alertOnExit,
        alertOnEntry: p.alertOnEntry,
        isActive: p.isActive,
      }));

      // Filtrar apenas animais deste usuário
      const userAnimalCodes = new Set(user.animals.map(a => a.animalCode));
      const userAnimals = animalPositions.filter(a => userAnimalCodes.has(a.codigo));

      // Estado anterior para este usuário
      const userPreviousStates = new Map<string, Set<string>>();
      userAnimalCodes.forEach(code => {
        const state = previousStates.get(`${user.firebaseUid}_${code}`);
        if (state) userPreviousStates.set(code, state);
      });

      // Verificar
      const { events, newStates } = checkAllAnimalsInPolygons(
        userAnimals,
        polygons,
        userPreviousStates
      );

      // Atualizar estados
      newStates.forEach((polygons, code) => {
        previousStates.set(`${user.firebaseUid}_${code}`, polygons);
      });

      // Adicionar informações do usuário aos eventos
      events.forEach(event => {
        allEvents.push({
          ...event,
          userEmail: user.email,
          userId: user.id,
        });
      });

      // 5. Enviar emails para cada evento
      for (const event of events) {
        try {
          // Salvar alerta no banco
          const alert = await db.alert.create({
            data: {
              userId: user.id,
              polygonId: event.polygonId,
              animalCode: event.animalCode,
              animalName: event.animalName,
              type: event.eventType,
              message: formatAlertMessage(
                event.animalName || '',
                event.animalCode,
                event.polygonName,
                event.eventType
              ),
            }
          });

          // Enviar email via API interna
          const appUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}` 
            : 'http://localhost:3000';
            
          await fetch(`${appUrl}/api/alerts/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              alertId: alert.id,
              animalName: event.animalName || event.animalCode,
              animalCode: event.animalCode,
              polygonName: event.polygonName,
              eventType: event.eventType,
              timestamp: Date.now(),
              latitude: animalPositions.find(a => a.codigo === event.animalCode)?.latitude,
              longitude: animalPositions.find(a => a.codigo === event.animalCode)?.longitude,
            }),
          });

          // Marcar como enviado
          await db.alert.update({
            where: { id: alert.id },
            data: { emailSent: true, sentAt: new Date() }
          });

        } catch (emailError) {
          console.error('Erro ao enviar email:', emailError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      checkedAt: new Date().toISOString(),
      animalsChecked: animalPositions.length,
      eventsDetected: allEvents.length,
      events: allEvents,
    });

  } catch (error) {
    console.error('Erro ao verificar alertas:', error);
    return NextResponse.json({
      error: 'Erro ao verificar alertas',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
