import { notFound } from 'next/navigation';
import { labelSubsetor, labelEstagio } from '@/lib/referencias';
import ChatAssistente from '@/components/ChatAssistente';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function buscarEmpresa(id: string) {
  const { prisma } = await import('@/lib/prisma');

  return prisma.empresa.findUnique({
    where: { id },
    include: {
      matches: {
        include: {
          investidor: true,
          oportunidade: true,
        },
        orderBy: { score: 'desc' },
      },
    },
  });
}

export default async function EmpresaPage({
  params,
}: {
  params: { id: string };
}) {
  const empresa = await buscarEmpresa(params.id);

  if (!empresa) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-medium text-navy">
              {empresa.nomeFantasia || empresa.razaoSocial}
            </h1>

            {empresa.nomeFantasia && (
              <p className="mt-1 text-sm text-gray-500">{empresa.razaoSocial}</p>
            )}

            <p className="mt-3 text-sm text-gray-600">
              {empresa.descricao || 'Empresa cadastrada no HUB Azul.'}
            </p>
          </div>

          <span className="rounded bg-lightblue px-3 py-1 text-sm text-teal">
            {labelEstagio(empresa.estagio)}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <InfoCard titulo="Subsetor" valor={labelSubsetor(empresa.subsetor)} />
          <InfoCard titulo="Localização" valor={`${empresa.municipio}/${empresa.uf}`} />

          {empresa.website && (
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Website</p>
              <a
                href={empresa.website}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block break-all text-sm text-teal underline"
              >
                {empresa.website}
              </a>
            </div>
          )}

          {empresa.buscaCapital && (
            <InfoCard
              titulo="Buscando capital"
              valor={`Sim${
                empresa.ticketDesejado
                  ? ` — R$ ${empresa.ticketDesejado.toLocaleString('pt-BR')}`
                  : ''
              }`}
            />
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-navy">
          Oportunidades compatíveis
        </h2>

        <div className="space-y-3">
          {empresa.matches.length === 0 && (
            <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
              Nenhum match calculado ainda. Matches aparecem aqui automaticamente
              quando investidores ou oportunidades compatíveis com o perfil são
              cadastrados.
            </p>
          )}

          {empresa.matches.map((match) => (
            <div
              key={match.id}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="font-medium text-gray-900">
                  {match.investidor?.nome || match.oportunidade?.titulo}
                </p>

                <span className="rounded bg-lightblue px-2 py-1 text-xs text-teal">
                  {Math.round(match.score * 100)}% compatível
                </span>
              </div>

              {match.motivo && (
                <p className="mt-2 text-sm text-gray-500">{match.motivo}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-navy">
          Assistente de IA
        </h2>

        <ChatAssistente empresaId={empresa.id} />
      </section>
    </div>
  );
}

function InfoCard({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-500">{titulo}</p>
      <p className="mt-1 text-sm text-gray-900">{valor}</p>
    </div>
  );
}
