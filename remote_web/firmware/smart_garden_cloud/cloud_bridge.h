#pragma once
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include <esp_system.h>
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/task.h"
#include "cloud_config.h"
#include "cloud_ca.h"

// All sensor / relay globals are accessed only from the original Arduino loop.
// HTTPS uses POD snapshots and command queues, never blocks irrigation timing.
struct CloudSnapshot {
  float temperature, humidity;
  int soilRaw, soilPercent, start, stop;
  bool dhtOk, relay, byAuto, autoEnabled;
  unsigned long durationSec, manualSec, capturedMs, lastUpdate;
  char ackId[37];
  bool ackOk;
  char ackError[128];
  bool ackRelay, ackAutoEnabled;
  int ackStart, ackStop;
  unsigned long ackDurationSec, ackManualSec;
};
struct CloudCommand {
  char id[37];
  bool isAuto, enabled, on;
  int start, stop, durationSec;
  unsigned long expiresMs;
};
static QueueHandle_t cloudSnapshots = nullptr;
static QueueHandle_t cloudCommands = nullptr;
static char cloudBootId[17];
static char cloudAckId[37] = "";
static bool cloudAckOk = false;
static char cloudAckError[128] = "";
static CloudSnapshot cloudApplied{};
void setRelay(bool on, bool byAuto);

static void publishCloudSnapshot() {
  CloudSnapshot s{};
  s.temperature = cache.temperature;
  s.humidity = cache.humidity;
  s.dhtOk = !isnan(cache.temperature) && !isnan(cache.humidity);
  s.soilRaw = cache.soilRaw;
  s.soilPercent = cache.soilPercent;
  s.relay = relayState;
  s.byAuto = relayAutoTriggered;
  s.autoEnabled = autoConfig.enabled;
  s.start = autoConfig.startPercent;
  s.stop = autoConfig.stopPercent;
  s.durationSec = autoConfig.maxDurationMs / 1000;
  s.manualSec = manualDurationMs / 1000;
  s.capturedMs = millis();
  s.lastUpdate = cache.lastUpdate;
  strlcpy(s.ackId, cloudAckId, sizeof(s.ackId));
  strlcpy(s.ackError, cloudAckError, sizeof(s.ackError));
  s.ackOk = cloudAckOk;
  s.ackRelay = cloudApplied.relay;
  s.ackAutoEnabled = cloudApplied.autoEnabled;
  s.ackStart = cloudApplied.start;
  s.ackStop = cloudApplied.stop;
  s.ackDurationSec = cloudApplied.durationSec;
  s.ackManualSec = cloudApplied.manualSec;
  xQueueOverwrite(cloudSnapshots, &s);
}

static void cloudNetworkTask(void*) {
  char lastQueued[37] = "";
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  for (;;) {
    if (WiFi.status() != WL_CONNECTED || time(nullptr) < 1700000000) {
      vTaskDelay(pdMS_TO_TICKS(1000));
      continue;
    }
    CloudSnapshot s{};
    if (xQueuePeek(cloudSnapshots, &s, 0) != pdTRUE || millis() - s.capturedMs > 4000) {
      vTaskDelay(pdMS_TO_TICKS(1000));
      continue;
    }
    JsonDocument body;
    body["boot_id"] = cloudBootId;
    JsonObject r = body["readings"].to<JsonObject>();
    r["soil_raw"] = s.soilRaw;
    r["soil_percent"] = s.soilPercent;
    r["dht11_ok"] = s.dhtOk;
    if (s.dhtOk) { r["temperature"] = s.temperature; r["humidity"] = s.humidity; }
    r["relay"] = s.relay ? "on" : "off";
    r["relay_auto_triggered"] = s.byAuto;
    r["manual_duration_sec"] = s.manualSec;
    r["auto_enabled"] = s.autoEnabled;
    r["auto_start_percent"] = s.start;
    r["auto_stop_percent"] = s.stop;
    r["auto_duration_sec"] = s.durationSec;
    r["last_update_ms"] = s.lastUpdate;
    if (s.ackId[0]) {
      body["ack"]["id"] = s.ackId;
      body["ack"]["ok"] = s.ackOk;
      if (s.ackOk) {
        JsonObject a = body["ack"]["result"].to<JsonObject>();
        a["relay"] = s.ackRelay ? "on" : "off";
        a["manual_duration_sec"] = s.ackManualSec;
        a["auto_enabled"] = s.ackAutoEnabled;
        a["auto_start_percent"] = s.ackStart;
        a["auto_stop_percent"] = s.ackStop;
        a["auto_duration_sec"] = s.ackDurationSec;
      }
      if (!s.ackOk) body["ack"]["error"] = s.ackError;
    }
    String payload;
    serializeJson(body, payload);
    WiFiClientSecure tls;
    tls.setCACert(CLOUD_ROOT_CA);
    tls.setHandshakeTimeout(5);
    HTTPClient http;
    http.setConnectTimeout(5000);
    http.setTimeout(5000);
    unsigned long requestStart = millis();
    String url = String(CLOUD_BASE_URL) + "/api/device?action=sync&id=" + CLOUD_DEVICE_ID;
    if (http.begin(tls, url)) {
      http.addHeader("Content-Type", "application/json");
      http.addHeader("Authorization", String("Bearer ") + CLOUD_DEVICE_TOKEN);
      int status = http.POST(payload);
      if (status == 200 && http.getSize() <= 8192) {
        JsonDocument response;
        if (!deserializeJson(response, http.getString())) {
          JsonObject c = response["command"].as<JsonObject>();
          const char* id = c["id"] | "";
          const char* boot = c["bootId"] | "";
          unsigned long remaining = c["remaining_ms"] | 0UL;
          unsigned long elapsed = millis() - requestStart;
          if (strlen(id) == 36 && strcmp(id, lastQueued) != 0 && strcmp(boot, cloudBootId) == 0 && remaining > elapsed + 1000) {
            CloudCommand command{};
            strlcpy(command.id, id, sizeof(command.id));
            command.expiresMs = millis() + remaining - elapsed - 1000;
            const char* type = c["type"] | "";
            command.isAuto = strcmp(type, "auto") == 0;
            bool valid = false;
            if (command.isAuto) {
              command.enabled = c["config"]["enabled"] | false;
              command.start = c["config"]["startPercent"] | -1;
              command.stop = c["config"]["stopPercent"] | -1;
              command.durationSec = c["config"]["durationSec"] | 0;
              valid = c["config"]["enabled"].is<bool>() && c["config"]["startPercent"].is<int>() && c["config"]["stopPercent"].is<int>() && c["config"]["durationSec"].is<int>() && command.start >= 0 && command.stop <= 100 && command.start < command.stop && command.durationSec >= 1 && command.durationSec <= 600;
            } else if (strcmp(type, "relay") == 0) {
              command.on = c["on"] | false;
              command.durationSec = c["durationSec"] | 0;
              valid = c["on"].is<bool>() && (!command.on || (c["durationSec"].is<int>() && command.durationSec >= 1 && command.durationSec <= 600));
            }
            if (valid && xQueueSend(cloudCommands, &command, 0) == pdTRUE) strlcpy(lastQueued, id, sizeof(lastQueued));
          }
        }
      } else {
        // Log status only: never print credentials or upstream response bodies.
        Serial.printf("Cloud sync failed: HTTP %d\n", status);
      }
      http.end();
    }
    vTaskDelay(pdMS_TO_TICKS(CLOUD_SYNC_INTERVAL_MS));
  }
}

static void startCloudBridge() {
  snprintf(cloudBootId, sizeof(cloudBootId), "%08lx%08lx", (unsigned long)esp_random(), (unsigned long)esp_random());
  Serial.printf("Cloud device ID: %s\n", CLOUD_DEVICE_ID);
  if (strncmp(CLOUD_BASE_URL, "https://", 8) != 0 || strlen(CLOUD_DEVICE_TOKEN) < 32) {
    Serial.println("Cloud disabled: configure HTTPS URL and device token first.");
    return;
  }
  cloudSnapshots = xQueueCreate(1, sizeof(CloudSnapshot));
  cloudCommands = xQueueCreate(1, sizeof(CloudCommand));
  if (!cloudSnapshots || !cloudCommands) { Serial.println("Cloud disabled: insufficient memory."); return; }
  publishCloudSnapshot();
  if (xTaskCreate(cloudNetworkTask, "cloud-https", 12288, nullptr, 1, nullptr) != pdPASS) {
    Serial.println("Cloud disabled: cannot start HTTPS task.");
  }
}

static void cloudBridgeTick() {
  if (!cloudSnapshots || !cloudCommands) return;
  CloudCommand c{};
  if (xQueueReceive(cloudCommands, &c, 0) == pdTRUE && strcmp(c.id, cloudAckId) != 0) {
    strlcpy(cloudAckId, c.id, sizeof(cloudAckId));
    cloudAckOk = false;
    cloudAckError[0] = '\0';
    if ((int32_t)(millis() - c.expiresMs) >= 0) {
      strlcpy(cloudAckError, "Lenh da het han, hay gui lai.", sizeof(cloudAckError));
    } else if (c.isAuto) {
      autoConfig.enabled = c.enabled;
      autoConfig.startPercent = c.start;
      autoConfig.stopPercent = c.stop;
      autoConfig.maxDurationMs = (unsigned long)c.durationSec * 1000UL;
      if (!autoConfig.enabled && relayState && relayAutoTriggered) setRelay(false, false);
      cloudAckOk = true;
    } else if (autoConfig.enabled) {
      strlcpy(cloudAckError, "Dang o che do tu dong - tat auto truoc khi dieu khien tay.", sizeof(cloudAckError));
    } else {
      manualDurationMs = c.on ? (unsigned long)c.durationSec * 1000UL : 0;
      setRelay(c.on, false);
      cloudAckOk = true;
    }
    cloudApplied.relay = relayState;
    cloudApplied.autoEnabled = autoConfig.enabled;
    cloudApplied.start = autoConfig.startPercent;
    cloudApplied.stop = autoConfig.stopPercent;
    cloudApplied.durationSec = autoConfig.maxDurationMs / 1000;
    cloudApplied.manualSec = manualDurationMs / 1000;
    publishCloudSnapshot();
  }
  static unsigned long lastPublish = 0;
  if (millis() - lastPublish >= 100) { publishCloudSnapshot(); lastPublish = millis(); }
}
