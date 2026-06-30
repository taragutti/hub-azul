// Ingestão inicial de empresas a partir de dados públicos de CNPJ, filtrados pelos
// CNAEs mapeados na planilha HUB_Azul_CNAEs_e_Filtro_Geografico.xlsx.
//
// Este script consome a API pública do OpenCNPJ (https://opencnpj.org), que mantém
// uma cópia tratada do cadastro da Receita Federal. Ele NÃO inventa dados — se a API
// estiver fora do ar ou mudar de formato, o script falha de forma visível em vez de
// gerar dados fictícios.
//
// Rode com: npm run ingest:cnpj -- --uf=BA --subsetor=AQUICULTURA_PESCA
// Rode sem filtros para varrer todos os subsetores em todos os estados costeiros
// (atenção: isso pode ser uma quantidade grande de chamadas, dependendo do volume).

import { PrismaClient } from '@prisma/client';
import { CNAES_POR_SUBSETOR, ESTADOS_COSTEIROS } from '../lib/referencias';

const prisma = new PrismaClient();

// Ajuste esta URL conforme a documentação atual do provedor escolhido.
// OpenCNPJ e Base dos Dados mudam de endpoint ocasionalmente — confira antes de rodar.
const OPENCNPJ_BASE_URL = 'https://api.opencnpj.org/v1/empresas';

interface RegistroOpenCNPJ {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  cnae_fiscal_principal: string;
  uf: string;
  municipio: string;
  situacao_cadastral: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const uf = args.find((a) => a.startsWith('--uf='))?.split('=')[1];
  const subsetor = args.find((a) => a.startsWith('--subsetor='))?.split('=')[1];
  return { uf, subsetor };
}

async function buscarPorCnae(cnae: string, uf: string): Promise<RegistroOpenCNPJ[]> {
  const url = `${OPENCNPJ_BASE_URL}?cnae=${cnae}&uf=${uf}&situacao=ATIVA`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Falha ao consultar OpenCNPJ para CNAE ${cnae} / UF ${uf}: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.resultados ?? data.empresas ?? [];
}

async function main() {
  const { uf: ufFiltro, subsetor: subsetorFiltro } = parseArgs();

  const subsetores = subsetorFiltro
    ? [subsetorFiltro]
    : Object.keys(CNAES_POR_SUBSETOR);

  const estados = ufFiltro ? [ufFiltro.toUpperCase()] : [...ESTADOS_COSTEIROS];

  let totalInseridas = 0;
  let totalIgnoradas = 0;

  for (const subsetor of subsetores) {
    const cnaes = CNAES_POR_SUBSETOR[subsetor];
    if (!cnaes) {
      console.warn(`Subsetor desconhecido: ${subsetor} — pulando.`);
      continue;
    }

    for (const uf of estados) {
      for (const cnae of cnaes) {
        console.log(`Buscando CNAE ${cnae} em ${uf} (${subsetor})...`);
        let registros: RegistroOpenCNPJ[] = [];
        try {
          registros = await buscarPorCnae(cnae, uf);
        } catch (err) {
          console.error(`  Erro: ${(err as Error).message} — pulando este CNAE/UF.`);
          continue;
        }

        for (const r of registros) {
          const existente = await prisma.empresa.findUnique({ where: { cnpj: r.cnpj } });
          if (existente) {
            totalIgnoradas += 1;
            continue;
          }

          await prisma.empresa.create({
            data: {
              cnpj: r.cnpj,
              razaoSocial: r.razao_social,
              nomeFantasia: r.nome_fantasia || null,
              cnaePrincipal: r.cnae_fiscal_principal,
              subsetor: subsetor as never,
              uf: r.uf,
              municipio: r.municipio,
              origemDado: 'RECEITA_FEDERAL_CNPJ',
              verificada: false,
              perfilCompleto: false,
            },
          });
          totalInseridas += 1;
        }

        // Respeita rate limit do provedor — ajuste conforme a documentação atual.
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  }

  console.log(`\nIngestão concluída. ${totalInseridas} empresas novas, ${totalIgnoradas} já existentes (ignoradas).`);
  console.log('Lembrete: estas empresas vêm de CNAE declarado, não de curadoria. Marque como verificada=true');
  console.log('manualmente ou via processo de validação antes de exibi-las como "verificadas" no perfil.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
