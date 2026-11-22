# CODI · DOOH

Kiosco **CoDi + DOOH** y plataforma de anuncios de autoservicio:

- **Kiosco**: microcobros con transferencia QR (Pey) a **0% comisión** y pantalla de
  anuncios en la columna izquierda.
- **Anunciantes** (`/anunciantes`): suben un video, ven cómo se verá en el kiosco,
  eligen pantallas y publican. Ven reproducciones, horarios y **pagos hechos con
  CoDi mientras corría su anuncio**.
- **Hosts** (`/host`): dan de alta su negocio, CLABE, sitios y pantallas, obtienen el
  link del kiosco con QR y ven lo que ganan por anuncios (70% por defecto).
- **Admin** (`/admin`): totales, moderación de videos, precio y comisión,
  organizaciones y datos de demo.

Live: https://codi-dooh.vercel.app

## Arranque local

No necesitas configurar nada para empezar:

```bash
npm install
npm run db:seed   # opcional: datos de demo (con el servidor apagado)
npm run dev
```

Sin `DATABASE_URL` la app usa un Postgres dentro del mismo proceso (PGlite) guardado
en `.data/pglite`, y sin Blob los videos se guardan en `.data/uploads`. Para cobrar
de verdad copia `.env.example` a `.env.local` y pon tu `PEY_API_KEY`.

- Kiosco: http://localhost:3000 (`/?profile=bathroom|parking|laundry`)
- Entrar: http://localhost:3000/entrar (admin: `admin@codidooh.mx` / `codidooh` en local)
- Crear cuenta: http://localhost:3000/registro

## Rutas principales

| Ruta | Quién | Qué |
| --- | --- | --- |
| `/registro`, `/entrar` | todos | Cuenta de anunciante o host |
| `/anunciantes`, `/anunciantes/campanas/nueva`, `/anunciantes/campanas/[id]` | anunciante | Campañas, creador y resultados |
| `/host`, `/host/ingresos`, `/host/pantallas`, `/host/bienvenida`, `/host/campanas` | host | Resumen, dinero, pantallas, alta y anuncios propios |
| `/admin`, `/admin/creativos`, `/admin/campanas`, `/admin/organizaciones`, `/admin/ajustes` | admin | Operación de la plataforma |
| `/?profile=parking&screen=<id>&token=<t>&session=1` | kiosco | Pantalla vinculada: anuncios en vivo y proof of play |
| `GET /api/dooh/playlist?screen=<id>` | kiosco | Lista de anuncios (rotación ponderada, caché corta) |
| `POST /api/dooh/plays` | kiosco | Reproducciones, firmadas con el token de la pantalla |

Sin `screen=` el kiosco funciona exactamente como antes, con los videos de `public/ads`.

## Cómo está hecho

- Next.js 16 (App Router, Cache Components), Tailwind 4 con los tokens `--cd-*`.
- Postgres con Drizzle ORM: Neon en Vercel, PGlite en local y en pruebas. Esquema en
  `lib/db/schema.ts`, migraciones versionadas en `drizzle/` (se aplican solas en el
  build de Vercel).
- Sesión con contraseña (scrypt) y cookie firmada. Toda consulta de datos recibe la
  organización desde la sesión (`lib/auth/dal.ts` → `OrgCtx` → `lib/data/*`).
- Videos en Vercel Blob con subida directa desde el navegador; el servidor vuelve a
  revisar cada MP4 (`lib/video/`).
- Lógica pura con pruebas: CLABE (`lib/clabe.ts`), rotación (`lib/rotation.ts`),
  atención verificada (`lib/attention.ts`), dinero (`lib/revenue.ts`, `lib/pricing.ts`),
  tokens de pantalla (`lib/screen-token.ts`), firma de webhooks.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor local |
| `npm run build` | Migraciones (si hay `DATABASE_URL`) y build |
| `npm run test` | Pruebas (Vitest + PGlite) |
| `npm run lint` / `npm run typecheck` | Revisión de código y tipos |
| `npm run db:seed` | Datos de demo (todo marcado como demo; se puede repetir) |
| `npm run db:generate` / `npm run db:migrate` | Crear o aplicar migraciones |

## Producción (Vercel)

1. **Storage → Neon**: crea `DATABASE_URL` (Production, Preview y Development).
2. **Storage → Blob**: crea el store para los videos.
3. **Environment Variables**: `SESSION_SECRET` (cadena larga aleatoria),
   `PORTAL_ADMIN_EMAIL` y `PORTAL_ADMIN_PASSWORD` (fuerte), `PEY_API_KEY` y, si Pey
   te da una, `PEY_WEBHOOK_SECRET`.
4. Despliega. Para la demo: `/admin` → **Cargar datos de demo**.

Todas las variables están explicadas en `.env.example`.

## Documentos

- Guion de la demo: [`docs/demo-script.md`](docs/demo-script.md)
- Roadmap y lo que quedó fuera: [`docs/ads-roadmap.md`](docs/ads-roadmap.md)
- Design system: [`design/README.md`](design/README.md), [`design/SPEC.md`](design/SPEC.md),
  [`.cursor/rules/codidooh.mdc`](.cursor/rules/codidooh.mdc)
- Hardware (ESP32 + relé): [`firmware/esp32-relay/README.md`](firmware/esp32-relay/README.md)
