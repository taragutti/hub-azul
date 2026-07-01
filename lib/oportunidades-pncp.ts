export type OportunidadePNCP = {
  id: string;
  tipo: string;
  titulo: string;
  link: string;
  fonte: string;
  prazo: string | null;
};

type PNCPItem = Record<string, unknown>;

const CODIGOS_MODALIDADE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const PALAVRAS_CHAVE = [
  'mar',
  'oceano',
  'oceânico',
  'oceânica',
  'economia azul',
  'bioeconomia',
  'pesca',
  'aquicultura',
  'porto',
  'portos',
  'hidrovia',
  'embarcação',
  'naval',
  'offshore',
  'energia renovável',
  'energia oceânica',
  'descarbonização',
  'biodiversidade',
  'resíduos',
  'saneamento',
  'inovação',
  'tecnologia',
];

function formatarDataPNCP(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');

  return `${ano}${mes}${dia}`;
}

function somarDias(dias: number) {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return data;
}

function getString(obj: PNCPItem, key: string) {
  const valor = obj[key];
  return typeof valor === 'string' ? valor : '';
}

function getNestedString(obj: PNCPItem, parent: string, key: string) {
  const valor = obj[parent];

  if (!valor || typeof valor !== 'object') return '';

  const filho = valor as Record<string, unknown>;
  const resultado = filho[key];

  return typeof resultado === 'string' ? resultado : '';
}

function extrairLista(json: unknown): PNCPItem[] {
  if (Array.isArray(json)) return json as PNCPItem[];

  if (json && typeof json === 'object') {
    const obj = json as Record<string, unknown>;

    const chavesPossiveis = ['data', 'items', 'content', 'resultado', 'resultados'];

    for (const chave of chavesPossiveis) {
      if (Array.isArray(obj[chave])) {
        return obj[chave] as PNCPItem[];
      }
    }
  }

  return [];
}

function montarLink(item: PNCPItem) {
  const linkSistema = getString(item, 'linkSistemaOrigem');

  if (linkSistema) return linkSistema;

  const cnpj =
    getNestedString(item, 'orgaoEntidade', 'cnpj') ||
    getString(item, 'cnpjOrgao');

  const ano = String(item.anoCompra ?? '');
  const sequencial = String(item.sequencialCompra ?? '');

  if (cnpj && ano && sequencial) {
    return `https://pncp.gov.br/app/editais/${cnpj}/${ano}/${sequencial}`;
  }

  return 'https://pncp.gov.br/app/editais';
}

function transformarItem(item: PNCPItem): OportunidadePNCP {
  const titulo =
    getString(item, 'objetoCompra') ||
    getString(item, 'descricaoObjeto') ||
    getString(item, 'titulo') ||
    'Contratação pública';

  const tipo =
    getString(item, 'modalidadeNome') ||
    getString(item, 'modalidadeContratacaoNome') ||
    'EDITAL PNCP';

  const prazo =
    getString(item, 'dataEncerramentoProposta') ||
    getString(item, 'dataFimRecebimentoProposta') ||
    null;

  const id =
    getString(item, 'numeroControlePNCP') ||
    `${getNestedString(item, 'orgaoEntidade', 'cnpj')}-${String(item.anoCompra ?? '')}-${String(
      item.sequencialCompra ?? ''
    )}`;

  return {
    id,
    tipo: tipo.toUpperCase(),
    titulo,
    link: montarLink(item),
    fonte: 'PNCP',
    prazo,
  };
}

export async function buscarOportunidadesPNCP(limite = 5): Promise<OportunidadePNCP[]> {
  const dataFinal = formatarDataPNCP(somarDias(90));

  try {
    const requisicoes = CODIGOS_MODALIDADE.map(async (codigo) => {
      const url = `https://pncp.gov.br/api/consulta/v1/contratacoes/proposta?dataFinal=${dataFinal}&codigoModalidadeContratacao=${codigo}&pagina=1&tamanhoPagina=50`;

      const resposta = await fetch(url, {
        cache: 'no-store',
        headers: {
          accept: 'application/json',
        },
      });

      if (!resposta.ok) return [];

      const json = await resposta.json();
      return extrairLista(json);
    });

    const respostas = await Promise.allSettled(requisicoes);

    const itens = respostas.flatMap((resposta) => {
      if (resposta.status !== 'fulfilled') return [];
      return resposta.value;
    });

    const filtrados = itens.filter((item) => {
      const texto = [
        getString(item, 'objetoCompra'),
        getString(item, 'descricaoObjeto'),
        getString(item, 'informacaoComplementar'),
        getNestedString(item, 'orgaoEntidade', 'razaoSocial'),
        getNestedString(item, 'unidadeOrgao', 'nomeUnidade'),
      ]
        .join(' ')
        .toLowerCase();

      return PALAVRAS_CHAVE.some((palavra) => texto.includes(palavra));
    });

    const unicos = new Map<string, OportunidadePNCP>();

    filtrados.forEach((item) => {
      const oportunidade = transformarItem(item);
      unicos.set(oportunidade.id || oportunidade.link, oportunidade);
    });

    return Array.from(unicos.values()).slice(0, limite);
  } catch {
    return [];
  }
}
