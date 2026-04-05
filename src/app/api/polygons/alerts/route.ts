import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Buscar configurações de alerta dos polígonos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const firebaseUid = searchParams.get('firebaseUid');

    if (!firebaseUid) {
      return NextResponse.json({ error: 'firebaseUid é obrigatório' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { firebaseUid },
      include: {
        polygons: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      polygons: user.polygons.map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        alertOnExit: p.alertOnExit,
        alertOnEntry: p.alertOnEntry,
        isActive: p.isActive,
      }))
    });

  } catch (error) {
    console.error('Erro ao buscar polígonos:', error);
    return NextResponse.json({
      error: 'Erro ao buscar polígonos',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// Atualizar configurações de alerta de um polígono
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { polygonId, alertOnExit, alertOnEntry, isActive } = body;

    if (!polygonId) {
      return NextResponse.json({ error: 'polygonId é obrigatório' }, { status: 400 });
    }

    const polygon = await db.polygon.update({
      where: { id: polygonId },
      data: {
        ...(alertOnExit !== undefined && { alertOnExit }),
        ...(alertOnEntry !== undefined && { alertOnEntry }),
        ...(isActive !== undefined && { isActive }),
      }
    });

    return NextResponse.json({
      success: true,
      polygon: {
        id: polygon.id,
        name: polygon.name,
        alertOnExit: polygon.alertOnExit,
        alertOnEntry: polygon.alertOnEntry,
        isActive: polygon.isActive,
      }
    });

  } catch (error) {
    console.error('Erro ao atualizar polígono:', error);
    return NextResponse.json({
      error: 'Erro ao atualizar polígono',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// Criar novo polígono com configurações de alerta
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firebaseUid, name, color, vertices, alertOnExit, alertOnEntry } = body;

    if (!firebaseUid || !name || !vertices) {
      return NextResponse.json({ error: 'firebaseUid, name e vertices são obrigatórios' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { firebaseUid }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const polygon = await db.polygon.create({
      data: {
        userId: user.id,
        name,
        color: color || '#585c2b',
        vertices: JSON.stringify(vertices),
        alertOnExit: alertOnExit ?? true,
        alertOnEntry: alertOnEntry ?? true,
      }
    });

    return NextResponse.json({
      success: true,
      polygon: {
        id: polygon.id,
        name: polygon.name,
        color: polygon.color,
        alertOnExit: polygon.alertOnExit,
        alertOnEntry: polygon.alertOnEntry,
      }
    });

  } catch (error) {
    console.error('Erro ao criar polígono:', error);
    return NextResponse.json({
      error: 'Erro ao criar polígono',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
