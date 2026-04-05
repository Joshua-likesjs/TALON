import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Sincronizar usuário do Firebase com o banco Prisma
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firebaseUid, email, name } = body;

    if (!firebaseUid || !email) {
      return NextResponse.json({ error: 'firebaseUid e email são obrigatórios' }, { status: 400 });
    }

    // Criar ou atualizar usuário
    const user = await db.user.upsert({
      where: { firebaseUid },
      update: {
        email,
        name: name || null,
      },
      create: {
        firebaseUid,
        email,
        name: name || null,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    });

  } catch (error) {
    console.error('Erro ao sincronizar usuário:', error);
    return NextResponse.json({
      error: 'Erro ao sincronizar usuário',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
