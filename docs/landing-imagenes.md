# Imágenes de cobten.com

La página ya tiene un espacio reservado para cada imagen. Mientras falta la imagen, ese espacio muestra un recuadro gris con el nombre del archivo que espera (por ejemplo `landing/paso-escanea.webp`).

## Cómo poner una imagen

1. Genera la imagen con el prompt de abajo, en la proporción indicada.
2. Guárdala con el **nombre exacto** de la tabla. Puede ser `.webp`, `.jpg` o `.png`; `.webp` es lo que más rápido carga.
3. Pásala a `.webp` (opcional). En https://squoosh.app arrastra la imagen, elige **WebP** con calidad 80 y descárgala. Una imagen de 2400 px de ancho está bien.
4. Súbela a GitHub:
   1. Abre https://github.com/rafaelalvarezb/codi-dooh/tree/main/public/landing.
   2. Usa **Add file → Upload files**, arrastra la imagen y presiona **Commit changes**.
5. Vercel publica la página de nuevo en 1 o 2 minutos y la imagen aparece sola. No hay que tocar código.

Las dos imágenes de fondo (`salida-estacionamiento` y `ciudad-noche`) no muestran ningún recuadro mientras faltan. Aparecen detrás del texto, oscurecidas, en cuanto subes el archivo.

## Estilo común (pégalo al final de cada prompt)

> Editorial product photography, Apple-style, soft cinematic light, shallow depth of field, muted neutral palette of graphite and warm grey with a single subtle green accent, contemporary Mexico City, photorealistic, 35mm lens, clean composition with negative space, no text, no logos, no brand names, no watermarks.

Si sale una pantalla de tableta o de celular, pide que se vea **apagada o en negro** ("screen off, black glass"). La interfaz real ya la dibuja la página con código, y una interfaz inventada por la IA se vería falsa.

## Prompts

| Archivo | Proporción | Dónde va |
|---|---|---|
| `salida-estacionamiento` | 16:9 | Fondo del hero (oscurecido) |
| `paso-escanea` | 4:5 | Cómo funciona, paso 1 |
| `paso-confirma` | 4:5 | Cómo funciona, paso 2 |
| `paso-sal` | 4:5 | Cómo funciona, paso 3 |
| `kiosco-anuncio` | 16:9 | Tu pantalla también gana |
| `marca-audiencia` | 4:5 | Para marcas |
| `kiosco-instalado` | 4:5 | El equipo |
| `detalle-hardware` | 16:9 | El equipo (abajo a la derecha) |
| `ciudad-noche` | 21:9 | Fondo del cierre "Agenda una demo" |

### salida-estacionamiento (16:9)
> Wide night shot of the exit lane of a modern underground parking garage in Mexico City, a closed red-and-white boom barrier, a slim pole-mounted tablet kiosk next to the lane with its screen off, polished concrete floor with soft reflections, cool ambient light with a faint green glow, empty, calm, lots of dark negative space at the top. [estilo común]

### paso-escanea (4:5)
> Close-up from the passenger side: a woman in her thirties sits in the driver's seat of a car with the window down, holding her smartphone up toward a pole-mounted tablet kiosk at a parking exit, her face relaxed and slightly lit by the kiosk, the phone screen faces away from the camera, evening light. [estilo común]

### paso-confirma (4:5)
> Tight close-up of a hand holding a modern smartphone inside a car, the thumb about to tap the screen, the screen is black glass with a soft reflection, steering wheel and dashboard softly blurred in the background, warm interior light mixed with cool parking-lot light. [estilo común]

### paso-sal (4:5)
> A parking boom barrier lifting while a dark sedan starts to drive out of a parking garage exit, slight motion blur on the car wheels, the barrier arm at 45 degrees, a small green indicator light glowing on the barrier post, night, reflective wet concrete. [estilo común]

### kiosco-anuncio (16:9)
> Wide shot of a pole-mounted landscape tablet kiosk at the exit of an open-air parking lot in Mexico City at dusk, the left two thirds of the screen glowing with an abstract warm-orange and violet gradient like a video ad, the right third white, cars and buildings softly blurred behind, golden-hour sky. [estilo común]
> *(Nota: este es el único prompt donde la pantalla va encendida, con colores abstractos y sin texto.)*

### marca-audiencia (4:5)
> Over-the-shoulder view of two people waiting at a parking exit kiosk, one holding a phone toward the kiosk, both looking at the glowing screen, which shows only an abstract colorful gradient, shallow depth of field, urban evening light, feeling of attention and everyday life. [estilo común]

### kiosco-instalado (4:5)
> Product shot of a sleek pole-mounted landscape tablet kiosk installed next to a parking boom barrier, matte graphite metal enclosure, rounded corners, screen off with black glass reflections, clean concrete wall behind, soft studio-like daylight, three-quarter angle. [estilo común]

### detalle-hardware (16:9)
> Macro detail shot of a small electronics board with a relay module and neatly routed cables inside a matte graphite enclosure, next to the edge of a tablet, shallow depth of field, a single tiny green LED glowing, technical yet elegant. [estilo común]

### ciudad-noche (21:9)
> Ultra-wide night panorama of Mexico City seen from the top level of a parking structure, Paseo de la Reforma skyline lights in soft bokeh, deep blue-black sky, a faint green rim light on the parapet in the foreground, minimal and calm, very dark overall. [estilo común]
