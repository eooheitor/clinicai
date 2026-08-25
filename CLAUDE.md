# ClinicAI — Guia para Agentes de IA

## O que é este projeto

SaaS multi-tenant de atendente IA para WhatsApp com agendamento automático.
Cada cliente (clínica/empresa) tem sua própria instância de WhatsApp, configurações de IA e agenda.

---

## Estrutura do monorepo

```
apps/api/   → backend Express + Prisma (porta 3001)
apps/web/   → frontend Next.js 16 (porta 3000)
docker/     → Dockerfiles extras (evolution com patch @lid)
```

Um único `node_modules` na raiz via npm workspaces. Um único `.env` na raiz.

---

## Comandos essenciais

```bash
# Rodar localmente (sempre da raiz do projeto)
docker compose up -d      # sobe postgres:5432 + evolution:8080
npm run dev:api           # API na porta 3001
npm run dev:web           # painel na porta 3000

# Banco de dados (pare a API antes de rodar migrations)
npm run db:deploy         # aplica migrações pendentes
npm run db:migrate        # cria nova migração + aplica (dev)
npm run db:studio         # Prisma Studio no browser

# Build
npm run build:api         # compila TS → apps/api/dist/
npm run build:web         # build produção Next.js
```

---

## Variáveis de ambiente

**Um único `.env` na raiz** serve para API, frontend e scripts Prisma.

- API: carrega via `dotenv({ path: "../../../../.env" })` em `apps/api/src/config/index.ts`
- Web: carrega via `dotenv({ path: "../../.env" })` em `apps/web/next.config.ts`
- Prisma CLI: usa `dotenv-cli` nos scripts → `dotenv -e ../../.env prisma ...`

Nunca crie `.env` dentro de `apps/api/` ou `apps/web/` — vai partir o fluxo.

---

## API — apps/api

### Arquitetura

```
src/
├── config/index.ts        # carrega .env + valida com Zod → exporta `config`
├── database/prisma.ts     # singleton do PrismaClient
├── index.ts               # entry point, registra rotas e middlewares
├── routes/
│   ├── auth.routes.ts     # /auth/* — login, setup, /me
│   ├── panel.routes.ts    # /panel/* — tudo que o painel usa (requer JWT)
│   └── admin.routes.ts    # /admin/* — rotas legadas (verificar se ainda usa)
├── services/
│   ├── openai.service.ts  # chamadas à OpenAI (modelo ativo)
│   ├── claude.service.ts  # Anthropic (desativado, mantido para rollback)
│   ├── conversation.service.ts  # lógica principal do atendimento IA
│   ├── evolution.service.ts     # envia mensagens via Evolution API
│   ├── calendar.service.ts      # Google Calendar
│   └── transcription.service.ts # transcrição de áudio via Groq/Whisper
├── webhooks/
│   └── evolution.webhook.ts   # recebe eventos do WhatsApp
├── middleware/            # autenticação JWT
└── jobs/
    └── reminder.job.ts    # lembrete 24h antes do agendamento
```

### Autenticação

JWT no header `Authorization: Bearer <token>`. O middleware extrai `userId`, `clinicId` e `role` e coloca em `req.user`.

Roles: `MASTER` (acesso total) e `CLINIC` (acesso ao próprio tenant).

### Padrão de rotas

Todas as rotas do painel usam `req.user.clinicId` para isolar dados por tenant. Nunca exponha dados de outras clínicas.

### Prisma

Schema em `apps/api/prisma/schema.prisma`. Migrações em `apps/api/prisma/migrations/`.

**IMPORTANTE:** `prisma migrate dev` usa advisory lock no PostgreSQL. Se a API estiver rodando quando você tentar migrar, vai travar. Sempre pare a API antes.

Se travar, libere manualmente:
```bash
docker exec clinicai-postgres psql -U fluxoia -d fluxoiazap \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='fluxoiazap' AND pid <> pg_backend_pid();"
```

### Build TypeScript

`npm run build:api` vai reportar erros em `req.query` (`string | string[]`). São erros pré-existentes, não introduza mais. O Dockerfile usa `tsc || true`. Em runtime o `tsx watch` não verifica tipos, então não afeta o dev.

---

## Frontend — apps/web

### Next.js 16 — breaking changes

Esta versão tem mudanças de API em relação ao que modelos de IA conhecem do treinamento. Consulte `node_modules/next/dist/docs/` antes de usar APIs específicas. Respeite os avisos de depreciação.

### Estrutura das páginas

```
app/
├── layout.tsx                  # root layout: carrega fontes, Toaster, script de tema
├── page.tsx                    # redireciona para /dashboard ou /login
├── login/page.tsx
└── (dashboard)/
    ├── layout.tsx              # sidebar + proteção de rota (lê JWT do localStorage)
    ├── dashboard/page.tsx
    ├── conversas/
    │   ├── page.tsx            # lista de conversas
    │   └── [id]/page.tsx       # chat individual
    ├── clientes/page.tsx
    ├── agendamentos/page.tsx
    ├── whatsapp/page.tsx
    ├── configuracao/page.tsx
    ├── perfil/page.tsx
    ├── usuarios/page.tsx       # só role MASTER
    └── master/page.tsx         # só role MASTER
```

### Autenticação no frontend

`lib/auth.ts` — guarda token e dados do usuário no `localStorage`. Não tem contexto React global; cada página/layout chama `getUser()` diretamente.

### Chamadas à API

`lib/api.ts` — wrapper fetch que injeta `Authorization` header automaticamente e lança erro com a mensagem da API.

### Tailwind v4 — breaking changes

**Não é o Tailwind que você conhece.** Diferenças importantes:

- Config em `globals.css` com `@theme inline { }`, não em `tailwind.config.js`
- Variantes customizadas com `@custom-variant`
- CSS vars do shadcn mapeados via `--color-*: var(--*)` no `@theme inline`
- Cores customizadas da marca também ficam no `@theme inline`

### Sistema de cores (paleta da marca)

CSS vars definidos em `apps/web/app/globals.css`:

**Tema escuro (`.dark`):**
```css
--bg-0: #080d12      /* fundo principal */
--bg-1: #0d1520      /* sidebar */
--bg-card: #0f1a28   /* cards */
--aqua: #00d2c8      /* cor de marca principal */
--aqua-dim: #00a89f  /* variante escura */
--aqua-glow: rgba(0,210,200,.18)  /* background de ícones/highlight */
--cta: #00e5dc       /* botão primário */
--cta-glow: rgba(0,229,220,.28)   /* sombra do botão */
--txt-1: #e8f4f3     /* texto principal */
--txt-2: #94b4b2     /* texto secundário */
--txt-3: #5a7a78     /* texto terciário */
```

**Tema claro (`:root`):**
```css
--bg-0: #f7fffe    --aqua: #00a89f    --txt-1: #0d1520
--bg-1: #eef9f8    --aqua-dim: #00877f  --txt-2: #2d5a57
--bg-card: #fff    --cta: #00d2c8     --txt-3: #5a7a78
```

O shadcn mapeia: `--primary = --aqua`, `--background = --bg-0`, `--card = --bg-card`, etc.

**Como usar nas classes Tailwind:**
```tsx
bg-primary           // aqua (via --primary)
text-muted-foreground // txt-2/txt-3 (via shadcn)
bg-[var(--aqua-glow)] // glow de fundo
bg-[var(--cta)]       // botão CTA com glow
shadow-[0_0_24px_var(--cta-glow)]  // glow no botão
shadow-[inset_3px_0_0_var(--aqua)] // indicador lateral ativo (sidebar)
```

### Tema claro/escuro

`components/theme-toggle.tsx` — persiste em `localStorage['clinic-theme']`. Default: dark. O `apps/web/app/layout.tsx` tem um script inline que lê o localStorage antes do primeiro paint para evitar flash.

### Turbopack — monorepo

`apps/web/next.config.ts` define `turbopack.root` apontando para a raiz do monorepo (`path.resolve(__dirname, "../..")`). Isso é necessário porque o `node_modules/next` está na raiz, não em `apps/web/`. Não remova essa configuração.

---

## Docker

### Desenvolvimento local

`docker-compose.yml` — só infra: postgres e evolution. A API e o frontend rodam diretamente com `npm run dev:*`.

### Produção

`docker-compose.prod.yml` — stack Swarm completo com Traefik. Use variáveis `DOMAIN_API` e `DOMAIN_WEB` para os domínios. O frontend precisa do build-arg `NEXT_PUBLIC_API_URL` em tempo de build.

### Evolution API

`docker/evolution.Dockerfile` — patch que permite envio para JIDs `@lid` (WhatsApp Privacy IDs) sem falhar na validação `onWhatsApp`. Necessário para contatos que aparecem como `@lid` em grupos.

---

## Regras gerais para edição

- Sempre rode os comandos da **raiz do projeto** (`/home/heitor/saas-fluxoia`), não de dentro de `apps/api/` ou `apps/web/`
- Nunca crie arquivos `.env` dentro dos apps — só existe `.env` na raiz
- Nunca faça `npm install` dentro de `apps/api/` ou `apps/web/` — sempre na raiz
- Ao adicionar dependência: `npm install <pkg> --workspace=apps/api` ou `--workspace=apps/web`
- Ao criar migration: pare a API antes, depois `npm run db:migrate -- --name descricao`
- Não adicione comentários de código desnecessários — o código deve ser autoexplicativo
- Não crie arquivos de documentação extras além deste CLAUDE.md e o README.md
- Nomeie branches como `tipo-descricao-da-atividade`, em kebab-case, sem barra. `tipo` é `feat`, `fix` ou `bug`. Exemplo: `fix-arquivos-dockerfile-incorretos`
