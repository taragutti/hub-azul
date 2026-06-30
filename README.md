# HUB Azul

Plataforma de inteligência e conexão do ecossistema brasileiro de economia azul:
diretório de empresas/investidores com busca e filtro geográfico, auto-cadastro,
motor de matching de oportunidades, e chat de IA sobre os dados.

Este README assume que você não tem experiência prévia com deploy de aplicações
web e quer colocar isso no ar sozinho. Siga os passos na ordem.

## O que você vai precisar criar (gratuito para começar)

1. Conta no [GitHub](https://github.com) — para guardar o código.
2. Conta no [Vercel](https://vercel.com) — hospeda o site (front-end + back-end).
3. Conta no [Neon](https://neon.tech) ou [Supabase](https://supabase.com) — banco de dados PostgreSQL gerenciado.
4. Conta no [Anthropic Console](https://console.anthropic.com) — chave de API para o chat de IA.

Nenhuma dessas exige cartão de crédito para o plano gratuito inicial.

## Passo 1 — Instalar as ferramentas na sua máquina

Você precisa do Node.js instalado. Baixe a versão LTS em https://nodejs.org
(escolha "LTS", não "Current"). Depois de instalar, confirme no terminal:

```bash
node --version
npm --version
```

## Passo 2 — Baixar as dependências do projeto

Dentro da pasta do projeto (`hub-azul`), rode:

```bash
npm install
```

Isso vai baixar todos os pacotes listados no `package.json` (Next.js, Prisma,
SDK da Anthropic, etc). Pode levar alguns minutos.

## Passo 3 — Criar o banco de dados

1. Crie uma conta no [Neon](https://neon.tech) (recomendado pela simplicidade) ou
   [Supabase](https://supabase.com).
2. Crie um novo projeto/banco de dados PostgreSQL.
3. Copie a "connection string" (string de conexão) — geralmente algo como
   `postgresql://usuario:senha@host/banco?sslmode=require`.

## Passo 4 — Configurar variáveis de ambiente

1. Copie o arquivo `.env.example` para um novo arquivo chamado `.env`:

```bash
cp .env.example .env
```

2. Abra o `.env` e preencha:
   - `DATABASE_URL`: a connection string que você copiou no Passo 3.
   - `ANTHROPIC_API_KEY`: vá em [console.anthropic.com](https://console.anthropic.com),
     crie uma chave de API, e cole aqui.

## Passo 5 — Criar as tabelas no banco

Com o `.env` preenchido, rode:

```bash
npx prisma db push
```

Isso lê o arquivo `prisma/schema.prisma` e cria todas as tabelas no banco que você
configurou no Passo 3.

## Passo 6 — Popular com dados de exemplo (opcional, recomendado para testar)

```bash
npm run db:seed
```

Isso cria 4 empresas, 3 investidores e 1 oportunidade de exemplo, já com matches
calculados — útil para ver a plataforma funcionando antes de conectar dados reais.

## Passo 7 — Testar localmente

```bash
npm run dev
```

Abra http://localhost:3000 no navegador. Você deve ver o dashboard com os dados
de exemplo (se rodou o Passo 6).

## Passo 8 — Colocar no ar (deploy)

1. Crie um repositório novo no GitHub e suba o código:

```bash
git init
git add .
git commit -m "Primeira versão do HUB Azul"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/hub-azul.git
git push -u origin main
```

2. Vá em [vercel.com](https://vercel.com), clique em "Add New Project" e importe
   o repositório que você acabou de criar.
3. Na tela de configuração do projeto, abra "Environment Variables" e adicione
   as mesmas duas variáveis do seu `.env` (`DATABASE_URL` e `ANTHROPIC_API_KEY`).
4. Clique em "Deploy". Em poucos minutos, a Vercel te dá uma URL pública
   (algo como `hub-azul.vercel.app`).

Pronto — a plataforma está no ar.

## Passo 9 — Domínio próprio (opcional)

Se quiser usar um domínio como `hubazul.com.br` em vez do endereço da Vercel:

1. Registre o domínio em um registrador (Registro.br para `.com.br`, ou GoDaddy/Namecheap para outros).
2. No painel da Vercel, vá em "Settings" → "Domains" do seu projeto e adicione o domínio.
3. A Vercel te dá registros DNS para configurar no painel do registrador. Siga as
   instruções exibidas (leva de minutos a até 48h para propagar).

## Como popular o diretório com dados reais de empresas

Use o script de ingestão de CNPJ, que já vem configurado com os códigos CNAE
mapeados para cada subsetor da economia azul (ver planilha
`HUB_Azul_CNAEs_e_Filtro_Geografico.xlsx` para a referência completa):

```bash
npm run ingest:cnpj -- --uf=BA --subsetor=AQUICULTURA_PESCA
```

Rode sem os filtros `--uf` e `--subsetor` para varrer todos os subsetores em
todos os 17 estados costeiros — mas atenção: isso é uma quantidade grande de
chamadas à API pública usada (OpenCNPJ), então é melhor rodar estado por estado
nas primeiras vezes.

Importante: o script depende da API pública do OpenCNPJ (https://opencnpj.org)
estar disponível e manter o mesmo formato de resposta. Verifique a documentação
atual deles antes da primeira execução — provedores de dados abertos
ocasionalmente mudam endpoints sem aviso prévio.

## Estrutura do projeto

```
app/
  dashboard/        → página principal (métricas, filtros, diretório)
  cadastro/          → formulário de auto-cadastro de empresas
  empresas/[id]/      → perfil de empresa, matches e chat de IA
  api/
    empresas/         → listar e criar empresas
    investidores/      → listar e criar investidores
    oportunidades/     → listar e criar oportunidades (editais, rodadas)
    matching/          → consultar e recalcular matches
    chat/              → chat de IA com tool use restrito aos dados próprios
lib/
  prisma.ts           → cliente do banco de dados
  matching.ts         → motor de matching (lógica de compatibilidade)
  referencias.ts      → subsetores, estágios, CNAEs por subsetor
prisma/
  schema.prisma       → estrutura do banco de dados
scripts/
  seed.ts             → popula com dados de exemplo
  ingest-cnpj.ts      → popula com dados reais via CNPJ público
```

## Próximos passos depois do ar

- Validar o script de ingestão de CNPJ contra a documentação mais recente do
  provedor de dados escolhido (a API pode ter mudado desde a escrita deste código).
- Mover a curadoria de editais (FINEP, BNDES, CNPq) de cadastro manual via API
  para um scraper agendado, já que essas fontes não oferecem API estruturada.
- Adicionar autenticação (NextAuth.js é a opção mais comum no ecossistema Next.js)
  antes de abrir o auto-cadastro publicamente, para evitar spam.
- Configurar um cron job (Vercel Cron, por exemplo) para recalcular matches
  periodicamente, não só quando uma empresa/oportunidade é criada.
