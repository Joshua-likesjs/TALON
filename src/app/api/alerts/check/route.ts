import { NextRequest, NextResponse } from 'next/server';
import { ref, get } from 'firebase/database';
import { database, isFirebaseConfigured } from '@/lib/talon/firebase';
import { db } from '@/lib/db';
import { checkAllAnimalsInPolygons, formatAlertMessage, sendAlertEmail, PolygonWithAlerts, AnimalPosition, isInsidePolygon } from '@/lib/talon/alerts';

// Armazena o estado anterior de cada animal (em memória)
const previousStates = new Map<string, Set<string>>();

// Controla se já fez o baseline inicial (para evitar alertas falsos no primeiro check)
const baselineDone = new Set<string>(); // Set<firebaseUid>

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseConfigured || !database) {
      console.error('❌ Firebase não configurado no servidor');
      return NextResponse.json({ error: 'Firebase não configurado' }, { status: 500 });
    }

    // 1. Buscar todos os usuários com seus polígonos e animais
    const users = await db.user.findMany({
      include: {
        polygons: {
          where: { isActive: true }
        },
        animals: true
      }
    });

    console.log(`📊 Check: ${users.length} usuários no Prisma`);

    if (users.length === 0) {
      return NextResponse.json({ message: 'Nenhum usuário encontrado', events: [] });
    }

    // Log detalhado por usuário
    users.forEach(user => {
      console.log(`👤 Usuário: ${user.email} | Polígonos: ${user.polygons.length} | Animais: ${user.animals.length}`);
      user.animals.forEach(a => console.log(`   🐾 Animal: ${a.animalCode} (${a.animalName || 'sem nome'})`));
    });

    // 2. Coletar todos os códigos de animais únicos
    const allAnimalCodes = new Set<string>();
    users.forEach(user => {
      user.animals.forEach(animal => allAnimalCodes.add(animal.animalCode));
    });

    console.log(`📊 Check: ${allAnimalCodes.size} códigos de animais únicos:`, [...allAnimalCodes]);

    if (allAnimalCodes.size === 0) {
      return NextResponse.json({
        message: 'Nenhum animal sincronizado no Prisma. Os animais precisam ser sincronizados para que os alertas funcionem.',
        events: [],
        debug: { usersFound: users.length, animalsInPrisma: 0 }
      });
    }

    // 3. Buscar posições atuais dos animais no Firebase
    const animalPositions: AnimalPosition[] = [];
    
    for (const codigo of allAnimalCodes) {
      try {
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
            console.log(`📍 ${codigo}: (${data.latitude}, ${data.longitude})`);
          } else {
            console.log(`⚠️ ${codigo}: sem coordenadas válidas no Firebase`);
          }
        } else {
          console.log(`⚠️ ${codigo}: não encontrado no Firebase`);
        }
      } catch (fbError) {
        console.error(`❌ Erro ao buscar ${codigo} no Firebase:`, fbError);
      }
    }

    if (animalPositions.length === 0) {
      return NextResponse.json({
        message: 'Nenhum animal com posição encontrada',
        events: [],
        debug: { usersFound: users.length, animalsInPrisma: allAnimalCodes.size, animalsWithPosition: 0 }
      });
    }

    console.log(`📊 Check: ${animalPositions.length} animais com posição`);

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

      console.log(`👤 ${user.email}: verificando ${userAnimals.length} animais contra ${polygons.length} polígonos`);

      // ── BASELINE: na primeira verificação, registrar onde cada animal já está
      // sem disparar alertas (evita falsos "entrou em" quando o servidor reinicia)
      const needsBaseline = !baselineDone.has(user.firebaseUid);
      
      if (needsBaseline) {
        console.log(`🔄 Baseline para ${user.email} — registrando estado inicial sem disparar alertas`);
        
        for (const animal of userAnimals) {
          const insidePolygons = new Set<string>();
          for (const polygon of polygons) {
            if (!polygon.isActive) continue;
            if (isInsidePolygon(animal.latitude, animal.longitude, polygon.vertices)) {
              insidePolygons.add(polygon.id);
            }
          }
          previousStates.set(`${user.firebaseUid}_${animal.codigo}`, insidePolygons);
          console.log(`   🔄 ${animal.codigo}: já está dentro de ${insidePolygons.size} polígonos`);
        }
        
        baselineDone.add(user.firebaseUid);
        // Na primeira verificação, NÃO disparar alertas — só registrar o estado inicial
        continue;
      }

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

      if (events.length > 0) {
        console.log(`🚨 ${events.length} evento(s) detectado(s) para ${user.email}`);
      }

      // 5. Enviar emails para cada evento
      for (const event of events) {
        try {
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

          console.log(`💾 Alerta salvo: ${event.animalName} ${event.eventType === 'entry' ? 'entrou em' : 'saiu de'} ${event.polygonName}`);

          const animalPos = animalPositions.find(a => a.codigo === event.animalCode);
          const emailResult = await sendAlertEmail({
            email: user.email,
            animalName: event.animalName || event.animalCode,
            animalCode: event.animalCode,
            polygonName: event.polygonName,
            eventType: event.eventType,
            timestamp: Date.now(),
            latitude: animalPos?.latitude,
            longitude: animalPos?.longitude,
          });

          if (emailResult.success && !emailResult.simulated) {
            await db.alert.update({
              where: { id: alert.id },
              data: { emailSent: true, sentAt: new Date() }
            });
            console.log(`📧 Email enviado para ${user.email}`);
          } else if (emailResult.simulated) {
            console.log(`📧 Alerta ${alert.id}: email simulado (EmailJS não configurado)`);
          } else {
            console.error(`📧 Alerta ${alert.id}: falha ao enviar email - ${emailResult.error}`);
          }

        } catch (emailError) {
          console.error('Erro ao processar alerta:', emailError);
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