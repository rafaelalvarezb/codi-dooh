# ESP32 relay bridge (demo chapa / baño)

**Guía no técnica paso a paso (caja por caja + videos):**  
[`docs/hardware-demo-paso-a-paso.md`](../../docs/hardware-demo-paso-a-paso.md)

Cuando llegue el kit (ESP32 + módulo relé 5V + Dupont + opcional chapa
solenoide 12V + eliminador 12V 1A):

## Cableado

| ESP32 | Relé |
|-------|------|
| 5V / VIN | VCC |
| GND | GND |
| GPIO 26 | IN1 |

Chapa 12V: NO/COM del relé en serie con la fuente 12V 1A y el solenoide.
**No** uses chapas magnéticas de 180/280 kg ni cajas industriales para la demo.

## Firmware

1. Abre `bridge.ino` en Arduino IDE o PlatformIO.
2. Ajusta `WIFI_SSID`, `WIFI_PASS`, `POLL_URL`.
3. Flash al ESP32.
4. El bridge hace GET a tu backend (`/api/relay/events`) y, si hay pulse
   pendiente, cierra el relé `durationMs` (default 3000).

## Vercel

En el proyecto Vercel:

```
RELAY_BRIDGE_URL=http://<ip-lan-del-esp32>/pulse
```

O deja el bridge en modo **poll** (este sketch): el kiosk/webhook escribe en
`lib/relay.ts` y el ESP32 consulta `/api/relay/events`.

## Demo wow

1. Kiosco genera QR CoDi → pagas $0.01.
2. Webhook / status marca PAID → `pulseRelay`.
3. ESP32 cierra relé → pestillo de chapa abre ~3 s.
