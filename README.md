# CODI · DOOH

Kiosco **CoDi + DOOH**: microcobros con transferencia QR (Pey) a **0% comisión**,
pantalla de anuncios a full-bleed, y portal lean de operación.

Live: https://codi-dooh.vercel.app · Portal: https://codi-dooh.vercel.app/portal

## Qué incluye

- Kiosco SPEC (`design/`): panel CoDi 420px + DOOH `object-cover`.
- Estados: esperando → confirmando → recibido (+ vencido / rechazado / no-disponible).
- Perfiles: `/?profile=bathroom|parking|laundry` · hints con `&demo=1`.
- Portal `/portal`: login, máquinas, transacciones, resumen día/semana.
- Firmware scaffold: `firmware/esp32-relay` (poll `/api/relay/events`).
- Ads roadmap: `docs/ads-roadmap.md` (manual → locales → DV360).

## Arranque local

```bash
cp .env.example .env.local   # pon tu PEY_API_KEY
npm install
npm run dev
```

- Kiosco: http://localhost:3000  
- Portal: http://localhost:3000/portal (admin@codidooh.mx / codidooh)

## Design system

Ver [`design/README.md`](design/README.md), [`design/SPEC.md`](design/SPEC.md) y
la regla Cursor [`.cursor/rules/codidooh.mdc`](.cursor/rules/codidooh.mdc).
Tokens: `design/tokens.css` (importados en `app/globals.css`).

## Hardware (cuando llegue el kit)

ESP32 + relé 5V (+ chapa 12V opcional). Guía: [`firmware/esp32-relay/README.md`](firmware/esp32-relay/README.md).

## Variables

Ver `.env.example` (`PEY_*`, `PORTAL_*`, `RELAY_BRIDGE_URL`).
