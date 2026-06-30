import { NextRequest, NextResponse } from 'next/server';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/empresas/[id]
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { prisma } = await import('@/lib/prisma');

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
