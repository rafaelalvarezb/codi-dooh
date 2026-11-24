/*
 * CODI-DOOH ESP32 relay bridge
 * Polls /api/relay/events and pulses GPIO when unlock is queued.
 *
 * For mesa demo: use http://<MAC_LAN_IP>:3000/api/relay/events
 * (npm run dev:lan on the Mac). Vercel https URL needs a shared store
 * (Upstash) or the ESP32 may miss pulses across serverless instances.
 *
 * Board: ESP32 DevKit (ELEGOO)
 * Relay IN1 -> GPIO 26 (active LOW on many modules — flip RELAY_ON if needed)
 */

#include <WiFi.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASS = "YOUR_PASSWORD";

// Mesa: http://192.168.x.x:3000/api/relay/events  (IP of your Mac)
// Prod with Upstash: https://codi-dooh.vercel.app/api/relay/events
const char* POLL_URL = "https://codi-dooh.vercel.app/api/relay/events";

const int RELAY_PIN = 26;
const bool RELAY_ON = LOW;   // many 5V modules are active-low
const bool RELAY_OFF = HIGH;

const unsigned long POLL_MS = 1500;

bool pollUrlIsHttps() {
  return strncmp(POLL_URL, "https://", 8) == 0;
}

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
  Serial.print("Polling ");
  Serial.println(POLL_URL);
}

void pulse(unsigned long durationMs) {
  digitalWrite(RELAY_PIN, RELAY_ON);
  delay(durationMs);
  digitalWrite(RELAY_PIN, RELAY_OFF);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost, waiting...");
    delay(2000);
    return;
  }

  Serial.println("GET...");
  HTTPClient http;
  http.setTimeout(8000);
  http.setReuse(false);
  // Vercel often answers 308 (HTTP→HTTPS or host alias); ESP32 must follow.
  http.setFollowRedirects(HTTPC_FORCE_FOLLOW_REDIRECTS);

  WiFiClientSecure secure;
  WiFiClient plain;
  bool began = false;
  if (pollUrlIsHttps()) {
    secure.setInsecure(); // demo: skip cert verify (OK for hackathon/mesa)
    // Explicit host/port/path avoids Core 4.x treating the URL as plain HTTP.
    began = http.begin(secure, "codi-dooh.vercel.app", 443, "/api/relay/events", true);
  } else {
    began = http.begin(plain, POLL_URL);
  }

  if (!began) {
    Serial.println("HTTP begin failed");
    delay(POLL_MS);
    return;
  }

  int code = http.GET();
  Serial.printf("HTTP %d\n", code);
  if (code == 200) {
    String body = http.getString();
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, body);
    if (!err) {
      bool pending = doc["pending"] | false;
      Serial.printf("poll ok pending=%d\n", pending ? 1 : 0);
      if (pending) {
        unsigned long ms = doc["durationMs"] | 3000;
        Serial.printf("Pulse %lums reason=%s\n", ms,
                      doc["reason"] | "unknown");
        pulse(ms);
      }
    } else {
      Serial.println("JSON parse error");
    }
  }
  http.end();
  delay(POLL_MS);
}
