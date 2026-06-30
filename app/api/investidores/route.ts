import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// GET /api/investidores?subsetor=AQUICULTURA_PESCA&estrangeiro=true
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const subsetor = searchParams.get('subsetor');
  const estrangeiro = searchParams.get('estrangeiro');

  const where: Record<string, unknown> = {};
  if (subsetor) where.subsetoresInteresse = { has: subsetor };
  if (estrangeiro === 'true') where.estrangeiro = true;

  const investidores = await prisma.investidor.findMany({
    where,
    orderBy: { criadoEm: 'desc' },
    take: 100,
  });

  return NextResponse.json({ investidores, total: investidores.length });
}

const investidorSchema = z.object({
  nome: z.string().min(2),
  tipo: z.string().min(2),
  pais: z.string().default('Brasil'),
  estrangeiro: z.boolean().default(false),
  descricao: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  subsetoresInteresse: z.array(z.string()).min(1),
  estagiosInteresse: z.array(z.string()).optional(),
  ticketMinimo: z.number().positive().optional(),
  ticketMaximo: z.number().positive().optional(),
});

// POST /api/investidores — auto-cadastro de investidor
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = investidorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const investidor = await prisma.investidor.create({
    data: {
      nome: data.nome,
      tipo: data.tipo,
      pais: data.pais,
      estrangeiro: data.estrangeiro,
      descricao: data.descricao || null,
      website: data.website || null,
      email: data.email || null,
      subsetoresInteresse: data.subsetoresInteresse as never,
      estagiosInteresse: (data.estagiosInteresse ?? []) as never,
      ticketMinimo: data.ticketMinimo ?? null,
      ticketMaximo: data.ticketMaximo ?? null,
    },
  });

  return NextResponse.json({ investidor }, { status: 201 });
}
