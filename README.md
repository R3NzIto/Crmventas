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

## Requisitos

- Node.js 20+
- Docker Desktop
- npm

## Setup Local

1. Instalar dependencias:

```bash
npm ci
```

2. Crear `.env.local` desde `.env.example` y ajustar secretos locales:

```bash
cp .env.example .env.local
```

3. Levantar PostgreSQL y Redis:

```bash
docker compose up -d
```

4. Aplicar migraciones y seed:

```bash
npm run prisma:migrate
npm run db:seed
```

5. Iniciar Next.js:

```bash
npm run dev
```

App local: `http://localhost:3000`

## Usuario Demo

- Email: `demo@crmventas.local`
- Password: `Demo1234!`

## Scripts

```bash
npm run dev              # Next.js dev server
npm run typecheck        # TypeScript
npm test                 # Unit tests
npm run test:e2e         # Playwright E2E
npm run prisma:migrate   # Prisma migrate dev con .env.local
npm run db:seed          # Seed demo
npm run worker:workflows # Worker BullMQ de automatizaciones
```

## Healthcheck

```bash
GET /api/health
```

Devuelve `200` si PostgreSQL y Redis responden. Devuelve `503` si alguna dependencia falla.

## Flujo Demo Cubierto

- Login al dashboard comercial.
- Formulario público crea contacto, submission, workflow y deal.
- Leads IA crean oportunidades automáticamente.
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

Los E2E usan datos únicos y limpian contactos de prueba con emails `@e2e.local` o source `e2e`.
