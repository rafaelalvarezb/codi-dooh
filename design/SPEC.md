# codidooh · Spec de la experiencia de pago CoDi

## Contexto
Pantalla tipo tablet (1280×800, horizontal) montada en máquinas (vending, estacionamiento, lavandería, acceso a baño). A la izquierda corre un anuncio programático (DV360); a la derecha, un panel fijo de 420px para cobrar con CoDi sin comisión.

El usuario final:
1. Abre la app de su banco. **La cámara normal del celular no lee códigos CoDi.**
2. Va a Transferir › QR CoDi y escanea.
3. Confirma el monto en su app. La pantalla cambia a "Pago recibido" al instante.

La pantalla no tiene marca del lugar ni de codidooh: la única marca visible es CoDi.

## Layout
```
┌──────────────────────────────── 1280 ────────────────────────────────┐
│                                              │                       │
│   Anuncio DV360 (fluido, fondo #000)         │  Panel CoDi  420px    │ 800
│                                              │  fondo #FFF           │
└──────────────────────────────────────────────┴───────────────────────┘
```
- Grid: `grid-template-columns: minmax(0,1fr) 420px`.
- Panel: padding 32px arriba, 40px a los lados. Columna flex; el footer se empuja al fondo con un spacer.
- El anuncio DOOH ocupa todo el área izquierda (`object-cover`), sin letterbox.

## Variantes del estado "esperando"
### comparativo (PRINCIPAL)
De arriba a abajo:
1. **Marca**: logo CoDi 64×64 (radio 16) + "Paga con CoDi" (24/500) + "Sistema del Banco de México" (13, muted).
2. **Monto**: hairline arriba. Concepto a la izquierda (13, muted). Monto a la derecha (44/500, tracking -0.035em, numerales tabulares) + "MXN" mono 12.
3. **QR**: tarjeta con borde 1px `line`, radio 24, padding 16. QR a 284×284. **El QR se muestra tal como lo entrega CoDi. No poner logo encima ni recortarlo.**
4. **Comparativo** (grid 2 columnas, gap 8):
   - Rojo suave: icono cámara tachada (rojo) + "Cámara" / "No lo lee".
   - Verde suave: icono banco (verde) + "App de tu banco" / "Así sí".
5. **Ruta** (13): Abre tu banco › Transferir › **QR CoDi** › Confirma.
6. **Footer** (hairline arriba): punto azul pulsante + "Esperando pago" · a la derecha "Vence en 4:59" (mono).

### contraste (ALTERNATIVA)
- Bloque negro arriba, centrado: logo 72×72 (contorno blanco 1px al 22%), "**Paga con CoDi** · Banco de México", concepto, monto 48px + MXN, QR 236px en tarjeta blanca.
- Abajo en blanco: "Solo con la app de tu banco" (20/500), comparativo compacto ("Cámara: no" / "App del banco: sí"), ruta y footer de estado.

## Estados (máquina de estados)
```
esperando ──(usuario acepta en su app)──> confirmando ──(liquidado)──> recibido ──(8 s)──> esperando (QR nuevo)
    │                                         └──(rechazado)──> rechazado ──(8 s)──> esperando (QR nuevo)
    ├──(timer llega a 0)──> vencido ──(QR nuevo listo)──> esperando
    └──(sin conexión / CoDi caído)──> no-disponible ──(se recupera)──> esperando
```

Las pantallas de resultado no llevan logo arriba (CoDi aparece en el recibo, en "Método"). Contenido centrado: insignia circular de 88px, título (30/500) y una línea de texto.

| state | Insignia | Título | Texto | Sale |
|---|---|---|---|---|
| confirmando | azul suave + spinner | Confirmando pago | $25.00 MXN | al recibir respuesta |
| recibido | verde suave + check | Pago recibido | **successNote** (dinámico) + recibo | barra verde 8 s |
| rechazado | rojo suave + X | No se completó el pago | Tu banco no confirmó la transferencia. | barra negra 8 s |
| vencido | gris + reloj | El código venció | Generando uno nuevo | al tener QR nuevo |
| no-disponible | gris + círculo tachado | CoDi no está disponible por ahora | Usa otro método de pago. | fijo hasta recuperar |

**Recibo de "recibido"** (tarjeta `surface`, radio 16): concepto + monto · Método: logo CoDi 20px + "CoDi" · Referencia (mono) · Hora (mono).

**Errores**: solo dicen qué pasó. No agregar pasos ni instrucciones; si falla, la persona usa otro método de pago.

## Datos por máquina (props)
| prop | ejemplo | notas |
|---|---|---|
| concept | "Acceso al baño" | texto corto |
| amount | 25 | se muestra "$25.00 MXN" |
| successNote | "Ya puedes pasar" | único texto que cambia por caso de uso |
| qr | imagen/SVG de CoDi | sin alterar |
| expiresIn | 300 s | contador "Vence en m:ss" |
| variant | comparativo / contraste | |

Ejemplos de successNote:
- Baño: "Ya puedes pasar"
- Estacionamiento: "Tu boleto está pagado"
- Lavandería: "Saldo cargado a tu tarjeta"

## Movimiento
- Punto de "Esperando pago": pulso de 1.8 s (`cdPulse`).
- Spinner de "Confirmando": 0.9 s lineal (`cdSpin`).
- Barra de regreso: `cdBar` 8 s lineal.
- Cambio entre estados: fade de 200–300 ms con `--cd-ease`. Sin rebotes.
- Respeta `prefers-reduced-motion` (ya en tokens.css).

## Accesibilidad
- Texto esencial con contraste ≥ 4.5:1 (`muted` #6B6B73 cumple sobre blanco). `subtle` solo decorativo.
- Botones (si se agregan) de al menos 56px de alto.
- Logo con `alt="CoDi"`.
