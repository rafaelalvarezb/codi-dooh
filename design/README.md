# codidooh · Handoff para Cursor

Experiencia final del panel de pago CoDi para pantallas DOOH.

## Contenido
- `SPEC.md`: la experiencia completa (layout, variantes, estados, copy, máquina de estados, props).
- `tokens.css`: design system en variables CSS (color, tipo, espacio, radios, animaciones).
- `assets/` → el logo vive en `/public/brand/codi-logo.png`.
- `reference/panel.html`: referencia funcional en HTML puro. Ábrela en el navegador y usa los botones de arriba para ver cada estado.
- `.cursor/rules/codidooh.mdc`: regla que Cursor carga sola para respetar el sistema.

## Cómo usarlo
Los tokens se importan desde `app/globals.css`. El panel React vive en `components/CodiPanel.tsx` y debe seguir `SPEC.md` al pie de la letra.
