import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { labelSubsetor, labelEstagio } from '@/lib/referencias';
import ChatAssistente from '@/components/ChatAssistente';

export const dynamic = 'force-dynamic';

async function buscarEmpresa(id: string) {
  return prisma.empresa.findUnique({
    where: { id },
    include: {
      matches: {
        include: { investidor: true, oportunidade: true },
        orderBy: { score: 'desc' },
      },
    },
  });
}

export default async function EmpresaPage({ params }: { params: { id: string } }) {
  const empresa = await buscarEmpresa(params.id);
  if (!empresa) notFound();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-medium text-navy">
                {empresa.nomeFantasia || empresa.razaoSocial}
              </h1>
              {empresa.nomeFantasia && (
                <p className="text-sm text-gray-400">{empresa.razaoSocial}</p>
              )}
            </div>
            <span className="rounded bg-lightblue px-2 py-1 text-xs text-teal">
              {labelEstagio(empresa.estagio)}
            </span>
          </div>

          {empresa.descricao && <p className="mt-4 text-sm text-gray-700">{empresa.descricao}</p>}

          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-400">Subsetor</dt>
              <dd className="text-gray-800">{labelSubsetor(empresa.subsetor)}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Localização</dt>
              <dd className="text-gray-800">{empresa.municipio}/{empresa.uf}</dd>
            </div>
            {empresa.website && (
              <div>
                <dt className="text-gray-400">Website</dt>
                <dd>
                  <a href={empresa.website} target="_blank" className="text-teal underline">
                    {empresa.website}
                  </a>
                </dd>
              </div>
            )}
            {empresa.buscaCapital && (
              <div>
                <dt className="text-gray-400">Buscando capital</dt>
                <dd className="text-gray-800">
                  Sim{empresa.ticketDesejado ? ` — R$ ${empresa.ticketDesejado.toLocaleString('pt-BR')}` : ''}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <h2 className="mb-3 mt-6 text-lg font-medium text-navy">Oportunidades compatíveis</h2>
        <div className="space-y-3">
          {empresa.matches.length === 0 && (
            <p className="text-sm text-gray-500">
              Nenhum match calculado ainda. Matches aparecem aqui automaticamente quando
              investidores ou oportunidades compatíveis com o perfil são cadastrados.
            </p>
          )}
          {empresa.matches.map((match) => (
            <div key={match.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">
                  {match.investidor?.nome || match.oportunidade?.titulo}
                </p>
                <span className="rounded bg-teal/10 px-2 py-0.5 text-xs text-teal">
                  {Math.round(match.score * 100)}% compatível
                </span>
              </div>
              {match.motivo && <p className="mt-1 text-xs text-gray-500">{match.motivo}</p>}
            </div>
          ))}
        </div>
      </div>

      <div>
        <ChatAssistente empresaId={empresa.id} />
      </div>
    </div>
  );
}
