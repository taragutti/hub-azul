import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'HUB Azul — Observatório da Economia Azul',
  description: 'Plataforma de inteligência e conexão do ecossistema brasileiro de economia azul.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lightblue text-teal font-bold">
                HA
              </span>
              <span className="text-lg font-medium text-navy">HUB Azul</span>
            </Link>
            <nav className="flex gap-6 text-sm text-gray-600">
              <Link href="/dashboard" className="hover:text-navy">Dashboard</Link>
              <Link href="/cadastro" className="hover:text-navy">Cadastrar empresa</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
