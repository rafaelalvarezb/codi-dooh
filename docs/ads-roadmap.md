# Ads / comisión: roadmap

Pitch comercial:

> Instalo CoDi + pantalla; te traigo anunciantes; yo me quedo con una comisión
> de ads; tú ganas CoDi sin comisión + ingreso extra.

## Fase A: manual (hecha)

- Creativos fijos en `public/ads` (`lib/ads.ts`). Siguen siendo el respaldo del
  kiosco cuando no hay campañas o no hay internet.

## Fase B: Ads Manager DOOH de autoservicio (hecha en `feat/ads-platform`)

- **Anunciantes**: registro abierto, subida de casi cualquier video (MP4, MOV/HEVC, WebM, MKV;
  ≤ 250 MB) o imagen (JPG, PNG, WebP) que el servidor convierte con ffmpeg a H.264 ≤ 1280 px;
  spots de 5–15 s (videos más largos se recortan al tramo que elige la marca; imágenes = 15 s), vista previa exacta del kiosco,
  elección de pantallas y spots, publicación inmediata, analítica con
  "pagos durante tu anuncio" (atención verificada con CoDi).
- **Hosts**: alta en 4 pasos (negocio → CLABE validada → sitio → pantalla), link
  del kiosco con token y QR, rotación de token, anuncios propios sin costo,
  ingresos con reparto 70/30 y próximo pago.
- **Admin**: totales, moderación de videos, piloto vs pagada, precio y comisión,
  organizaciones con "operar como", filtro "Ocultar demo".
- **Kiosco**: playlist por pantalla cada 60 s con rotación ponderada, respaldo
  sin pantalla negra y proof of play firmado.

Decisiones abiertas que quedaron con la opción más simple (ver el PR):

- Quien factura al anunciante: por ahora solo se lleva la cuenta ("por pagar").
- Split: uno global (30/70 por defecto), configurable por el admin.
- El host no aprueba creativos; el admin modera después de publicar.

## Fuera de alcance de la fase B (siguientes pasos)

Explícitamente fuera:

- **Programática / DV360**: llenar huecos sin campañas con DV360 o un SSP. El
  reproductor ya muestra el placeholder "ANUNCIO PROGRAMÁTICO · DV360".
- **Subastas** o precio dinámico por pantalla u horario.
- **Demografía por cámara** (conteo de personas, edad, género).
- **Pagos reales a hosts y facturación (CFDI)**: hoy solo se calcula lo que se
  le debe a cada host; el depósito se hace fuera de la plataforma.
- **Hardware** nuevo (pantallas, players dedicados).

Pendientes identificados durante la construcción:

- **Cobro de campañas con CoDi**: que el anunciante pague su campaña con un QR
  (`lib/pey.ts`) antes de publicarla. Hoy queda como saldo "por pagar".
- **Precio por pantalla**: `screens.spot_price_cents` existe pero las campañas
  usan el precio global vigente al publicar.
- **Comisión congelada por mes**: si el admin cambia la comisión, se recalculan
  también los meses anteriores.
- **Reembolsos**: pausar una campaña no reduce lo que se cobra.
- **Checkout de máquina expendedora**: hoy usa el flujo de "recarga".
- **Equipos**: invitar a más personas a una organización y verificar correo.
  (Recuperar contraseña ya está hecho.)
- **Seguridad del relevador**: `POST /api/relay/pulse` no pide credenciales
  (código del módulo de hardware, no se tocó en esta fase).
- **Mensajes de validación**: los errores de formato raros salen del idioma por
  defecto de zod; los comunes ya están en español.

## Hecho después de la fase B

- **cobten.com**: página pública (`app/sitio`), con formulario "Agenda una demo"
  que llega a `/admin/contactos` y por correo (`LEADS_NOTIFY_EMAIL`).
- **app.cobten.com**: la app, separada por dominio en `proxy.ts`.
- **Videos**: conversión automática con ffmpeg (`lib/video/transcode.ts`).
- **Recuperar contraseña**: enlace de un solo uso por correo (Resend), vence en
  1 hora y cierra las sesiones anteriores.
