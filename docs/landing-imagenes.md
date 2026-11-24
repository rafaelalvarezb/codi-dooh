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

Las dos imágenes de fondo (`estacionamiento-plaza` y `ciudad-noche`) no muestran ningún recuadro mientras faltan. Aparecen detrás del texto, oscurecidas, en cuanto subes el archivo.

## Estilo común (pégalo al final de cada prompt)

> Editorial product photography, Apple-style, soft cinematic light, shallow depth of field, muted neutral palette of graphite and warm grey with a single subtle green accent, contemporary Mexico City, photorealistic, 35mm lens, clean composition with negative space, no text, no logos, no brand names, no watermarks.

Si sale una pantalla de tableta o de celular, pide que se vea **apagada o en negro** ("screen off, black glass"). La interfaz real ya la dibuja la página con código, y una interfaz inventada por la IA se vería falsa.

**Dónde va la pantalla:** cobten no va en la pluma. Va **montada en la máquina de cobro** del estacionamiento de la plaza, la máquina donde la gente mete su boleto y paga antes de regresar a su auto (normalmente junto a los elevadores o a la entrada peatonal). Por eso casi todos los prompts describen la misma máquina:

> **[máquina]** a free-standing automatic parking pay station (ticket payment machine), about 1.7 m tall, matte graphite metal body with a ticket slot, a bill slot and a coin slot, and a slim landscape tablet screen mounted flush on its upper front

Donde veas **[máquina]**, pega ese texto.

## Prompts

| Archivo | Proporción | Dónde va |
|---|---|---|
| `estacionamiento-plaza` | 16:9 | Fondo del hero (oscurecido) |
| `paso-escanea` | 4:5 | Cómo funciona, paso 1 |
| `paso-confirma` | 4:5 | Cómo funciona, paso 2 |
| `paso-sal` | 4:5 | Cómo funciona, paso 3 |
| `kiosco-anuncio` | 16:9 | Tu pantalla también gana |
| `marca-audiencia` | 4:5 | Para marcas |
| `maquina-cobro` | 4:5 | El equipo |
| `detalle-hardware` | 16:9 | El equipo (abajo a la derecha) |
| `ciudad-noche` | 21:9 | Fondo del cierre "Agenda una demo" |

### estacionamiento-plaza (16:9)
> Wide night shot of the pedestrian lobby of a modern shopping-mall parking garage in Mexico City, next to the elevators, two [máquina] standing against a clean concrete wall with their screens off, rows of parked cars softly out of focus, polished floor with soft reflections, cool ambient light with a faint green glow, calm, lots of dark negative space at the top. [estilo común]

### paso-escanea (4:5)
> A woman in her thirties with shopping bags stands in front of a [máquina] in a mall parking garage, holding her smartphone up toward the tablet screen to scan it, relaxed expression, her phone screen faces away from the camera, the tablet screen is a soft glow without readable content, evening light. [estilo común]

### paso-confirma (4:5)
> Tight close-up of a hand holding a modern smartphone in front of a parking pay station, the thumb about to tap the screen, the phone screen is black glass with a soft reflection, the graphite pay station with its ticket slot softly blurred in the background. [estilo común]

### paso-sal (4:5)
> A young man walking away from a parking pay station toward his car in a bright mall parking garage, holding a paper parking ticket and car keys, relaxed and unhurried, slight motion, cars and pillars softly blurred, cool daylight from the garage openings. [estilo común]

### kiosco-anuncio (16:9)
> Wide shot of a [máquina] in a mall parking lobby, the left two thirds of the tablet screen glowing with an abstract warm-orange and violet gradient like a video ad, the right third white, people walking by softly blurred, warm interior lights. [estilo común]
> *(Nota: aquí la pantalla sí va encendida, con colores abstractos y sin texto.)*

### marca-audiencia (4:5)
> Over-the-shoulder view of two people waiting their turn at a [máquina] in a shopping-mall parking garage, one holding a phone toward the screen, both looking at the glowing tablet, which shows only an abstract colorful gradient, shallow depth of field, feeling of attention and everyday life. [estilo común]

### maquina-cobro (4:5)
> Product shot of a [máquina] in a clean mall parking lobby, three-quarter angle, the tablet screen off with black glass reflections, the ticket, bill and coin slots clearly visible, soft studio-like light, plain concrete wall behind, no brand names on the machine. [estilo común]

### detalle-hardware (16:9)
> Macro detail of the upper front of a graphite parking pay station where a slim landscape tablet is mounted with a precise metal bracket, a neatly routed cable entering the machine, the tablet screen off, a single tiny green LED glowing, shallow depth of field, technical yet elegant. [estilo común]

### ciudad-noche (21:9)
> Ultra-wide night panorama of Mexico City seen from the rooftop parking level of a shopping mall, Paseo de la Reforma skyline lights in soft bokeh, deep blue-black sky, a faint green rim light on the parapet in the foreground, minimal and calm, very dark overall. [estilo común]

## Video "Ver experiencia para anunciantes"

En la sección **Para anunciantes**, el botón **Ver experiencia para anunciantes** abre una ventana con el video explicativo. Mientras no exista, la ventana dice "Muy pronto" y muestra la explicación de "Pagos durante tu anuncio".

Para ponerlo:

1. Exporta el video en **MP4 (H.264)**, horizontal 16:9, idealmente de menos de 50 MB.
2. Llámalo exactamente `experiencia-anunciantes.mp4`.
3. Opcional: una imagen de portada `experiencia-anunciantes.jpg`, que se ve antes de darle play.
4. Súbelos a `public/landing` en GitHub (**Add file → Upload files → Commit changes**). En 1 o 2 minutos aparecen en la página.
