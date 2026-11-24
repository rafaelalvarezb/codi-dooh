# Kiosco cobten en un iPad (demo con jueces)

Con esto, un iPad funciona como la pantalla de la máquina de cobro: anuncios a la izquierda y el QR CoDi a la derecha. Los jueces pueden pagar de verdad ($0.01) con la app de su banco.

## Antes

- **Versión de iOS:** Ajustes → General → Información → *Versión de iOS*. Necesita **16.4 o más nueva**. Si es más vieja: Ajustes → General → Actualización de software.
- **Cargador:** cable Lightning conectado todo el tiempo.
- **Internet:** Wi-Fi. Si no hay, compartir datos desde un celular.

## 1. Sacar el link del kiosco

1. En una computadora, entra a **https://app.cobten.com/entrar** con la cuenta de admin.
2. En **Resumen → Kioscos**, busca **Caseta de salida A** (pantalla demo) y copia el link de **"Abrir kiosco"**. Se ve así:
   `https://app.cobten.com/?profile=parking&screen=scr_demo_salida_a&token=…`
3. Agrega al final **`&session=1`**. Así el QR aparece de inmediato; en la máquina real aparece cuando metes el boleto.
4. Mándate ese link al iPad (WhatsApp, AirDrop o correo).

## 2. Ponerlo en pantalla completa

1. Abre el link en **Safari** del iPad.
2. Toca **Compartir** (cuadro con flecha) → **Agregar a inicio** → **Agregar**.
3. Cierra Safari y abre el ícono **cobten** de la pantalla de inicio. Abre sin barras de Safari y sin marco: ocupa toda la pantalla.
4. Gira el iPad a **horizontal**.

## 3. Que no se apague ni se salga

- **Ajustes → Pantalla y brillo → Bloqueo automático → Nunca.**
- **Acceso guiado**, para que nadie salga de la app:
  1. Ajustes → Accesibilidad → **Acceso guiado** → activar y poner un código.
  2. Abre el ícono cobten y presiona **tres veces el botón de encendido** (o el botón de inicio, en iPads que lo tienen) → **Iniciar**.
  3. Para salir: tres veces el mismo botón y el código.

## 4. Durante la demo

- El kiosco pasa los anuncios activos de esa pantalla. Si un juez publica algo desde **Probar como anunciante**, aparece en menos de un minuto.
- Para el pago en vivo: el juez abre la app de su banco → **CoDi / Pagar con QR** → escanea → confirma **$0.01**. El kiosco cambia a **"Pago recibido"**.
- Después, en la campaña de ese juez se ve el pago en **"Pagos durante tu anuncio"**.

## Si algo falla

- **Se ve con marco gris o cortado:** ábrelo desde el ícono de inicio, no desde Safari. También puedes agregar `&frame=0` al link.
- **No aparece el QR:** revisa que el link termine en `&session=1` y que haya internet.
- **No cambian los anuncios:** el link debe tener `screen=` y `token=`. Cópialo de nuevo desde **Abrir kiosco**.
