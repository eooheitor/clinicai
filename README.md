# ClinicAI

Atendente IA para WhatsApp com agendamento automático — Multi-tenant SaaS.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| API | Node.js 20 + TypeScript + Express |
| ORM | Prisma 5 + PostgreSQL 16 |
| Frontend | Next.js 16 + Tailwind v4 + shadcn/ui |
| IA | OpenAI GPT-4o (Anthropic Claude como fallback) |
| WhatsApp | Evolution API v1.8.7 |
| Agenda | Google Calendar API |
| Infra | Docker + Docker Swarm + Traefik |

---

## Estrutura do projeto

```
clinicai/
├── apps/
│   ├── api/                  # Express backend
│   │   ├── src/
│   │   │   ├── config/       # Carrega .env e valida com Zod
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── webhooks/
│   │   │   ├── jobs/
│   │   │   └── database/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── Dockerfile
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── web/                  # Next.js frontend
│       ├── app/              # App Router (páginas e layouts)
│       ├── components/       # Componentes React + shadcn/ui
│       ├── lib/              # Utilitários (api.ts, auth.ts)
│       ├── hooks/
│       ├── Dockerfile
│       ├── next.config.ts    # Carrega .env raiz via dotenv
│       └── package.json
├── docker/
│   └── evolution.Dockerfile  # Patch @lid para WhatsApp Privacy IDs
├── scripts/
│   └── setup-vps.sh
├── .env                      # ← único arquivo de env (gitignored)
├── .env.example              # ← template — copie para .env
├── .gitignore
├── .rsyncignore
├── docker-compose.yml        # Infra local: postgres + evolution
├── docker-compose.prod.yml   # Stack de produção: Swarm + Traefik
├── package.json              # Workspace root — scripts unificados
└── README.md
```

### Por que monorepo com npm workspaces?

- **Um único `node_modules`** na raiz — sem duplicação
- **Um único `package-lock.json`** — lock consistente
- **Um único `.env`** na raiz — API e frontend leem do mesmo arquivo
- Scripts unificados: `npm run dev:api`, `npm run dev:web`, etc.

---

## Desenvolvimento local

### Pré-requisitos

- Node.js 20+ — recomendado via [nvm](https://github.com/nvm-sh/nvm): `nvm use 20`
- Docker + Docker Compose

### 1. Clonar e instalar dependências

```bash
git clone <repo> clinicai
cd clinicai
npm install
```

`npm install` instala tudo de uma vez e gera o Prisma client automaticamente via `postinstall`.

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` com suas chaves reais. Um único arquivo na raiz serve para a API, o frontend e os scripts do Prisma.

> **Como funciona:**
> - A API carrega via `dotenv` com path explícito em `apps/api/src/config/index.ts`
> - O Next.js carrega via `dotenv` em `apps/web/next.config.ts`
> - Os scripts Prisma usam `dotenv-cli`: `dotenv -e ../../.env prisma ...`

### 3. Subir infra local

```bash
docker compose up -d
```

Sobe PostgreSQL (5432) e Evolution API (8080). Os dados persistem em volumes Docker nomeados.

### 4. Aplicar migrações

```bash
npm run db:deploy
```

> **Atenção:** nunca rode `db:deploy` ou `db:migrate` com a API rodando — o Prisma usa advisory locks no PostgreSQL e vai travar. Pare a API primeiro.

### 5. Criar o primeiro usuário MASTER

Só funciona uma vez (endpoint desativado após o primeiro uso):

```bash
curl -X POST http://localhost:3001/auth/setup \
  -H "Content-Type: application/json" \
  -H "x-admin-key: admin123" \
  -d '{"email": "admin@clinicai.com", "password": "admin123", "name": "Admin"}'
```

### 6. Rodar os servidores

```bash
# Terminal 1
npm run dev:api    # porta 3001

# Terminal 2
npm run dev:web    # porta 3000
```

Acesse o painel em [http://localhost:3000](http://localhost:3000).

---

## Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev:api` | API em modo watch (`tsx watch`) |
| `npm run dev:web` | Frontend com Turbopack |
| `npm run build:api` | Compila TypeScript → `apps/api/dist/` |
| `npm run build:web` | Build de produção Next.js |
| `npm run db:deploy` | Aplica migrações pendentes (produção/CI) |
| `npm run db:migrate` | Cria e aplica nova migração (dev) |
| `npm run db:studio` | Abre Prisma Studio no browser |
| `npm run db:generate` | Regenera o Prisma client manualmente |

> `npm run build:api` vai reportar erros TypeScript existentes em `req.query` (tipo `string | string[]`). Esses erros são pré-existentes e não afetam o runtime — o Dockerfile usa `tsc || true`. A correção é backlog.

---

## Frontend

### Tema claro / escuro

O painel tem alternância de tema via botão sol/lua no rodapé da sidebar. A preferência persiste em `localStorage` com a chave `clinic-theme`. O default é tema escuro.

**Paleta:** dark navy `#080d12` + aqua `#00d2c8` no modo escuro; branco `#f7fffe` + aqua `#00a89f` no modo claro.

### Variáveis de ambiente do frontend

Somente `NEXT_PUBLIC_API_URL` é necessária. Está no `.env` da raiz junto com as demais variáveis.

---

## Produção — Docker

### Build das imagens

```bash
# API
docker build -t clinicai-api:latest ./apps/api

# Frontend — passe a URL pública da API
docker build -t clinicai-web:latest \
  --build-arg NEXT_PUBLIC_API_URL=https://api.meudominio.com \
  ./apps/web

# Evolution API com patch @lid (WhatsApp Privacy IDs)
docker build -t clinicai-evolution:latest \
  -f ./docker/evolution.Dockerfile .
```

### Deploy com Docker Swarm

Edite `docker-compose.prod.yml` e defina as variáveis de domínio, depois:

```bash
docker stack deploy -c docker-compose.prod.yml clinicai
```

Os serviços ficam atrás do Traefik com TLS automático via Let's Encrypt.

---

## Google Calendar

1. Acesse [console.cloud.google.com](https://console.cloud.google.com) e crie um projeto
2. Ative a **Google Calendar API**
3. Crie credenciais **OAuth2 — Aplicativo da Web**
4. URI de redirecionamento autorizado: `http://localhost:3001/admin/google/callback`
5. Copie `Client ID` e `Client Secret` para `.env`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=http://localhost:3001/admin/google/callback
   ```
6. No painel, vá em **Configurações → Google Calendar** para conectar a conta

---

## Rotas da API

### Autenticação

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/auth/setup` | Cria o primeiro usuário MASTER (uso único) |
| `POST` | `/auth/login` | Login — retorna JWT |
| `PATCH` | `/auth/me` | Atualiza nome, email ou senha |

### Painel (`/panel/*` — requer JWT)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/panel/dashboard` | Métricas gerais |
| `GET/PATCH` | `/panel/settings` | Configurações da clínica |
| `GET` | `/panel/conversations` | Lista conversas (filtros: search, humanMode, triagemCompleta) |
| `GET` | `/panel/conversations/:id` | Detalhe da conversa |
| `PATCH` | `/panel/conversations/:id/pausar-ia` | Ativa modo humano |
| `PATCH` | `/panel/conversations/:id/reativar-ia` | Reativa a IA |
| `POST` | `/panel/conversations/:id/send` | Envia mensagem como atendente |
| `GET` | `/panel/patients` | Lista clientes |
| `GET` | `/panel/appointments` | Agendamentos futuros |
| `PATCH` | `/panel/appointments/:id/cancel` | Cancela agendamento |
| `GET` | `/panel/whatsapp/status` | Status da conexão WhatsApp |
| `GET` | `/panel/whatsapp/qrcode` | QR Code para conectar |

### Master (`/panel/master/*` — requer role MASTER)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET/POST` | `/panel/master/clinics` | Lista / cria clínicas |
| `PATCH/DELETE` | `/panel/master/clinics/:id` | Edita / exclui clínica |
| `POST` | `/panel/master/clinics/:id/users` | Cria usuário para clínica |
| `GET` | `/panel/master/users` | Lista todos os usuários |
| `PATCH/DELETE` | `/panel/master/users/:id` | Edita / exclui usuário |
