import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/empresas?subsetor=AQUICULTURA_PESCA&uf=BA&municipio=Salvador&busca=texto
export async function GET(req: NextRequest) {
  const { prisma } = await import('@/lib/prisma');

  const { searchParams } = new URL(req.url);
  const subsetor = searchParams.get('subsetor');
  const uf = searchParams.get('uf');
  const municipio = searchParams.get('municipio');
  const busca = searchParams.get('busca');

  const where: Record<string, unknown> = {};

  if (subsetor) where.subsetor = subsetor;
  if (uf) where.uf = uf;
  if (municipio) where.municipio = municipio;

  if (busca) {
    where.OR = [
      { razaoSocial: { contains: busca, mode: 'insensitive' } },
      { nomeFantasia: { contains: busca, mode: 'insensitive' } },
    ];
  }

  const empresas = await prisma.empresa.findMany({
    where,
    orderBy: { criadoEm: 'desc' },
    take: 100,
  });

  return NextResponse.json({ empresas, total: empresas.length });
}

const empresaSchema = z.object({
  razaoSocial: z.string().min(2),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().optional(),
  descricao: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  subsetor: z.enum([
    'AQUICULTURA_PESCA',
    'BIOTECNOLOGIA_MARINHA',
    'ENERGIA_OCEANICA_OFFSHORE',
    'OLEO_GAS_OFFSHORE',
    'PORTOS_LOGISTICA_MARITIMA',
    'TURISMO_COSTEIRO',
    'MONITORAMENTO_CONSERVACAO',
  ]),
  estagio: z.enum([
    'IDEACAO',
    'PRE_OPERACIONAL',
    'SEED',
    'SERIES_A',
    'SERIES_B',
    'SERIES_C_MAIS',
    'GROWTH',
    'ESTABELECIDA',
  ]).optional(),
  uf: z.string().length(2),
  municipio: z.string().min(2),
  buscaCapital: z.boolean().optional(),
  ticketDesejado: z.number().positive().optional(),
});

// POST /api/empresas — auto-cadastro de empresa
export async function POST(req: NextRequest) {
  const { prisma } = await import('@/lib/prisma');
  const { recalcularMatchesDaEmpresa } = await import('@/lib/matching');

  const body = await req.json();
  const parsed = empresaSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { erro: 'Dados inválidos', detalhes: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const empresa = await prisma.empresa.create({
    data: {
      razaoSocial: data.razaoSocial,
      nomeFantasia: data.nomeFantasia || null,
      cnpj: data.cnpj || null,
      descricao: data.descricao || null,
      website: data.website || null,
      email: data.email || null,
      subsetor: data.subsetor,
      estagio: data.estagio || null,
      uf: data.uf.toUpperCase(),
      municipio: data.municipio,
      buscaCapital: data.buscaCapital ?? false,
      ticketDesejado: data.ticketDesejado ?? null,
      origemDado: 'AUTO_CADASTRO',
      perfilCompleto: true,
    },
  });

  recalcularMatchesDaEmpresa(empresa.id).catch((err) =>
    console.error('Falha ao calcular matches para nova empresa', empresa.id, err)
  );

  return NextResponse.json({ empresa }, { status: 201 });
}
