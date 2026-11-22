/*
 * CODI-DOOH ESP32 relay bridge
 * Polls /api/relay/events over HTTPS and pulses GPIO when unlock is queued.
 *
 * Board: ESP32 DevKit (ELEGOO)
 * Relay IN1 -> GPIO 26 (active LOW on many modules — flip RELAY_ON if needed)
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASS = "YOUR_PASSWORD";

const char* POLL_URL = "https://codi-dooh.vercel.app/api/relay/events";

const int RELAY_PIN = 26;
const bool RELAY_ON = LOW;   // many 5V modules are active-low
const bool RELAY_OFF = HIGH;

const unsigned long POLL_MS = 1500;

void setup() {
  Serial.begin(115200);
  delay(500);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, RELAY_OFF);

  // Totalplay / some home routers refuse ESP32 if we reconnect too aggressively.
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true, true);
  delay(1000);
  WiFi.setSleep(false);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("WiFi");
  uint8_t tries = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    tries++;
    if (tries % 20 == 0) {
      Serial.println();
      Serial.println("Retry WiFi begin...");
      WiFi.disconnect(true, true);
      delay(1000);
      WiFi.begin(WIFI_SSID, WIFI_PASS);
    }
  }
  Serial.println();
  Serial.print("IP ");
  Serial.println(WiFi.localIP());
  Serial.println("Polling relay events...");
}

void pulse(unsigned long durationMs) {
  digitalWrite(RELAY_PIN, RELAY_ON);
  delay(durationMs);
  digitalWrite(RELAY_PIN, RELAY_OFF);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost, reconnecting...");
    WiFi.reconnect();
    delay(1000);
    return;
  }

  WiFiClientSecure client;
  client.setInsecure(); // demo: skip cert verify (OK for hackathon/mesa)

  HTTPClient http;
  http.setTimeout(8000);
  if (!http.begin(client, POLL_URL)) {
    Serial.println("HTTP begin failed");
    delay(POLL_MS);
    return;
  }

  int code = http.GET();
  if (code == 200) {
    String body = http.getString();
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, body);
    if (!err) {
      bool pending = doc["pending"] | false;
      if (pending) {
        unsigned long ms = doc["durationMs"] | 3000;
        Serial.printf("Pulse %lums reason=%s\n", ms,
                      doc["reason"] | "unknown");
        pulse(ms);
      }
    } else {
      Serial.println("JSON parse error");
    }
  } else {
    Serial.printf("HTTP %d\n", code);
  }
  http.end();
  delay(POLL_MS);
}
