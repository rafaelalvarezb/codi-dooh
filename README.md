# CODI · DOOH

Kiosco inteligente **Plug & Play** para microcobros con **CoDi** (vía [Pey](https://docs.pey.mx)) a **0% de comisión**, monetizado con publicidad **DOOH** programática (Revenue Share).

## Qué hace

- Pantalla kiosco a pantalla completa (sin scroll ni chrome web).
- Panel DOOH (70%) con campañas rotativas por caso de uso.
- Terminal CoDi (30%) que genera QR reales con la API de Pey (`POST /codi/qr`).
- Confirmación de pago por polling a `GET /transaction/codi/qr/{id}` (+ webhook opcional).
- Casos de uso: Estacionamiento · Lavandería / Recarga · Baños Públicos.
- Monto de prueba hackathon: **$0.01 MXN**.

## Arranque local (pasos simples)

1. Abre una terminal en esta carpeta del proyecto.
2. Asegúrate de tener el archivo `.env.local` (ya está creado en tu máquina; no se sube a GitHub).
3. Instala dependencias (solo la primera vez):

```bash
npm install
```

4. Levanta el kiosco:

```bash
npm run dev
```

5. Abre en el navegador: [http://localhost:3000](http://localhost:3000)

6. Prueba el flujo:
   - Cambia el caso de uso arriba a la derecha.
   - Pulsa **Pagar con CoDi ($0.01 MXN)**.
   - Escanea el QR con tu app bancaria (monto real de $0.01).
   - Espera la confirmación SPEI y la animación de éxito / relé.

## Variables de entorno

Copia `.env.example` → `.env.local` y coloca tu API key de Pey:

```env
PEY_API_KEY=sk_live_your_key_here
PEY_API_BASE_URL=https://api.pey.mx
```

Documentación oficial: https://docs.pey.mx

## Arquitectura

```
app/                  # App Router + API routes
  api/codi/
    create-qr/        # POST → Pey /codi/qr
    status/           # GET  → Pey /transaction/codi/qr/{id}
    webhook/          # POST ← Pey codi.qr.payment_received
components/           # UI del kiosco
lib/                  # Cliente Pey tipado + casos de uso
```

## Seguridad

- La API key **nunca** va en el código fuente.
- `.gitignore` bloquea `.env`, `.env.*` y permite solo `.env.example`.
- Las llamadas a Pey se hacen **solo en el servidor** (route handlers).
