// Referências compartilhadas usadas em filtros, formulários e no motor de matching.
// Os CNAEs vêm diretamente da planilha de mapeamento (HUB_Azul_CNAEs_e_Filtro_Geografico.xlsx).

export const SUBSETORES = [
  { valor: 'AQUICULTURA_PESCA', label: 'Aquicultura e pesca' },
  { valor: 'BIOTECNOLOGIA_MARINHA', label: 'Biotecnologia marinha' },
  { valor: 'ENERGIA_OCEANICA_OFFSHORE', label: 'Energia oceânica e eólica offshore' },
  { valor: 'OLEO_GAS_OFFSHORE', label: 'Óleo e gás offshore' },
  { valor: 'PORTOS_LOGISTICA_MARITIMA', label: 'Portos e logística marítima' },
  { valor: 'TURISMO_COSTEIRO', label: 'Turismo costeiro e marinho' },
  { valor: 'MONITORAMENTO_CONSERVACAO', label: 'Monitoramento e conservação marinha' },
] as const;

export const ESTAGIOS = [
  { valor: 'IDEACAO', label: 'Ideação' },
  { valor: 'PRE_OPERACIONAL', label: 'Pré-operacional' },
  { valor: 'SEED', label: 'Seed' },
  { valor: 'SERIES_A', label: 'Series A' },
  { valor: 'SERIES_B', label: 'Series B' },
  { valor: 'SERIES_C_MAIS', label: 'Series C ou mais' },
  { valor: 'GROWTH', label: 'Growth' },
  { valor: 'ESTABELECIDA', label: 'Estabelecida' },
] as const;

export const ESTADOS_COSTEIROS = [
  'AP', 'PA', 'MA', 'PI', 'CE', 'RN', 'PB', 'PE', 'AL',
  'SE', 'BA', 'ES', 'RJ', 'SP', 'PR', 'SC', 'RS',
] as const;

// CNAE (sem máscara, 7 dígitos) por subsetor — espelha a planilha de mapeamento.
export const CNAES_POR_SUBSETOR: Record<string, string[]> = {
  AQUICULTURA_PESCA: [
    '0321301', '0321302', '0321303', '0321304', '0321305', '0321399',
    '0311601', '0311602', '0311603', '0311604',
    '1020101', '1020102',
  ],
  BIOTECNOLOGIA_MARINHA: [
    '7210000', '2121101', '2063100', '2040000',
  ],
  ENERGIA_OCEANICA_OFFSHORE: [
    '3511501', '4221902', '2813900',
  ],
  OLEO_GAS_OFFSHORE: [
    '0600001', '0600002', '0600003', '0910600',
    '1922000', '3313900',
  ],
  PORTOS_LOGISTICA_MARITIMA: [
    '5011401', '5011402', '5012201', '5012202',
    '5231101', '5231102', '5231103', '5231104', '5232000',
    '3011301', '3011302', '3011303', '3011304', '3314706',
  ],
  TURISMO_COSTEIRO: [
    '5030101', '7912100', '9319102', '5510800',
  ],
  MONITORAMENTO_CONSERVACAO: [
    '7120100', '7210000', '3329500', '2651500', '8412400', '9499500',
  ],
};

export function labelSubsetor(valor: string): string {
  return SUBSETORES.find((s) => s.valor === valor)?.label ?? valor;
}

export function labelEstagio(valor: string | null | undefined): string {
  if (!valor) return '—';
  return ESTAGIOS.find((e) => e.valor === valor)?.label ?? valor;
}
