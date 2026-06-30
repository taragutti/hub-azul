import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { labelSubsetor, labelEstagio } from '@/lib/referencias';

// Chat de IA restrito aos dados do HUB Azul.
//
// Decisão de design importante: em vez de deixar o modelo responder de memória
// (o que abriria espaço para alucinação sobre empresas/investidores que não existem
// na base), toda pergunta primeiro busca dados reais via tool use, e o modelo só
// formula a resposta em cima do que veio do banco. Isso é o que diferencia este chat
// do modelo de referência (que também restringe a IA aos dados próprios da plataforma).

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const tools: Anthropic.Tool[] = [
  {
    name: 'buscar_empresas',
    description: 'Busca empresas cadastradas no HUB Azul, com filtros opcionais por subsetor, UF e texto livre.',
    input_schema: {
      type: 'object',
      properties: {
        subsetor: { type: 'string', description: 'Código do subsetor, ex: AQUICULTURA_PESCA' },
        uf: { type: 'string', description: 'Sigla do estado, ex: BA' },
        busca: { type: 'string', description: 'Texto livre para buscar no nome da empresa' },
      },
    },
  },
  {
    name: 'buscar_investidores',
    description: 'Busca investidores cadastrados no HUB Azul, com filtros opcionais por subsetor de interesse e se é estrangeiro.',
    input_schema: {
      type: 'object',
      properties: {
        subsetor: { type: 'string', description: 'Código do subsetor de interesse' },
        estrangeiro: { type: 'boolean', description: 'Filtrar apenas investidores estrangeiros' },
      },
    },
  },
  {
    name: 'estatisticas_ecossistema',
    description: 'Retorna estatísticas agregadas do ecossistema: contagem de empresas por subsetor e por UF, total de investidores e oportunidades ativas.',
    input_schema: { type: 'object', properties: {} },
  },
];

async function executarFerramenta(name: string, input: Record<string, unknown>) {
  switch (name) {
    case 'buscar_empresas': {
      const where: Record<string, unknown> = {};
      if (input.subsetor) where.subsetor = input.subsetor;
      if (input.uf) where.uf = input.uf;
      if (input.busca) {
        where.OR = [
          { razaoSocial: { contains: input.busca as string, mode: 'insensitive' } },
          { nomeFantasia: { contains: input.busca as string, mode: 'insensitive' } },
        ];
      }
      const empresas = await prisma.empresa.findMany({ where, take: 20 });
      return empresas.map((e) => ({
        nome: e.nomeFantasia || e.razaoSocial,
        subsetor: labelSubsetor(e.subsetor),
        estagio: labelEstagio(e.estagio),
        uf: e.uf,
        municipio: e.municipio,
        buscaCapital: e.buscaCapital,
      }));
    }
    case 'buscar_investidores': {
      const where: Record<string, unknown> = {};
      if (input.subsetor) where.subsetoresInteresse = { has: input.subsetor };
      if (input.estrangeiro === true) where.estrangeiro = true;
      const investidores = await prisma.investidor.findMany({ where, take: 20 });
      return investidores.map((i) => ({
        nome: i.nome,
        tipo: i.tipo,
        pais: i.pais,
        subsetoresInteresse: i.subsetoresInteresse.map(labelSubsetor),
        ticketMinimo: i.ticketMinimo,
        ticketMaximo: i.ticketMaximo,
      }));
    }
    case 'estatisticas_ecossistema': {
      const [porSubsetor, porUf, totalInvestidores, totalOportunidades] = await Promise.all([
        prisma.empresa.groupBy({ by: ['subsetor'], _count: true }),
        prisma.empresa.groupBy({ by: ['uf'], _count: true }),
        prisma.investidor.count(),
        prisma.oportunidade.count({ where: { ativa: true } }),
      ]);
      return {
        empresasPorSubsetor: porSubsetor.map((s) => ({ subsetor: labelSubsetor(s.subsetor), total: s._count })),
        empresasPorUf: porUf.map((u) => ({ uf: u.uf, total: u._count })),
        totalInvestidores,
        oportunidadesAtivas: totalOportunidades,
      };
    }
    default:
      return { erro: 'Ferramenta desconhecida' };
  }
}

const SYSTEM_PROMPT = `Você é o assistente de dados do HUB Azul, uma plataforma de inteligência sobre o ecossistema brasileiro de economia azul (aquicultura, biotecnologia marinha, energia oceânica, óleo e gás offshore, portos e logística marítima, turismo costeiro, e monitoramento/conservação marinha).

Responda SEMPRE com base nos dados retornados pelas ferramentas disponíveis — nunca invente empresas, investidores ou números que não vieram de uma chamada de ferramenta. Se a base não tiver dados suficientes para responder, diga isso claramente em vez de especular.

Seja objetivo e cite números e nomes reais retornados pelas ferramentas. Responda em português do Brasil.`;

export async function POST(req: NextRequest) {
  const { pergunta, empresaId } = await req.json();

  if (!pergunta || typeof pergunta !== 'string') {
    return NextResponse.json({ erro: 'Campo pergunta é obrigatório' }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { erro: 'ANTHROPIC_API_KEY não configurada no servidor. Veja .env.example.' },
      { status: 500 }
    );
  }

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: pergunta }];

  let resposta = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools,
    messages,
  });

  // Loop simples de tool use: o modelo pode pedir até algumas ferramentas em sequência
  // antes de formular a resposta final.
  let iteracoes = 0;
  while (resposta.stop_reason === 'tool_use' && iteracoes < 4) {
    iteracoes += 1;
    const toolUseBlocks = resposta.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      const resultado = await executarFerramenta(block.name, block.input as Record<string, unknown>);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(resultado),
      });
    }

    messages.push({ role: 'assistant', content: resposta.content });
    messages.push({ role: 'user', content: toolResults });

    resposta = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });
  }

  const textoFinal = resposta.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  await prisma.chatLog.create({
    data: { pergunta, resposta: textoFinal, empresaId: empresaId || null },
  });

  return NextResponse.json({ resposta: textoFinal });
}
