# Deploy Checklist

Target para demo privada:

- Web: Vercel
- Database: Neon PostgreSQL
- Queue: Upstash Redis
- Workers: Railway

## 1. Variables

Configurar las mismas variables base en Vercel y Railway:

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

## 2. Vercel

- Install command: `npm ci`
- Build command: `npm run build`
- No configurar workers en Vercel.

`postinstall` ejecuta `prisma generate`, por lo que el build debe tener el cliente Prisma disponible.

## 3. Neon

Aplicar migraciones antes de probar:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Para demo/staging, correr seed manualmente solo si se necesita el usuario demo:

```bash
DATABASE_URL="postgresql://..." npx prisma db seed
```

No automatizar `db:seed` en produccion.

## 4. Railway

Crear dos servicios worker desde el mismo repositorio:

```bash
npm run worker:workflows
npm run worker:inbox
```

Ambos deben usar `DATABASE_URL` y `REDIS_URL` de staging/produccion. Si Upstash entrega `rediss://`, la app habilita TLS automaticamente.

## 5. Smoke Test

```bash
curl https://tu-app.vercel.app/api/health
```

Esperado: status HTTP `200`.

Luego validar:

- Login demo.
- Dashboard carga metricas.
- Contactos y pipelines responden.
- Formulario publico crea contacto/deal.
- Logs de Railway muestran workers activos sin errores de Redis.
