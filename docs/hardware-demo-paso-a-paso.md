# Demo CoDi → chapa — guía para no técnicos

Objetivo: pagar $0.01 con CoDi en el kiosco y que la chapa abra ~3 segundos.

## Videos / diagramas de apoyo (míralos antes de cablear)

1. **Diagrama + explicación ESP32 + relé + chapa 12V** (el más parecido a nuestro kit):  
   https://esp32io.com/tutorials/esp32-solenoid-lock  
   Ahí ves fotos de cómo el relé queda entre la fuente 12V y la chapa.  
   Nosotros usamos **GPIO 26** (en esa página a veces usan otro pin; no copies el pin del tutorial, usa el 26).

2. **Cómo conectar un módulo relé al ESP32** (solo la parte del relé, sin chapa todavía):  
   Busca en YouTube: `ESP32 relay module wiring`  
   Video claro en inglés (conexiones VCC/GND/IN):  
   https://www.youtube.com/results?search_query=ESP32+relay+module+wiring+tutorial  

3. **Instalar ESP32 en Arduino IDE** (software, sin cables de chapa):  
   https://www.youtube.com/results?search_query=install+ESP32+Arduino+IDE+USB-C  

---

## Qué sacar de las cajas (mesa limpia)

Pon sobre la mesa **solo** esto:

1. **1 placa ESP32** (del paquete ELEGOO de 3). Deja las otras 2 en la caja.
2. **Cable USB-C** (el que vino con el ESP32 o uno de tu Mac).
3. **Módulo relé SunFounder de 4 canales** (la placita negra/azul con 4 cubitos).
4. **Cables Dupont** (los delgados de colores). Necesitas **3** para empezar:
   - 1 rojo (o cualquier color) → 5V
   - 1 negro → GND
   - 1 de otro color (ej. amarillo) → señal IN1
5. **Eliminador Enson 12V 1A** + su cable a la corriente.
6. **Chapa solenoide Tecneu** (tiene 2 cables).
7. Destornillador pequeño de pala (para los tornillos del relé, lado de tornillos grandes).

No uses todavía: los otros ESP32, el resto de Dupont, ni nada de Amazon extra.

---

## Parte A — Solo “clic” del relé (sin chapa, sin 12V)

Tu placa ELEGOO **no imprime “5V” ni “GPIO26”**. Imprime:

- **`VIN`** (a veces se lee como `VN`) = el de 5 V para el relé  
- **`D26`** = GPIO 26  

Hay **dos** cosas que se parecen a “VN”: una a la **izquierda** (junto al USB) y otra a la **derecha** (junto a `VP`).  
Para el cable rojo usa **solo la de la izquierda**, la que está entre `EN` y `GND`.

### A1. ESP32 — ubica los 3 pines (USB-C a la izquierda)

Mira la **fila de arriba** (lado del botón **EN**), de izquierda a derecha:

Con el USB-C a la **izquierda**, fila de **arriba**:

1. **`VIN`** ← Dupont **rojo** (primer pin arriba, junto al botón EN / USB)  
2. **`GND`** ← Dupont **negro**  
3. `D13`  
4. `D12`  
5. `D14`  
6. `D27`  
7. **`D26`** ← Dupont **amarillo/café**  
8. luego `D25`, `D33`, … y al final `VN` / `VP` / `EN` ← **no uses ese `VN` del final**

Resumen visual: `VIN` → `GND` → … → `D27` → **`D26`**.

No uses `3V3` (abajo) para este relé. El SunFounder quiere ~5 V vía **`VIN`**.

### A2. Relé SunFounder — ya los encontraste bien

Fila de pines chicos (abajo a la derecha en tu foto):

`GND` · `IN1` · `IN2` · `IN3` · `IN4` · `VCC`

Solo usamos **GND**, **IN1**, **VCC**.

Deja el **jumper amarillo** puesto entre `JD-VCC` y `VCC` (como viene). No lo quites.

Lado de tornillos grandes: **todavía no conectes nada** (eso es para la chapa después).

### A3. Conecta los 3 Dupont (hembra–hembra, como los tuyos)

| Cable | Enchufa en ESP32 | Enchufa en relé |
|-------|------------------|-----------------|
| **Rojo** | **`VIN`** (2º arriba: EN → **VIN** → GND) | **`VCC`** |
| **Negro** | **`GND`** (3º arriba, junto a VIN) | **`GND`** |
| **Amarillo/café** | **`D26`** (después de D27 en la fila de arriba) | **`IN1`** |

Orden: primero **negro**, luego **rojo**, luego **amarillo**.  
No enchufes el eliminador 12V. Solo USB al Mac después.

### A4. Enciende solo el ESP32 por USB
1. Conecta el USB-C del ESP32 a tu Mac.
2. **Éxito mínimo:** LED rojo (u otro) en el ESP32 encendido.
3. El relé **puede no mostrar LED todavía**. En muchos SunFounder el LED de canal solo se enciende al hacer “clic”. No te detengas aquí si el ESP32 ya tiene luz.

Si el ESP32 no enciende nada: prueba otro cable USB-C (que sea de datos, no solo carga).

---

## Parte B — Software (Arduino) — una sola vez

Hazlo en este orden. No te saltes pasos.

### B1. Instalar Arduino IDE (en el Mac)
1. Abre Safari o Chrome.
2. Entra a: https://www.arduino.cc/en/software  
3. Baja **Arduino IDE 2.x para macOS** (Apple Silicon o Intel, según tu Mac).  
4. Abre el `.dmg` → arrastra **Arduino IDE** a **Aplicaciones**.  
5. Abre **Aplicaciones → Arduino IDE**.  
6. Si macOS dice “no se puede abrir”: clic derecho → **Abrir** → Abrir.  
7. Si pide login de Arduino: puedes crear cuenta gratis o a veces **Skip** / continuar sin cuenta.

### B2. Decirle a Arduino que existen placas ESP32
1. Menú de arriba: **Arduino IDE → Settings…** (en español a veces **Preferencias…**).  
2. Busca el campo **Additional boards manager URLs**.  
3. Pega exactamente esto:

```
https://espressif.github.io/arduino-esp32/package_esp32_index.json
```

4. Clic en **OK**.

### B3. Instalar el “paquete” ESP32
1. Menú **Tools → Board → Boards Manager…**  
   (o el icono de una placita a la izquierda).  
2. En el buscador escribe: `esp32`  
3. Encuentra **esp32 by Espressif Systems**.  
4. Clic en **Install** (tarda varios minutos; espera a que termine al 100%).  
5. Cierra el Boards Manager.

### B4. Instalar la librería ArduinoJson
1. Menú **Tools → Manage Libraries…**  
   (o icono de libros a la izquierda).  
2. Busca: `ArduinoJson`  
3. Elige el de **Benoit Blanchon**.  
4. **Install**.  
5. Cierra esa ventana.

### B5. Conseguir el archivo del programa
Necesitas el archivo `bridge.ino` del repo.

**Opción fácil (si ya tienes el proyecto en el Mac):**  
Abre la carpeta del proyecto → `firmware` → `esp32-relay` → doble clic en **`bridge.ino`**.  
Arduino debería abrirlo.

**Si no tienes la carpeta a la mano:**  
1. En GitHub abre el repo `codi-dooh`.  
2. Entra a `firmware/esp32-relay/bridge.ino`.  
3. Clic en el ícono de copiar / Raw → selecciona todo (Cmd+A) → copiar (Cmd+C).  
4. En Arduino: **File → New Sketch**.  
5. Borra todo el texto del sketch vacío y pega (Cmd+V).  
6. **File → Save** → nombre: `codi-bridge` → guarda en Documentos/Arduino.

### B6. Poner tu WiFi (solo 2 líneas)
En el código busca estas líneas cerca de arriba:

```cpp
const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASS = "YOUR_PASSWORD";
```

Cámbialas por el nombre y contraseña **exactos** de tu WiFi de casa, entre comillas. Ejemplo:

```cpp
const char* WIFI_SSID = "Totalplay-1234";
const char* WIFI_PASS = "miPassword";
```

- Usa WiFi **2.4 GHz** si tu router tiene las dos bandas (el ESP32 casi nunca ve 5 GHz).  
- **No** cambies la línea de `POLL_URL` (debe seguir apuntando a `codi-dooh.vercel.app`).

Guarda: **Cmd+S**.

### B7. Elegir placa y puerto
1. Deja el ESP32 **conectado por USB** al Mac.  
2. Menú **Tools → Board → esp32 → ESP32 Dev Module**.  
3. Menú **Tools → Port** → elige algo como:  
   - `/dev/cu.usbserial-...` o  
   - `/dev/cu.SLAB_USBtoUART` o  
   - `/dev/cu.usbmodem...`  
4. Si **Port** está gris / vacío:  
   - prueba otro cable USB-C  
   - desconecta y vuelve a conectar  
   - en Mac nuevos a veces pide “Permitir accesorio”; acepta.

### B8. Subir el programa (Upload)
1. Clic en el botón **→** (Upload) arriba.  
2. Abajo verás texto compilando (“Compiling…”). Espera.  
3. Si se queda en “Connecting…” o falla el upload:  
   - mantén oprimido el botón **BOOT** del ESP32  
   - vuelve a dar Upload  
   - suelta BOOT cuando empiece a subir (“Writing…”).  
4. Éxito = mensaje tipo **Done uploading**.

### B9. Ver si conectó al WiFi (Serial Monitor)
1. Menú **Tools → Serial Monitor**.  
2. Abajo a la derecha pon velocidad **115200 baud**.  
3. Si no sale nada: presiona el botón **EN** del ESP32 una vez (reset).  
4. Debes ver algo como:
   - `WiFi.....`  
   - `IP 192.168.x.x`  
   - `Polling relay events...`  

**Si ves `HTTP -1` en bucle:** el WiFi sí conectó, pero falló HTTPS.  
Usa el `bridge.ino` actual del repo (incluye `WiFiClientSecure` + `setInsecure()`), vuelve a pegar el código (con tu WiFi), Upload otra vez, y pulsa **EN**.

Cuando veas la IP y ya **no** salga `HTTP -1` cada segundo, Parte B lista → Parte C.

---

## Parte C — Probar el “clic” sin chapa (en tu Mac, misma WiFi)

**Importante:** el `curl` a `codi-dooh.vercel.app` puede responder `ok:true` pero el ESP32 **no oye el clic**, porque Vercel tiene varios servidores y la cola del relé vive en memoria de uno solo.  
Para la demo en mesa usamos el proyecto **en tu Mac** (misma red que el ESP32).

### C1. Arranca el servidor en el Mac
1. Abre Terminal.  
2. Ve a la carpeta del proyecto (ajusta si tu ruta es otra):

```bash
cd ~/Projects/codi-dooh
git pull
npm install
npm run dev:lan
```

3. Déjalo corriendo. Debe decir algo como `Local: http://localhost:3000` (escucha en toda la red local).

### C2. Averigua la IP de tu Mac (en otra pestaña de Terminal)

```bash
ipconfig getifaddr en0
```

Ejemplo de respuesta: `192.168.100.5`  
(Si sale vacío, prueba `en1`.)

### C3. Cambia solo esta línea en el sketch y vuelve a Upload
En Arduino, deja tu WiFi igual, pero cambia `POLL_URL` a **http** (no https) con la IP de tu Mac:

```cpp
const char* POLL_URL = "http://192.168.100.5:3000/api/relay/events";
```

(Usa **tu** IP, no la del ejemplo.)  
Upload → pulsa **EN** → Serial debe mostrar `IP ...` y luego líneas `poll ok pending=0`.

### C4. Dispara el pulse (misma IP del Mac)

```bash
curl -X POST http://192.168.100.5:3000/api/relay/pulse \
  -H 'Content-Type: application/json' \
  -d '{"durationMs":3000,"reason":"test-mesa"}'
```

En 1–3 s:
- Serial: `poll ok pending=1` y `Pulse 3000ms reason=test-mesa`
- Relé: **clic**

Si no hay clic pero sí sale `Pulse...`: en el sketch cambia `RELAY_ON` a `HIGH` y `RELAY_OFF` a `LOW`, Upload otra vez.

---

## Parte D — Conectar la chapa (12V) — con cuidado

**Regla de oro:** el eliminador 12V **nunca** se conecta a pines del ESP32. Solo a la chapa a través del relé.

### Importante: el “tubito” del eliminador
El eliminador termina en un **enchufe redondo (jack)**. Ese tubito **no** entra en el relé (el relé solo tiene tornillos).  
Para conectar 12V al relé necesitas **los dos cables de adentro** del eliminador (+ y −), no el tubito completo:

- Opción fácil: un **adaptador jack DC hembra a bornes/tornillos** (Mercado Libre: “jack 5.5 hembra a bornes”).
- Opción casera: cortar la punta del cable del eliminador y pelar los 2 hilos (solo con el eliminador **desenchufado**).

### D1. Apaga todo
1. Desconecta el USB del ESP32.
2. El eliminador 12V **desenchufado de la pared** (no basta con “apagado”: sácalo del contacto).

### D2. Tornillos del canal 1 del relé
En el bloque de tornillos del **canal 1**:

| Tornillo relé | Va a… |
|---------------|--------|
| **COM** | Cable **positivo (+)** del eliminador 12V (suele ser el del centro del jack o el marcado +) |
| **NO** | Un cable de la **chapa** (da igual cuál de los 2 por ahora si no están marcados; si hay rojo/negro, usa el rojo aquí) |
| (el otro cable de la chapa) | Cable **negativo (− / GND)** del eliminador 12V |

Esquema mental:

```
Eliminador + ──► COM (relé) 
NO (relé) ──► cable chapa
otro cable chapa ──► Eliminador −
```

Cuando el relé “cierra”, la chapa recibe 12V y se mueve.

### D3. Enciende en este orden
1. USB del ESP32 al Mac (o deja el Serial Monitor abierto).
2. Enchufa el eliminador 12V a la pared.
3. Repite el `curl` de la Parte C.
4. Debes oír el relé **y** ver/mover el pestillo de la chapa ~3 s.

---

## Parte E — Demo completa con CoDi (misma red LAN)

Mientras el ESP32 hace poll a tu Mac (`POLL_URL` con la IP local), el kiosco **también** debe abrirse en ese Mac (no en Vercel). Si pagas en Vercel, el pulse no llega al ESP32 de mesa.

1. ESP32 con WiFi (Serial: `IP ...`, `HTTP 200`, `poll ok pending=0`).
2. Relé + chapa cableados; `npm run dev:lan` (o `npx next dev --hostname 0.0.0.0`) corriendo.
3. En el Mac o celular (misma WiFi) abre:  
   `http://<IP_DEL_MAC>:3000/?profile=bathroom`  
   (ejemplo: `http://192.168.100.45:3000/?profile=bathroom`)  
   Ahí debe salir el QR solo (perfil baño = cobro fijo).
4. Escanea el QR con la **app de tu banco** (no la cámara normal).
5. Confirma $0.01.
6. Al “Pago recibido”, Serial debe mostrar `Pulse...` y la chapa abre ~3 s.

**Nota:** `localhost:3000` sin `?profile=bathroom` abre estacionamiento (espera boleto → sin QR).  
Para producción en Vercel hace falta cola compartida (Upstash Redis) o `RELAY_BRIDGE_URL`.

---

## Si algo falla (checklist corto)

| Síntoma | Qué revisar |
|---------|-------------|
| Arduino no ve puerto | Otro cable USB-C (que sea de datos), instala driver CH340/CP2102 si Windows; en Mac suele ir solo |
| No conecta WiFi | SSID/password exactos (mayúsculas), WiFi 2.4 GHz (muchos ESP32 no ven 5 GHz) |
| Relé no clic | VCC/GND/IN1; invertir RELAY_ON/OFF |
| Relé clic pero chapa no | Tornillos COM/NO; eliminador enchufado; polaridad +/− de la fuente |
| Pago OK pero no abre | Serial: ¿llega `Pulse 3000ms`? Si no, WiFi caído o POLL_URL mal |

---

## Qué no hagas

- No conectes 12V al ESP32.
- No uses los 4 canales del relé a la vez en esta demo (solo canal 1).
- No dejes la chapa energizada minutos seguidos sin necesidad (se calienta).
