// Motor de matching do HUB Azul.
//
// Regra de negócio: uma empresa é compatível com um investidor ou oportunidade quando
// (a) o subsetor bate, (b) o estágio está dentro do que o investidor/edital aceita, e
// (c) o ticket desejado pela empresa está dentro da faixa oferecida.
// O score é uma soma ponderada simples — fácil de auditar e explicar ao usuário,
// o que importa mais aqui do que um modelo sofisticado.

import { prisma } from './prisma';
import { labelSubsetor, labelEstagio } from './referencias';
import type { Empresa, Investidor, Oportunidade } from '@prisma/client';

const PESO_SUBSETOR = 0.5;
const PESO_ESTAGIO = 0.3;
const PESO_TICKET = 0.2;

function scoreSubsetor(subsetorEmpresa: string, subsetoresAlvo: string[]): number {
  return subsetoresAlvo.includes(subsetorEmpresa) ? 1 : 0;
}

function scoreEstagio(estagioEmpresa: string | null, estagiosAlvo: string[]): number {
  if (!estagioEmpresa) return 0.5; // sem dado, não penaliza nem favorece totalmente
  return estagiosAlvo.length === 0 || estagiosAlvo.includes(estagioEmpresa) ? 1 : 0;
}

function scoreTicket(
  ticketEmpresa: number | null,
  min: number | null,
  max: number | null
): number {
  if (!ticketEmpresa || (!min && !max)) return 0.5;
  if (min && ticketEmpresa < min) return 0;
  if (max && ticketEmpresa > max) return 0;
  return 1;
}

export function calcularMatchInvestidor(empresa: Empresa, investidor: Investidor) {
  const sSub = scoreSubsetor(empresa.subsetor, investidor.subsetoresInteresse);
  const sEst = scoreEstagio(empresa.estagio, investidor.estagiosInteresse);
  const sTicket = scoreTicket(empresa.ticketDesejado, investidor.ticketMinimo, investidor.ticketMaximo);

  const score = sSub * PESO_SUBSETOR + sEst * PESO_ESTAGIO + sTicket * PESO_TICKET;

  const motivos: string[] = [];
  if (sSub === 1) motivos.push(`atua em ${labelSubsetor(empresa.subsetor)}, setor de interesse do investidor`);
  if (sEst === 1 && empresa.estagio) motivos.push(`está no estágio ${labelEstagio(empresa.estagio)}, compatível com a tese`);
  if (sTicket === 1 && empresa.ticketDesejado) motivos.push(`ticket buscado está dentro da faixa do investidor`);

  return { score, motivo: motivos.join('; ') || 'compatibilidade parcial' };
}

export function calcularMatchOportunidade(empresa: Empresa, oportunidade: Oportunidade) {
  const sSub = scoreSubsetor(empresa.subsetor, oportunidade.subsetoresAlvo);
  const sEst = scoreEstagio(empresa.estagio, oportunidade.estagiosAlvo);
  const sTicket = scoreTicket(empresa.ticketDesejado, oportunidade.valorMinimo, oportunidade.valorMaximo);

  const score = sSub * PESO_SUBSETOR + sEst * PESO_ESTAGIO + sTicket * PESO_TICKET;

  const motivos: string[] = [];
  if (sSub === 1) motivos.push(`subsetor compatível com o escopo da oportunidade`);
  if (sEst === 1 && empresa.estagio) motivos.push(`estágio ${labelEstagio(empresa.estagio)} aceito`);
  if (sTicket === 1) motivos.push(`faixa de valor compatível`);

  return { score, motivo: motivos.join('; ') || 'compatibilidade parcial' };
}

const SCORE_MINIMO_PARA_MATCH = 0.5;

// Recalcula todos os matches de uma empresa específica contra investidores e oportunidades ativas.
// Chamado depois que uma empresa completa o cadastro, e periodicamente quando novas
// oportunidades/investidores entram na base.
export async function recalcularMatchesDaEmpresa(empresaId: string) {
  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) throw new Error('Empresa não encontrada');

  const [investidores, oportunidades] = await Promise.all([
    prisma.investidor.findMany(),
    prisma.oportunidade.findMany({ where: { ativa: true } }),
  ]);

  await prisma.match.deleteMany({ where: { empresaId } });

  const novosMatches = [];

  for (const investidor of investidores) {
    const { score, motivo } = calcularMatchInvestidor(empresa, investidor);
    if (score >= SCORE_MINIMO_PARA_MATCH) {
      novosMatches.push({ empresaId, investidorId: investidor.id, score, motivo });
    }
  }

  for (const oportunidade of oportunidades) {
    const { score, motivo } = calcularMatchOportunidade(empresa, oportunidade);
    if (score >= SCORE_MINIMO_PARA_MATCH) {
      novosMatches.push({ empresaId, oportunidadeId: oportunidade.id, score, motivo });
    }
  }

  if (novosMatches.length > 0) {
    await prisma.match.createMany({ data: novosMatches });
  }

  return novosMatches.length;
}

// Recalcula os matches de TODAS as empresas contra uma oportunidade recém-criada.
// Chamado quando um novo edital/rodada entra na base, para já notificar empresas compatíveis.
export async function recalcularMatchesDaOportunidade(oportunidadeId: string) {
  const oportunidade = await prisma.oportunidade.findUnique({ where: { id: oportunidadeId } });
  if (!oportunidade) throw new Error('Oportunidade não encontrada');

  const empresas = await prisma.empresa.findMany({ where: { buscaCapital: true } });

  const novosMatches = [];
  for (const empresa of empresas) {
    const { score, motivo } = calcularMatchOportunidade(empresa, oportunidade);
    if (score >= SCORE_MINIMO_PARA_MATCH) {
      novosMatches.push({ empresaId: empresa.id, oportunidadeId, score, motivo });
    }
  }

  if (novosMatches.length > 0) {
    await prisma.match.createMany({ data: novosMatches, skipDuplicates: true });
  }

  return novosMatches.length;
}
