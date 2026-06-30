import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/empresas/[id] — perfil completo da empresa + matches associados
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const empresa = await prisma.empresa.findUnique({
    where: { id: params.id },
    include: {
      matches: {
        include: { investidor: true, oportunidade: true },
        orderBy: { score: 'desc' },
      },
    },
  });

  if (!empresa) {
    return NextResponse.json({ erro: 'Empresa não encontrada' }, { status: 404 });
  }

  return NextResponse.json({ empresa });
}
