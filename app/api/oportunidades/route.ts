import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/oportunidades?subsetor=AQUICULTURA_PESCA&ativa=true
export async function GET(req: NextRequest) {
  const { prisma } = await import('@/lib/prisma');

  const { searchParams } = new URL(req.url);
  const subsetor = searchParams.get('subsetor');
  const ativa = searchParams.get('ativa');

  const where: any = {};

  if (subsetor) where.subsetoresAlvo = { has: subsetor };
  if (ativa !== 'false') where.ativa = true;

  const oportunidades = await prisma.oportunidade.findMany({
    where,
    orderBy: { prazoInscricao: 'asc' },
    take: 100,
  });

  return NextResponse.json({
    oportunidades,
    total: oportunidades.length,
  });
}

const oportunidadeSchema = z.object({
  titulo: z.string().min(3),
  descricao: z.string().min(10),
  tipo: z.enum(['EDITAL_PUBLICO', 'RODADA_INVESTIMENTO', 'PARCERIA', 'EVENTO']),
  fonte: z.string().min(2),
  subsetoresAlvo: z.array(z.string()).min(1),
  estagiosAlvo: z.array(z.string()).optional(),
  valorMinimo: z.number().positive().optional(),
  valorMaximo: z.number().positive().optional(),
  prazoInscricao: z.string().datetime().optional(),
  url: z.string().url().optional().or(z.literal('')),
});

// POST /api/oportunidades — cadastro de nova oportunidade
export async function POST(req: NextRequest) {
  const { prisma } = await import('@/lib/prisma');
  const { recalcularMatchesDaOportunidade } = await import('@/lib/matching');

  const body = await req.json();
  const parsed = oportunidadeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { erro: 'Dados inválidos', detalhes: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const oportunidade = await prisma.oportunidade.create({
    data: {
      titulo: data.titulo,
      descricao: data.descricao,
      tipo: data.tipo as any,
      fonte: data.fonte,
      subsetoresAlvo: data.subsetoresAlvo as any,
      estagiosAlvo: (data.estagiosAlvo ?? []) as any,
      valorMinimo: data.valorMinimo ?? null,
      valorMaximo: data.valorMaximo ?? null,
      prazoInscricao: data.prazoInscricao ? new Date(data.prazoInscricao) : null,
      url: data.url || null,
    },
  });

  const totalMatches = await recalcularMatchesDaOportunidade(oportunidade.id);

  return NextResponse.json(
    {
      oportunidade,
      empresasNotificadas: totalMatches,
    },
    { status: 201 }
  );
}
