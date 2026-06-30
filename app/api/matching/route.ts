import { NextRequest, NextResponse } from 'next/server';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/matching?empresaId=xxx
export async function GET(req: NextRequest) {
  const { prisma } = await import('@/lib/prisma');

  const { searchParams } = new URL(req.url);
  const empresaId = searchParams.get('empresaId');

  if (!empresaId) {
    return NextResponse.json(
      { erro: 'Parâmetro empresaId é obrigatório' },
      { status: 400 }
    );
  }

  const matches = await prisma.match.findMany({
    where: { empresaId },
    include: {
      investidor: true,
      oportunidade: true,
    },
    orderBy: { score: 'desc' },
  });

  return NextResponse.json({
    matches,
    total: matches.length,
  });
}

// POST /api/matching — força recálculo de matches de uma empresa
export async function POST(req: NextRequest) {
  const { recalcularMatchesDaEmpresa } = await import('@/lib/matching');

  const { empresaId } = await req.json();

  if (!empresaId) {
    return NextResponse.json(
      { erro: 'Campo empresaId é obrigatório' },
      { status: 400 }
    );
  }

  const totalMatches = await recalcularMatchesDaEmpresa(empresaId);

  return NextResponse.json({ totalMatches });
}
