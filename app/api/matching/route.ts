import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recalcularMatchesDaEmpresa } from '@/lib/matching';

export const dynamic = "force-dynamic";

// GET /api/matching?empresaId=xxx — retorna oportunidades e investidores compatíveis, ordenados por score
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const empresaId = searchParams.get('empresaId');

  if (!empresaId) {
    return NextResponse.json({ erro: 'Parâmetro empresaId é obrigatório' }, { status: 400 });
  }

  const matches = await prisma.match.findMany({
    where: { empresaId },
    include: { investidor: true, oportunidade: true },
    orderBy: { score: 'desc' },
  });

  return NextResponse.json({ matches, total: matches.length });
}

// POST /api/matching — força recálculo de matches de uma empresa (botão "atualizar" no front)
export async function POST(req: NextRequest) {
  const { empresaId } = await req.json();

  if (!empresaId) {
    return NextResponse.json({ erro: 'Campo empresaId é obrigatório' }, { status: 400 });
  }

  const totalMatches = await recalcularMatchesDaEmpresa(empresaId);

  return NextResponse.json({ totalMatches });
}
