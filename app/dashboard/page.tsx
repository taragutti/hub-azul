import Link from 'next/link';
import { SUBSETORES, ESTADOS_COSTEIROS, labelSubsetor, labelEstagio } from '@/lib/referencias';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function buscarDadosDashboard(subsetorFiltro?: string, ufFiltro?: string) {
  const { prisma } = await import('@/lib/prisma');

  const whereEmpresas: Record<string, unknown> = {};

  if (subsetorFiltro) whereEmpresas.subsetor = subsetorFiltro;
  if (ufFiltro) whereEmpresas.uf = ufFiltro;

  const [
    totalEmpresas,
    totalInvestidores,
    totalInvestidoresEstrangeiros,
    oportunidadesAtivas,
    empresasPorSubsetor,
    empresasDestaque,
    oportunidadesProximas,
  ] = await Promise.all([
    prisma.empresa.count({ where: whereEmpresas }),
    prisma.investidor.count(),
    prisma.investidor.count({ where: { estrangeiro: true } }),
    prisma.oportunidade.count({ where: { ativa: true } }),
    prisma.empresa.groupBy({ by: ['subsetor'], _count: true, where: whereEmpresas }),
    prisma.empresa.findMany({ where: whereEmpresas, take: 6, orderBy: { criadoEm: 'desc' } }),
    prisma.oportunidade.findMany({
      where: { ativa: true },
      orderBy: { prazoInscricao: 'asc' },
      take: 5,
    }),
  ]);

  return {
    totalEmpresas,
    totalInvestidores,
    totalInvestidoresEstrangeiros,
    oportunidadesAtivas,
    empresasPorSubsetor,
    empresasDestaque,
    oportunidadesProximas,
  };
}

function diasRestantes(prazo: Date | null): string {
  if (!prazo) return 'sem prazo definido';

  const dias = Math.ceil((prazo.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (dias < 0) return 'encerrado';
  if (dias === 0) return 'encerra hoje';

  return `${dias} dia${dias > 1 ? 's' : ''} restantes`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { subsetor?: string; uf?: string };
}) {
  const dados = await buscarDadosDashboard(searchParams.subsetor, searchParams.uf);
  const maxEmpresas = Math.max(1, ...dados.empresasPorSubsetor.map((s) => s._count));

  return (
    <div className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex w-full flex-col items-center justify-center gap-4 text-center md:flex-row md:justify-between md:text-left">
        <h1 className="w-full max-w-xl text-center text-2xl font-medium leading-tight text-navy sm:text-3xl md:text-left">
          Ecossistema da economia azul no Brasil
        </h1>

        <form
          className="grid w-full grid-cols-1 gap-2 sm:max-w-md md:w-auto md:max-w-none md:grid-cols-3"
          method="get"
        >
          <select
            name="subsetor"
            defaultValue={searchParams.subsetor ?? ''}
            className="w-full min-w-0 rounded border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Todos os subsetores</option>
            {SUBSETORES.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            name="uf"
            defaultValue={searchParams.uf ?? ''}
            className="w-full min-w-0 rounded border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Todos os estados</option>
            {ESTADOS_COSTEIROS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="w-full rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            Filtrar
          </button>
        </form>
      </div>

      <div className="mb-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <MetricCard label="Empresas cadastradas" valor={dados.totalEmpresas} />
        <MetricCard
          label="Investidores ativos"
          valor={dados.totalInvestidores}
          nota={`${dados.totalInvestidoresEstrangeiros} estrangeiros`}
        />
        <MetricCard label="Oportunidades abertas" valor={dados.oportunidadesAtivas} />
        <MetricCard label="Subsetores mapeados" valor={SUBSETORES.length} />
      </div>

      <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <h2 className="mb-3 text-lg font-medium text-navy">
            Ecossistema por subsetor
          </h2>

          <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
            {dados.empresasPorSubsetor.length === 0 && (
              <p className="text-sm text-gray-500">
                Nenhuma empresa cadastrada ainda para este filtro.
              </p>
            )}

            {dados.empresasPorSubsetor.map((item) => (
              <div
                key={item.subsetor}
                className="grid grid-cols-[1fr_auto] items-center gap-2 sm:flex sm:gap-3"
              >
                <span className="min-w-0 truncate text-sm text-gray-700 sm:w-52">
                  {labelSubsetor(item.subsetor)}
                </span>

                <span className="text-right text-sm text-gray-600 sm:w-8">
                  {item._count}
                </span>

                <div className="col-span-2 h-2 w-full rounded-full bg-gray-100 sm:col-span-1 sm:flex-1">
                  <div
                    className="h-2 rounded-full bg-teal"
                    style={{
                      width: `${Math.round((item._count / maxEmpresas) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <h2 className="mb-3 mt-8 text-lg font-medium text-navy">
            Empresas em destaque
          </h2>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            {dados.empresasDestaque.map((empresa) => (
              <Link
                key={empresa.id}
                href={`/empresas/${empresa.id}`}
                className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 hover:border-teal"
              >
                <p className="truncate font-medium text-gray-900">
                  {empresa.nomeFantasia || empresa.razaoSocial}
                </p>

                <p className="mt-1 truncate text-sm text-gray-500">
                  {labelSubsetor(empresa.subsetor)}
                </p>

                <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs text-gray-400">
                    {empresa.municipio}/{empresa.uf}
                  </span>

                  <span className="shrink-0 rounded bg-lightblue px-2 py-0.5 text-xs text-teal">
                    {labelEstagio(empresa.estagio)}
                  </span>
                </div>
              </Link>
            ))}

            {dados.empresasDestaque.length === 0 && (
              <p className="text-sm text-gray-500">
                Nenhuma empresa cadastrada ainda.{' '}
                <Link href="/cadastro" className="text-teal underline">
                  Cadastre a primeira
                </Link>
                .
              </p>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <h2 className="mb-3 text-lg font-medium text-navy">
            Oportunidades recentes
          </h2>

          <div className="space-y-3">
            {dados.oportunidadesProximas.map((op) => (
              <div key={op.id} className="min-w-0 rounded-xl border border-gray-200 bg-white p-3">
                <p className="truncate text-xs font-medium text-teal">
                  {op.tipo.replace('_', ' ')}
                </p>

                <p className="mt-1 text-sm text-gray-900">
                  {op.titulo}
                </p>

                <p className="mt-1 text-xs text-amber-600">
                  {diasRestantes(op.prazoInscricao)}
                </p>
              </div>
            ))}

            {dados.oportunidadesProximas.length === 0 && (
              <p className="text-sm text-gray-500">
                Nenhuma oportunidade cadastrada ainda.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  valor,
  nota,
}: {
  label: string;
  valor: number;
  nota?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-medium text-navy">{valor}</p>
      {nota && <p className="mt-1 text-xs text-gray-400">{nota}</p>}
    </div>
  );
}
