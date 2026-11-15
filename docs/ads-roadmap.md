# Ads / comisión — roadmap (después del portal ops)

Pitch comercial (copy, no automatizado aún):

> Instalo CoDi + pantalla; te traigo anunciantes locales; yo me quedo con una
> comisión de ads; tú ganas CoDi sin comisión + ingreso extra.

## Fase A — Manual (ahora / post-portal)

- Tú cierras anunciantes locales.
- Creativos los subes tú al playlist DOOH (`lib/ads.ts` / `public/ads`).
- El operador ve en el portal solo “ingresos estimados por ads” (métrica
  manual / placeholder) — no marketplace.

## Fase B — Anunciantes locales en portal

- Operador invita anunciante local → sube creativo → tú o el operador aprueba.
- Revenue share visible en portal (ej. 70/30 comercio/Handle).
- Preguntas a cerrar antes de construir B:
  - ¿Quién factura al anunciante: Handle/codidooh o el comercio?
  - ¿Split fijo o negociable por plaza?
  - ¿El operador puede rechazar creativos (competencia, alcohol, etc.)?
  - ¿10 máquinas = 1 cuenta o multi-sede?

## Fase C — Programática / DV360

- Huecos sin creativo local se llenan con DV360 / SSP.
- El DOOH player ya tiene fallback “ANUNCIO PROGRAMÁTICO · DV360” cuando
  no hay creatividades locales.

## Orden de negocio

1. Portal ops (máquinas + transacciones CoDi) ← hecho en v1
2. Fase A manual
3. Fase B marketplace local
4. Fase C DV360
