# Guion de la demo (fase B)

Duración: unos 10 minutos. Necesitas dos ventanas del navegador (una normal y
una de incógnito), la tableta o una pestaña con el kiosco, y un celular con una
app bancaria con CoDi.

## Antes de empezar

1. Entra como admin a `/entrar`.
2. En **Resumen**, hasta abajo, presiona **Cargar datos de demo**. Deja las
   últimas 2 semanas de actividad del host "Estacionamiento Plaza Centro" y del
   piloto de Silvertag.
3. En **Resumen → Kioscos**, abre el kiosco de **Caseta de salida A** con
   "Abrir kiosco". Ponlo en pantalla completa en la tableta. Ya pasa el video de
   Silvertag.

## 1. True Religion se registra y publica

1. En la ventana de incógnito abre `/registro`, elige **Quiero anunciarme** y
   crea la cuenta "True Religion".
2. **Crear campaña** → nombre → sube el video (hasta 15 s; si es más largo, elige qué 15 s se ven) o una imagen.
3. Muestra la **vista previa exacta del kiosco**: el video se ve completo, sin
   recortes (con franjas negras si no llena la pantalla), y la zona segura.
4. Elige las pantallas de Plaza Centro, revisa fechas y total, y **Publicar**.

## 2. El kiosco la toma sola

- Sin recargar nada, en menos de un minuto el kiosco empieza a alternar el
  video de True Religion con el de Silvertag.

## 3. Pago real con CoDi mientras corre el anuncio

- Mientras se ve el anuncio de True Religion, genera el cobro en el kiosco y
  paga con la app del banco (por ejemplo $0.01).

## 4. True Religion ve su resultado

- En la ventana de incógnito abre la campaña: aparecen las reproducciones y
  **"1 pago durante tu anuncio"**. Recarga la página si hace falta (el kiosco
  reporta cada 30 segundos).

## 5. El host ve su dinero

- Como admin: **Organizaciones → Estacionamiento Plaza Centro → Operar como**.
- **Ingresos**: lo que pagó True Religion, la parte del host (70%), la comisión
  (30%), el próximo pago y la CLABE validada (BBVA •••• 7899).
- **Volver a admin** en la barra negra de arriba.

## 6. El admin modera

- **Videos** → video de True Religion → **Pausar**.
- En cerca de un minuto (al terminar el video que esté pasando) desaparece del
  kiosco. La campaña de True Religion dice "Pausamos este video para revisarlo".
- **Reactivar** para dejarlo como estaba.

## Si algo falla

- **El kiosco no cambia**: revisa que la URL tenga `screen=` y `token=` (ábrelo
  desde "Abrir kiosco"). Si se perdió el internet, sigue con la última lista.
- **No aparece el pago**: el pago tiene que hacerse en el kiosco de la pantalla
  donde corre el anuncio, mientras corre. Espera 30 segundos y recarga.
