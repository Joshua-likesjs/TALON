import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Sincronizar animal do usuário (adicionar)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firebaseUid, animalCode, animalName } = body;

    if (!firebaseUid || !animalCode) {
      return NextResponse.json({ error: 'firebaseUid e animalCode são obrigatórios' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { firebaseUid }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Criar ou atualizar relação usuário-animal
    const userAnimal = await db.userAnimal.upsert({
      where: {
        userId_animalCode: {
          userId: user.id,
          animalCode,
        }
      },
      update: {
        animalName: animalName || null,
      },
      create: {
        userId: user.id,
        animalCode,
        animalName: animalName || null,
      }
    });

    return NextResponse.json({
      success: true,
      userAnimal: {
        id: userAnimal.id,
        animalCode: userAnimal.animalCode,
        animalName: userAnimal.animalName,
      }
    });

  } catch (error) {
    console.error('Erro ao sincronizar animal:', error);
    return NextResponse.json({
      error: 'Erro ao sincronizar animal',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// Remover animal do usuário
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { firebaseUid, animalCode } = body;

    if (!firebaseUid || !animalCode) {
      return NextResponse.json({ error: 'firebaseUid e animalCode são obrigatórios' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { firebaseUid }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    await db.userAnimal.delete({
      where: {
        userId_animalCode: {
          userId: user.id,
          animalCode,
        }
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro ao remover animal:', error);
    return NextResponse.json({
      error: 'Erro ao remover animal',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
