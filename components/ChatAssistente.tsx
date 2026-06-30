'use client';

import { useState } from 'react';

const SUGESTOES = [
  'Quais investidores estrangeiros têm interesse neste subsetor?',
  'Como está o ecossistema de economia azul no meu estado?',
  'Quantas empresas atuam no mesmo subsetor que esta?',
];

export default function ChatAssistente({ empresaId }: { empresaId: string }) {
  const [pergunta, setPergunta] = useState('');
  const [mensagens, setMensagens] = useState<{ autor: 'usuario' | 'assistente'; texto: string }[]>([]);
  const [carregando, setCarregando] = useState(false);

  async function enviar(texto: string) {
    if (!texto.trim() || carregando) return;
    setMensagens((m) => [...m, { autor: 'usuario', texto }]);
    setPergunta('');
    setCarregando(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta: texto, empresaId }),
      });
      const data = await res.json();
      setMensagens((m) => [
        ...m,
        { autor: 'assistente', texto: data.resposta || data.erro || 'Não foi possível responder.' },
      ]);
    } catch {
      setMensagens((m) => [...m, { autor: 'assistente', texto: 'Erro ao conectar com o assistente.' }]);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-medium text-navy">Pergunte sobre os dados do ecossistema</h3>

      {mensagens.length === 0 && (
        <div className="mb-3 flex flex-col gap-2">
          {SUGESTOES.map((s) => (
            <button
              key={s}
              onClick={() => enviar(s)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-left text-xs text-gray-600 hover:border-teal hover:text-teal"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="mb-3 max-h-80 space-y-3 overflow-y-auto">
        {mensagens.map((m, i) => (
          <div
            key={i}
            className={
              m.autor === 'usuario'
                ? 'ml-auto max-w-[85%] rounded-lg bg-lightblue px-3 py-2 text-sm text-navy'
                : 'mr-auto max-w-[85%] rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-800'
            }
          >
            {m.texto}
          </div>
        ))}
        {carregando && <p className="text-xs text-gray-400">Consultando os dados...</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(pergunta);
        }}
        className="flex gap-2"
      >
        <input
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder="Digite sua pergunta"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={carregando}
          className="rounded-lg bg-navy px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
