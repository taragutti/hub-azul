// Popula o banco com dados de exemplo, para você testar o dashboard, o matching
// e o chat de IA localmente antes de conectar a ingestão real de CNPJ.
// Rode com: npm run db:seed

import { PrismaClient } from '@prisma/client';
import { recalcularMatchesDaEmpresa } from '../lib/matching';

const prisma = new PrismaClient();

async function main() {
  console.log('Limpando dados existentes...');
  await prisma.match.deleteMany();
  await prisma.empresa.deleteMany();
  await prisma.investidor.deleteMany();
  await prisma.oportunidade.deleteMany();

  console.log('Criando empresas de exemplo...');
  const empresas = await Promise.all([
    prisma.empresa.create({
      data: {
        razaoSocial: 'MarBio Soluções Biotecnológicas Ltda',
        nomeFantasia: 'MarBio',
        descricao: 'Desenvolve compostos bioativos a partir de algas marinhas para uso farmacêutico.',
        subsetor: 'BIOTECNOLOGIA_MARINHA',
        estagio: 'SERIES_A',
        uf: 'SC',
        municipio: 'Florianópolis',
        buscaCapital: true,
        ticketDesejado: 3_000_000,
        origemDado: 'AUTO_CADASTRO',
        perfilCompleto: true,
      },
    }),
    prisma.empresa.create({
      data: {
        razaoSocial: 'Costa Azul Aquicultura S.A.',
        nomeFantasia: 'Costa Azul',
        descricao: 'Produção sustentável de camarão em sistema de recirculação de água.',
        subsetor: 'AQUICULTURA_PESCA',
        estagio: 'SEED',
        uf: 'BA',
        municipio: 'Ilhéus',
        buscaCapital: true,
        ticketDesejado: 800_000,
        origemDado: 'AUTO_CADASTRO',
        perfilCompleto: true,
      },
    }),
    prisma.empresa.create({
      data: {
        razaoSocial: 'OceanWind Brasil Energias Renováveis Ltda',
        nomeFantasia: 'OceanWind Brasil',
        descricao: 'Desenvolvimento de projetos de energia eólica offshore no litoral nordestino.',
        subsetor: 'ENERGIA_OCEANICA_OFFSHORE',
        estagio: 'SERIES_B',
        uf: 'RN',
        municipio: 'Natal',
        buscaCapital: true,
        ticketDesejado: 15_000_000,
        origemDado: 'AUTO_CADASTRO',
        perfilCompleto: true,
      },
    }),
    prisma.empresa.create({
      data: {
        razaoSocial: 'PortoTech Logística Marítima Ltda',
        nomeFantasia: 'PortoTech',
        descricao: 'Plataforma de otimização logística para operações portuárias.',
        subsetor: 'PORTOS_LOGISTICA_MARITIMA',
        estagio: 'GROWTH',
        uf: 'ES',
        municipio: 'Vitória',
        buscaCapital: false,
        origemDado: 'RECEITA_FEDERAL_CNPJ',
        perfilCompleto: false,
      },
    }),
  ]);

  console.log('Criando investidores de exemplo...');
  await prisma.investidor.createMany({
    data: [
      {
        nome: 'Atlantic Blue Capital',
        tipo: 'Fundo de impacto',
        pais: 'Portugal',
        estrangeiro: true,
        descricao: 'Fundo europeu focado em economia azul no Atlântico Sul.',
        subsetoresInteresse: ['AQUICULTURA_PESCA', 'BIOTECNOLOGIA_MARINHA'],
        estagiosInteresse: ['SEED', 'SERIES_A'],
        ticketMinimo: 500_000,
        ticketMaximo: 5_000_000,
      },
      {
        nome: 'BNDES Climafundo',
        tipo: 'Banco de fomento',
        pais: 'Brasil',
        estrangeiro: false,
        descricao: 'Linha de financiamento para energia renovável e transição climática.',
        subsetoresInteresse: ['ENERGIA_OCEANICA_OFFSHORE', 'OLEO_GAS_OFFSHORE'],
        estagiosInteresse: ['SERIES_B', 'SERIES_C_MAIS', 'GROWTH'],
        ticketMinimo: 10_000_000,
        ticketMaximo: 50_000_000,
      },
      {
        nome: 'Reef Ventures',
        tipo: 'Venture capital',
        pais: 'Estados Unidos',
        estrangeiro: true,
        descricao: 'VC americano com teses em biotecnologia e aquicultura sustentável.',
        subsetoresInteresse: ['BIOTECNOLOGIA_MARINHA', 'AQUICULTURA_PESCA'],
        estagiosInteresse: ['SEED', 'SERIES_A', 'SERIES_B'],
        ticketMinimo: 1_000_000,
        ticketMaximo: 8_000_000,
      },
    ],
  });

  console.log('Criando oportunidades de exemplo...');
  await prisma.oportunidade.create({
    data: {
      titulo: 'Chamada FINEP — Bioeconomia Azul 2026',
      descricao: 'Apoio não-reembolsável para empresas com soluções inovadoras em biotecnologia marinha e aquicultura sustentável.',
      tipo: 'EDITAL_PUBLICO',
      fonte: 'FINEP',
      subsetoresAlvo: ['BIOTECNOLOGIA_MARINHA', 'AQUICULTURA_PESCA'],
      estagiosAlvo: ['SEED', 'SERIES_A'],
      valorMinimo: 200_000,
      valorMaximo: 4_000_000,
      prazoInscricao: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21),
      url: 'https://www.finep.gov.br/chamadas-publicas',
    },
  });

  console.log('Recalculando matches...');
  for (const empresa of empresas) {
    const total = await recalcularMatchesDaEmpresa(empresa.id);
    console.log(`  ${empresa.nomeFantasia}: ${total} matches`);
  }

  console.log('Seed concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
