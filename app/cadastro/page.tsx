'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SUBSETORES, ESTAGIOS, ESTADOS_COSTEIROS } from '@/lib/referencias';

export default function CadastroPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      razaoSocial: formData.get('razaoSocial'),
      nomeFantasia: formData.get('nomeFantasia') || undefined,
      cnpj: formData.get('cnpj') || undefined,
      descricao: formData.get('descricao') || undefined,
      website: formData.get('website') || undefined,
      email: formData.get('email') || undefined,
      subsetor: formData.get('subsetor'),
      estagio: formData.get('estagio') || undefined,
      uf: formData.get('uf'),
      municipio: formData.get('municipio'),
      buscaCapital: formData.get('buscaCapital') === 'on',
      ticketDesejado: formData.get('ticketDesejado')
        ? Number(formData.get('ticketDesejado'))
        : undefined,
    };

    try {
      const res = await fetch('/api/empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.erro || 'Erro ao cadastrar empresa');
      }

      const data = await res.json();
      router.push(`/empresas/${data.empresa.id}`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-medium text-navy">Cadastrar empresa</h1>
      <p className="mb-6 text-sm text-gray-500">
        Seu perfil fica visível no diretório do HUB Azul e passa a receber matching automático
        com oportunidades e investidores compatíveis.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <Campo label="Razão social *">
          <input name="razaoSocial" required className="campo" />
        </Campo>
        <Campo label="Nome fantasia">
          <input name="nomeFantasia" className="campo" />
        </Campo>
        <Campo label="CNPJ">
          <input name="cnpj" placeholder="00000000000000" className="campo" />
        </Campo>
        <Campo label="Descrição">
          <textarea name="descricao" rows={3} className="campo" />
        </Campo>

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Website">
            <input name="website" type="url" placeholder="https://" className="campo" />
          </Campo>
          <Campo label="E-mail de contato">
            <input name="email" type="email" className="campo" />
          </Campo>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Subsetor *">
            <select name="subsetor" required className="campo">
              <option value="">Selecione</option>
              {SUBSETORES.map((s) => (
                <option key={s.valor} value={s.valor}>{s.label}</option>
              ))}
            </select>
          </Campo>
          <Campo label="Estágio">
            <select name="estagio" className="campo">
              <option value="">Selecione</option>
              {ESTAGIOS.map((e) => (
                <option key={e.valor} value={e.valor}>{e.label}</option>
              ))}
            </select>
          </Campo>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Estado (UF) *">
            <select name="uf" required className="campo">
              <option value="">Selecione</option>
              {ESTADOS_COSTEIROS.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </Campo>
          <Campo label="Município *">
            <input name="municipio" required className="campo" />
          </Campo>
        </div>

        <div className="flex items-center gap-2">
          <input id="buscaCapital" name="buscaCapital" type="checkbox" />
          <label htmlFor="buscaCapital" className="text-sm text-gray-700">
            Estamos buscando investimento atualmente
          </label>
        </div>

        <Campo label="Ticket desejado (R$)">
          <input name="ticketDesejado" type="number" min="0" step="1000" className="campo" />
        </Campo>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded-lg bg-navy py-2.5 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50"
        >
          {carregando ? 'Cadastrando...' : 'Cadastrar empresa'}
        </button>
      </form>

      <style>{`.campo { width: 100%; border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 12px; font-size: 14px; }`}</style>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}
