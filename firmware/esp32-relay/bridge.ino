/*
 * CODI-DOOH ESP32 relay bridge
 * Polls /api/relay/events and pulses GPIO when a payment unlock is queued.
 *
 * Board: ESP32 DevKit
 * Relay IN1 -> GPIO 26 (active LOW on many modules — flip RELAY_ON if needed)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASS = "YOUR_PASSWORD";

// Production example: https://codi-dooh.vercel.app/api/relay/events
const char* POLL_URL = "https://codi-dooh.vercel.app/api/relay/events";

const int RELAY_PIN = 26;
const bool RELAY_ON = LOW;   // many 5V modules are active-low
const bool RELAY_OFF = HIGH;

const unsigned long POLL_MS = 1500;

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, RELAY_OFF);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.println();
  Serial.println(WiFi.localIP());
}

void pulse(unsigned long durationMs) {
  digitalWrite(RELAY_PIN, RELAY_ON);
  delay(durationMs);
  digitalWrite(RELAY_PIN, RELAY_OFF);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
    delay(1000);
    return;
  }

  HTTPClient http;
  http.begin(POLL_URL);
  http.setTimeout(8000);
  int code = http.GET();
  if (code == 200) {
    String body = http.getString();
    StaticJsonDocument<512> doc;
    DeserializationError err = deserializeJson(doc, body);
    if (!err) {
      bool pending = doc["pending"] | false;
      if (pending) {
        unsigned long ms = doc["durationMs"] | 3000;
        Serial.printf("Pulse %lums reason=%s\n", ms,
                      doc["reason"] | "unknown");
        pulse(ms);
      }
    }
  } else {
    Serial.printf("HTTP %d\n", code);
  }
  http.end();
  delay(POLL_MS);
}
