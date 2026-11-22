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

### A1. Identifica pines en el ESP32
En el ESP32 busca letras impresas al borde:

- Un pin que diga **5V** (a veces `V5` / `5V`)
- Un pin que diga **GND**
- El pin que diga **D26** o **GPIO26** (si no ves 26, busca la numeración; muchos boards ELEGOO lo marcan `26`)

### A2. Identifica pines en el relé (canal 1)
En el módulo de 4 canales:

- Fila de pines chicos (Dupont): **VCC**, **GND**, **IN1**, IN2, IN3, IN4  
  Solo usamos **VCC**, **GND**, **IN1**.
- Lado de tornillos grandes del canal 1: **NO**, **COM**, **NC**  
  (Normally Open / Common / Normally Closed).  
  Para la chapa usaremos **NO** y **COM**. Por ahora **no connects nada** ahí.

### A3. Conecta 3 Dupont (ESP32 → relé)

| Cable | Del ESP32 | Al relé |
|-------|-----------|---------|
| Rojo | **5V** | **VCC** |
| Negro | **GND** | **GND** |
| Amarillo | **GPIO 26** | **IN1** |

Apaga todo. No enchufes el eliminador 12V todavía.

### A4. Enciende solo el ESP32 por USB
1. Conecta el USB-C del ESP32 a tu Mac.
2. Debe encender un LED en el ESP32 y/o en el relé.

Si el relé no enciende nada: revisa VCC y GND.

---

## Parte B — Software (Arduino) — una sola vez

### B1. Instalar Arduino IDE
1. Entra a https://www.arduino.cc/en/software  
2. Descarga la versión para Mac, instálala, ábrela.

### B2. Agregar la placa ESP32
1. Arduino IDE → **Settings / Preferencias**  
2. En “Additional boards manager URLs” pega:  
   `https://espressif.github.io/arduino-esp32/package_esp32_index.json`  
3. OK.  
4. Menú **Tools → Board → Boards Manager**  
5. Busca `esp32` → instala **esp32 by Espressif Systems**.

### B3. Librería ArduinoJson
1. Menú **Tools → Manage Libraries**  
2. Busca `ArduinoJson` → Install (de Benoit Blanchon).

### B4. Abrir nuestro programa
1. En tu proyecto GitHub/carpeta local abre:  
   `firmware/esp32-relay/bridge.ino`  
   (o cópialo a Documents/Arduino/codi-bridge/codi-bridge.ino — el archivo y la carpeta deben llamarse igual).

2. Edita solo estas 2 líneas con tu WiFi de casa:

```cpp
const char* WIFI_SSID = "nombre-exacto-de-tu-wifi";
const char* WIFI_PASS = "tu-password";
```

Deja `POLL_URL` como está (`https://codi-dooh.vercel.app/api/relay/events`).

### B5. Subir el programa al ESP32
1. Cable USB conectado.
2. **Tools → Board → ESP32 Arduino → ESP32 Dev Module**
3. **Tools → Port** → elige el puerto que aparezca (algo como `/dev/cu.usbserial-...` o `usbmodem`)
4. Botón **Upload** (flecha →).
5. Si pide “Hold BOOT”: mantén el botón **BOOT** del ESP32 2 segundos y suelta.
6. Cuando diga “Done uploading”, abre **Tools → Serial Monitor**, velocidad **115200**.
7. Debes ver puntos `.....` y luego una IP tipo `192.168.x.x`.

Si ves `HTTP 200` de vez en cuando, ya está hablando con internet. Bien.

---

## Parte C — Probar el “clic” sin chapa

1. En el Mac, abre Terminal y pega:

```bash
curl -X POST https://codi-dooh.vercel.app/api/relay/pulse \
  -H 'Content-Type: application/json' \
  -d '{"durationMs":3000,"reason":"test-mesa"}'
```

2. En ~1–2 segundos el relé debe hacer **clic** ~3 segundos y otro clic al soltar.

- Si **no** hace clic: en `bridge.ino` cambia  
  `RELAY_ON` a `HIGH` y `RELAY_OFF` a `LOW`, vuelve a Upload, repite el curl.
- Si hace clic: sigue a la Parte D.

---

## Parte D — Conectar la chapa (12V) — con cuidado

**Regla de oro:** el eliminador 12V **nunca** se conecta a pines del ESP32. Solo a la chapa a través del relé.

### D1. Apaga todo
1. Desconecta el USB del ESP32.
2. El eliminador 12V **desenchufado** de la pared.

### D2. Tornillos del canal 1 del relé
En el bloque de tornillos del **canal 1**:

| Tornillo relé | Va a… |
|---------------|--------|
| **COM** | Cable **positivo (+)** del eliminador 12V (suele ser el del centro del plug o el marcado +) |
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

## Parte E — Demo completa con CoDi

1. ESP32 con WiFi (Serial muestra IP).
2. Relé + chapa cableados.
3. En el celular o Mac abre:  
   https://codi-dooh.vercel.app/?profile=bathroom  
4. Escanea el QR con la **app de tu banco** (no la cámara normal).
5. Confirma $0.01.
6. Al “Pago recibido”, la chapa debe abrir ~3 s.

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
