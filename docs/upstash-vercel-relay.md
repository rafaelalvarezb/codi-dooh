# Relé en producción (Vercel + Upstash Redis) — sin Mac

Objetivo: iPad abre `https://codi-dooh.vercel.app/?profile=bathroom`, pagas CoDi, el ESP32 recibe el pulse **sin** Terminal en el Mac.

El código ya usa Redis si existen estas variables:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## Parte A — Crear Redis gratis (solo tú, ~2 min)

1. Abre https://console.upstash.com y crea cuenta (gratis) o inicia sesión.
2. **Create Database** → Redis.
3. Nombre: `codi-dooh-relay`.
4. Región cercana (ej. `us-east-1`).
5. Plan: **Free**.
6. Create.
7. En la base, pestaña **REST API** / Details, copia:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

**No pegues el token en el chat.** Solo en Vercel (abajo).

### Alternativa CLI (si prefieres)

1. En https://console.upstash.com → Account → API Keys → crea API key.
2. En tu Mac Terminal:

```bash
npx --yes @upstash/cli@latest login --email TU_EMAIL --api-key TU_API_KEY
npx --yes @upstash/cli@latest redis create --name codi-dooh-relay --region us-east-1
npx --yes @upstash/cli@latest redis list
```

Luego abre la DB en la consola y copia URL + token REST.

## Parte B — Pegar en Vercel (producción)

1. https://vercel.com → proyecto **codi-dooh** → **Settings** → **Environment Variables**.
2. Agrega (Production + Preview):

| Name | Value |
|------|--------|
| `UPSTASH_REDIS_REST_URL` | (el de Upstash) |
| `UPSTASH_REDIS_REST_TOKEN` | (el de Upstash) |

3. **Redeploy** producción (Deployments → ⋮ → Redeploy) para que cargue las vars.

Si el agente tiene Vercel MCP autenticado, puede crear las vars por ti **si le pasas los valores en un canal seguro** o si tú las pegas en el dashboard.

## Parte C — ESP32 (una línea)

En Arduino, cambia solo:

```cpp
const char* POLL_URL = "https://codi-dooh.vercel.app/api/relay/events";
```

(WiFi del lugar de la demo; red **2.4 GHz**.)  
Upload → EN → Serial: `IP ...` y luego `HTTP 200` / `poll ok`.

## Parte D — Probar

1. iPad (o celular): `https://codi-dooh.vercel.app/?profile=bathroom`
2. Paga $0.01 con la app del banco.
3. Serial: `Pulse...` + clic de chapa.

Prueba rápida sin pagar:

```bash
curl -X POST https://codi-dooh.vercel.app/api/relay/pulse \
  -H 'Content-Type: application/json' \
  -d '{"durationMs":3000,"reason":"test-vercel-redis"}'
```

La respuesta debe decir `"mode":"redis"` (no `"simulated"`).

## Qué ya hizo el agente en el repo

- `lib/relay.ts` encola/consume pending vía Upstash cuando hay env vars.
- `.env.example` documenta las dos variables.
- Este doc: guía completa.
