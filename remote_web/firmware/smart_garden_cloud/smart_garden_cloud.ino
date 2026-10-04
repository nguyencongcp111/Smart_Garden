// smart_garden_phase3.ino
// Phase 3: Soil Moisture + DHT11 + Relay bơm tưới (thủ công + tự động) + WiFi + Web Server JSON
// Cloud variant: core irrigation unchanged; HTTPS runs in a separate FreeRTOS task.

#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include "arduino_secret.h" // chứa WIFI_SSID và WIFI_PASSWORD

#define DHTPIN 4 
#define DHTTYPE DHT11
#define SOIL_MOISTURE_PIN 34
#define RELAY_PIN 26

// ==== Cấu hình WiFi: điền đúng thông tin router nhà bạn ====
const char* WIFI_SSID = SECRET_SSID;
const char* WIFI_PASSWORD = SECRET_PASSWORD;

// Tên mDNS - cho phép truy cập bằng http://smartgarden.local thay vì gõ IP tay
const char* MDNS_HOSTNAME = "smartgarden";

// Ngưỡng ADC của cảm biến độ ẩm đất loại điện trở - CẦN CALIBRATE lại theo cảm biến thật của bạn
const int SOIL_DRY_VALUE = 3000;
const int SOIL_WET_VALUE = 1200;

// An toàn tuyệt đối: relay LUÔN tự tắt sau khoảng này bất kể chế độ thủ công hay tự động,
// đề phòng lỗi cấu hình hoặc mất kết nối web khiến bơm chạy vô hạn.
const unsigned long RELAY_MAX_ON_MS = 10UL * 60UL * 1000UL; // 10 phút

DHT dht(DHTPIN, DHTTYPE);
WebServer server(80);

struct SensorCache {
  float temperature = NAN;
  float humidity = NAN;
  int soilRaw = 0;
  int soilPercent = 0;
  unsigned long lastUpdate = 0;
} cache;

// Relay là loại active-LOW: LOW = bật bơm, HIGH = tắt bơm
bool relayState = false;
bool relayAutoTriggered = false; // relay đang bật là do chế độ tự động kích hoạt, hay do bấm tay?
unsigned long relayOnSince = 0;
unsigned long manualDurationMs = 0; // 0 = bật thủ công không giới hạn thời gian; >0 = tự tắt sau khoảng này

// Cấu hình tưới tự động - chỉnh được từ web qua endpoint /auto
struct AutoConfig {
  bool enabled = false;
  int startPercent = 30;         // độ ẩm <= mức này -> tự động BẬT bơm
  int stopPercent = 70;          // độ ẩm >= mức này -> tự động TẮT bơm (nếu đang tưới do auto)
  unsigned long maxDurationMs = 120000; // tưới tối đa bao lâu (mặc định 120s = 2 phút) trước khi tự tắt dù chưa đạt độ ẩm mong muốn
} autoConfig;

const unsigned long READ_INTERVAL_MS = 2000;
unsigned long lastRead = 0;

#include "cloud_bridge.h"

void addCORSHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void handleOptions() {
  addCORSHeaders();
  server.send(204);
}

void setRelay(bool on, bool byAuto = false) {
  relayState = on;
  relayAutoTriggered = on ? byAuto : false;
  digitalWrite(RELAY_PIN, on ? LOW : HIGH);
  if (on) {
    relayOnSince = millis();
    Serial.println(byAuto ? ">> RELAY ON (tu dong)" : ">> RELAY ON (thu cong)");
  } else {
    Serial.println(">> RELAY OFF");
  }
}

// GET /status -> dùng để "phát hiện" thiết bị
void handleStatus() {
  addCORSHeaders();
  String json = "{";
  json += "\"device\":\"smart-garden-esp32\",";
  json += "\"status\":\"online\",";
  json += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
  json += "\"uptime_ms\":" + String(millis());
  json += "}";
  server.send(200, "application/json", json);
}

// GET /sensors -> dữ liệu cảm biến + trạng thái relay + cấu hình tự động hiện tại
void handleSensors() {
  addCORSHeaders();
  String json = "{";
  if (isnan(cache.temperature) || isnan(cache.humidity)) {
    json += "\"dht11_ok\":false,";
  } else {
    json += "\"dht11_ok\":true,";
    json += "\"temperature\":" + String(cache.temperature, 1) + ",";
    json += "\"humidity\":" + String(cache.humidity, 1) + ",";
  }
  json += "\"soil_raw\":" + String(cache.soilRaw) + ",";
  json += "\"soil_percent\":" + String(cache.soilPercent) + ",";
  json += "\"relay\":\"" + String(relayState ? "on" : "off") + "\",";
  json += "\"relay_auto_triggered\":" + String(relayAutoTriggered ? "true" : "false") + ",";
  if (relayState && !relayAutoTriggered) {
    json += "\"manual_duration_sec\":" + String(manualDurationMs / 1000) + ",";
  }
  json += "\"auto_enabled\":" + String(autoConfig.enabled ? "true" : "false") + ",";
  json += "\"auto_start_percent\":" + String(autoConfig.startPercent) + ",";
  json += "\"auto_stop_percent\":" + String(autoConfig.stopPercent) + ",";
  json += "\"auto_duration_sec\":" + String(autoConfig.maxDurationMs / 1000) + ",";
  json += "\"last_update_ms\":" + String(cache.lastUpdate);
  json += "}";
  server.send(200, "application/json", json);
}

// GET /relay?state=on|off[&duration=SO_GIAY] -> điều khiển relay THỦ CÔNG.
// duration (tùy chọn, chỉ áp dụng khi state=on): số giây sau đó tự tắt. Không truyền -> chạy không giới hạn
// (vẫn bị chặn bởi giới hạn an toàn tối đa RELAY_MAX_ON_MS).
// Bị từ chối nếu đang ở chế độ tự động.
void handleRelay() {
  addCORSHeaders();

  if (server.hasArg("state")) {
    if (autoConfig.enabled) {
      server.send(409, "application/json", "{\"error\":\"Dang o che do tu dong - tat auto truoc khi dieu khien tay\"}");
      return;
    }
    String state = server.arg("state");
    if (state == "on") {
      manualDurationMs = 0; // mặc định không giới hạn, trừ khi có tham số duration
      if (server.hasArg("duration")) {
        long sec = server.arg("duration").toInt();
        if (sec > 0) {
          manualDurationMs = (unsigned long) sec * 1000UL;
        }
      }
      setRelay(true, false);
    } else if (state == "off") {
      setRelay(false, false);
    } else {
      server.send(400, "application/json", "{\"error\":\"state phai la 'on' hoac 'off'\"}");
      return;
    }
  }

  String json = "{";
  json += "\"relay\":\"" + String(relayState ? "on" : "off") + "\"";
  if (relayState) {
    json += ",\"on_duration_ms\":" + String(millis() - relayOnSince);
    if (!relayAutoTriggered) {
      json += ",\"manual_duration_sec\":" + String(manualDurationMs / 1000);
    }
  }
  json += "}";
  server.send(200, "application/json", json);
}

// GET /auto?enabled=1&start=30&stop=70&duration=120 -> cấu hình chế độ tưới tự động
// duration tính bằng GIÂY (web gửi giây cho dễ nhập, firmware tự đổi sang ms).
// Gọi không kèm tham số nào -> chỉ đọc cấu hình hiện tại.
void handleAuto() {
  addCORSHeaders();

  if (server.hasArg("enabled")) {
    String v = server.arg("enabled");
    autoConfig.enabled = (v == "1" || v == "true");
  }
  if (server.hasArg("start")) {
    autoConfig.startPercent = constrain(server.arg("start").toInt(), 0, 100);
  }
  if (server.hasArg("stop")) {
    autoConfig.stopPercent = constrain(server.arg("stop").toInt(), 0, 100);
  }
  if (server.hasArg("duration")) {
    long sec = server.arg("duration").toInt();
    if (sec < 1) sec = 1;
    autoConfig.maxDurationMs = (unsigned long) sec * 1000UL;
  }

  // Nếu vừa tắt chế độ tự động trong lúc bơm đang chạy do auto kích hoạt -> tắt bơm ngay cho an toàn
  if (!autoConfig.enabled && relayState && relayAutoTriggered) {
    setRelay(false);
  }

  Serial.println(">> Cap nhat cau hinh tuoi tu dong:");
  Serial.print("   enabled="); Serial.print(autoConfig.enabled);
  Serial.print(" start="); Serial.print(autoConfig.startPercent);
  Serial.print(" stop="); Serial.print(autoConfig.stopPercent);
  Serial.print(" duration_s="); Serial.println(autoConfig.maxDurationMs / 1000);

  String json = "{";
  json += "\"auto_enabled\":" + String(autoConfig.enabled ? "true" : "false") + ",";
  json += "\"auto_start_percent\":" + String(autoConfig.startPercent) + ",";
  json += "\"auto_stop_percent\":" + String(autoConfig.stopPercent) + ",";
  json += "\"auto_duration_sec\":" + String(autoConfig.maxDurationMs / 1000);
  json += "}";
  server.send(200, "application/json", json);
}

void updateSensorCache() {
  cache.soilRaw = analogRead(SOIL_MOISTURE_PIN);

  // Cảm biến điện trở: giá trị ADC NHỎ = đất ẨM, giá trị LỚN = đất KHÔ -> đảo chiều khi quy đổi %
  int percent = map(cache.soilRaw, SOIL_DRY_VALUE, SOIL_WET_VALUE, 0, 100);
  cache.soilPercent = constrain(percent, 0, 100);

  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t) && !isnan(h)) {
    cache.temperature = t;
    cache.humidity = h;
  }
  cache.lastUpdate = millis();
}

// Logic tưới tự động: gọi mỗi lần cache độ ẩm vừa được cập nhật
void checkAutoIrrigation() {
  if (!autoConfig.enabled) return;

  if (!relayState) {
    // Đang tắt: kiểm tra có nên bật tưới không
    if (cache.soilPercent <= autoConfig.startPercent) {
      Serial.println(">> Auto: do am xuong nguong, bat bom");
      setRelay(true, true);
    }
  } else if (relayAutoTriggered) {
    // Đang tưới do auto kích hoạt: kiểm tra điều kiện dừng
    bool reachedTarget = cache.soilPercent >= autoConfig.stopPercent;
    bool timeUp = (millis() - relayOnSince) >= autoConfig.maxDurationMs;
    if (reachedTarget) {
      Serial.println(">> Auto: da dat do am muc tieu, tat bom");
      setRelay(false);
    } else if (timeUp) {
      Serial.println(">> Auto: het thoi gian toi da, tat bom");
      setRelay(false);
    }
  }
  // Nếu relay đang bật do bấm TAY (không phải auto) thì automation không can thiệp,
  // để tránh xung đột với người dùng đang chủ động điều khiển.
}

void setup() {
  Serial.begin(115200);
  dht.begin();

  pinMode(RELAY_PIN, OUTPUT);
  setRelay(false); // đảm bảo bơm tắt ngay khi khởi động

  Serial.println("=== Smart Garden - Phase 3: WiFi + Web Server + Relay + Auto-Tuoi ===");

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Dang ket noi WiFi");
  unsigned long wifiStart = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - wifiStart < 15000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Da ket noi! IP: ");
  Serial.println(WiFi.localIP());
  Serial.println("--> Dung dia chi IP nay trong web app (SensorPanel) de ket noi.");

  if (MDNS.begin(MDNS_HOSTNAME)) {
    Serial.println("mDNS san sang tai: http://" + String(MDNS_HOSTNAME) + ".local");
  } else {
    Serial.println("Khong khoi dong duoc mDNS (van dung IP truc tiep duoc)");
  }

  server.on("/status", HTTP_GET, handleStatus);
  server.on("/status", HTTP_OPTIONS, handleOptions);
  server.on("/sensors", HTTP_GET, handleSensors);
  server.on("/sensors", HTTP_OPTIONS, handleOptions);
  server.on("/relay", HTTP_GET, handleRelay);
  server.on("/relay", HTTP_OPTIONS, handleOptions);
  server.on("/auto", HTTP_GET, handleAuto);
  server.on("/auto", HTTP_OPTIONS, handleOptions);
  server.begin();
  Serial.println("Web server da san sang tren port 80.");

  updateSensorCache();
  startCloudBridge();
}

void loop() {
  server.handleClient();
  cloudBridgeTick();

  // An toàn tuyệt đối: tự tắt relay nếu bật quá lâu, bất kể do tay hay auto kích hoạt
  if (relayState && (millis() - relayOnSince >= RELAY_MAX_ON_MS)) {
    Serial.println(">> Tu dong tat relay vi qua thoi gian an toan toi da (10 phut)");
    setRelay(false);
  }

  // Bật thủ công có đặt giới hạn thời gian -> tự tắt khi hết giờ
  if (relayState && !relayAutoTriggered && manualDurationMs > 0 && (millis() - relayOnSince >= manualDurationMs)) {
    Serial.println(">> Thu cong: het thoi gian gioi han da dat, tat bom");
    setRelay(false);
  }

  if (millis() - lastRead >= READ_INTERVAL_MS) {
    updateSensorCache();
    checkAutoIrrigation();
    lastRead = millis();

    Serial.println("----------------------------");
    Serial.print("Soil: "); Serial.print(cache.soilPercent); Serial.println("%");
    if (!isnan(cache.temperature)) {
      Serial.print("Temp: "); Serial.print(cache.temperature); Serial.println(" C");
      Serial.print("Humidity: "); Serial.print(cache.humidity); Serial.println(" %");
    } else {
      Serial.println("DHT11: Failed to read!");
    }
    Serial.print("Relay: "); Serial.print(relayState ? "ON" : "OFF");
    Serial.println(relayState && relayAutoTriggered ? " (auto)" : (relayState ? " (thu cong)" : ""));
  }
}
