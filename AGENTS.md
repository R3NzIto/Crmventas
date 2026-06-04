# AGENTS.md — HighLevel Clone (SaaS Multi-tenant)

## Contexto del proyecto
Plataforma SaaS tipo HighLevel: CRM, automatización de marketing y ventas, multi-tenant, orientada a agencias digitales. Cada agencia (tenant) opera de forma aislada con sus propios datos, usuarios y configuraciones.

## Stack tecnológico
- Framework: Next.js 14 con App Router y TypeScript estricto
- ORM: Prisma + PostgreSQL
- Auth: NextAuth.js (JWT, sesiones por tenant)
- UI: Tailwind CSS + shadcn/ui
- Cola de tareas: BullMQ + Redis
- Validación: Zod en todas las rutas API
- Testing: Vitest + Testing Library

## Estructura de carpetas obligatoria
```
src/
  app/                    # Next.js App Router
    (auth)/               # Rutas públicas: login, register
    (dashboard)/          # Rutas protegidas: /contacts, /pipelines, etc.
    api/                  # Route Handlers
  modules/
    crm/                  # Lógica de contactos
    pipelines/            # Lógica de pipelines y deals
    inbox/                # Bandeja unificada
    workflows/            # Motor de automatizaciones
    forms/                # Formularios
    agency/               # Gestión de agencia / marca blanca
  services/               # Lógica de negocio desacoplada de las rutas
  lib/                    # Prisma client, auth config, utils
  components/             # Componentes UI reutilizables
  workers/                # BullMQ workers
prisma/
  schema.prisma
```

## Reglas de código
- TypeScript estricto: NUNCA usar `any`. Tipado explícito en funciones y modelos.
- Todo query a la DB debe filtrar por `agencyId` para garantizar aislamiento entre tenants.
- La lógica de negocio va en `/services`, no en las Route Handlers.
- Las Route Handlers solo validan con Zod, llaman al servicio y retornan respuesta.
- Usar `async/await`, nunca callbacks `.then()` anidados.
- Manejo de errores con try/catch y respuestas HTTP semánticas (400, 401, 403, 404, 500).
- Todas las variables de entorno en `.env.local` y documentadas en `.env.example`.

## Convenciones de naming
- Archivos y carpetas: kebab-case
- Componentes React: PascalCase
- Funciones y variables: camelCase
- Tipos e interfaces: PascalCase con prefijo de módulo (e.g. `CrmContact`, `PipelineDeal`)
- Constantes globales: UPPER_SNAKE_CASE

## Validación y definición de "done"
Codex no debe marcar una tarea como completa a menos que:
1. El código compile sin errores TypeScript
2. Las rutas API tengan validación Zod
3. Existan tests unitarios para los servicios nuevos
4. El filtrado por `agencyId` esté presente en todos los queries

## Comportamiento del agente
- Nunca mostrar planes o resúmenes antes de ejecutar. Actuar directamente.
- Crear tests al mismo tiempo que el código de producción, no después.
- Si hay ambigüedad en los requisitos, elegir la solución más simple y anotarla como TODO.
- No generar datos de seed innecesarios. Usar factories/fixtures en tests.
- Al terminar una tarea, ejecutar `npx tsc --noEmit` para verificar tipos.