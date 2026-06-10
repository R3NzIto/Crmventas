# CRM Ventas

Plataforma SaaS multi-tenant tipo HighLevel para agencias digitales: CRM, pipelines, inbox unificado, formularios, automatizaciones y calificación de leads con IA.

## Stack

- Next.js 14 App Router + TypeScript estricto
- Prisma + PostgreSQL
- NextAuth.js con JWT
- Tailwind CSS + shadcn/ui
- BullMQ + Redis
- Zod en Route Handlers
- Vitest + Testing Library
- Playwright E2E

## Setup Local

Requisitos: Node.js 20+, Docker Desktop y npm.

```bash
npm ci
cp .env.example .env.local
docker compose up -d
npm run prisma:migrate
npm run db:seed
npm run dev
```

App local: `http://localhost:3000`

Usuario demo:

- Email: `demo@crmventas.local`
- Password: `Demo1234!`

## Scripts

```bash
npm run dev              # Next.js dev server
npm run build            # Build de produccion
npm run start            # Servidor Next.js de produccion
npm run typecheck        # TypeScript
npm test                 # Unit tests
npm run lint             # ESLint
npm run test:e2e         # Playwright E2E
npm run prisma:deploy    # Prisma migrate deploy para staging/produccion
npm run prisma:migrate   # Prisma migrate dev local con .env.local
npm run db:seed          # Seed demo manual
npm run worker:workflows # Worker BullMQ de automatizaciones
npm run worker:inbox     # Worker BullMQ de mensajes inbound
```

## Deploy Demo Privada

Arquitectura recomendada para pruebas:

- Vercel: app Next.js.
- Neon: PostgreSQL.
- Upstash: Redis compatible con `rediss://`.
- Railway: workers persistentes de BullMQ.

### Vercel

Configurar el proyecto con:

- Install command: `npm ci`
- Build command: `npm run build`
- Start command: no aplica en Vercel

Variables necesarias:

```bash
DATABASE_URL="postgresql://..."
REDIS_URL="rediss://..."
NEXTAUTH_URL="https://tu-app.vercel.app"
NEXTAUTH_SECRET="un-secreto-largo-y-seguro"
CHANNEL_CONFIG_ENCRYPTION_KEY="64-char-hex-or-base64-key"
OPENAI_API_KEY=""
OPENAI_LEAD_MODEL="gpt-4o-mini"
SENDGRID_API_KEY=""
SENDGRID_INBOUND_DOMAIN=""
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_PHONE_NUMBER=""
TWILIO_WHATSAPP_NUMBER=""
TWILIO_VALIDATE_SIGNATURE="true"
```

No ejecutar workers BullMQ en Vercel. Vercel solo debe servir la web y las Route Handlers.

### Neon

Antes de la primera prueba, aplicar migraciones contra Neon:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Para demo privada se puede correr el seed una sola vez y de forma manual:

```bash
DATABASE_URL="postgresql://..." npx prisma db seed
```

No automatizar `db:seed` en produccion.

### Upstash

Usar el Redis URL con TLS:

```bash
REDIS_URL="rediss://default:password@host.upstash.io:6379"
```

La app soporta `redis://` para local y `rediss://` para staging/produccion.

### Railway Workers

Crear dos servicios de worker desde el mismo repo:

```bash
npm run worker:workflows
npm run worker:inbox
```

Ambos servicios deben usar las mismas variables que Vercel para `DATABASE_URL`, `REDIS_URL`, `CHANNEL_CONFIG_ENCRYPTION_KEY` y proveedores externos.

## Healthcheck

```bash
GET /api/health
```

Devuelve `200` si PostgreSQL y Redis responden. Devuelve `503` si alguna dependencia falla.

## Flujo Demo Cubierto

- Login al dashboard comercial.
- Formulario publico crea contacto, submission, workflow y deal.
- Leads IA crean oportunidades automaticamente.
- Inbox permite crear deal, marcar hot lead, posponer, cerrar y reabrir.
- Pipeline permite crear, editar, mover y eliminar oportunidades.

## Tests

Unit tests:

```bash
npm test
```

E2E:

```bash
docker compose up -d
npm run prisma:migrate
npm run db:seed
npm run test:e2e
```

Los E2E usan datos unicos y limpian contactos de prueba con emails `@e2e.local` o source `e2e`.

## Smoke Test Staging

Despues del deploy:

1. Abrir la URL de Vercel.
2. Iniciar sesion con el usuario demo.
3. Visitar dashboard, contacts, pipelines, inbox, forms y workflows.
4. Enviar un formulario publico y verificar que cree contacto/deal.
5. Revisar logs de Railway para confirmar workers activos sin errores de Redis.
6. Abrir `/api/health` y esperar `200`.
