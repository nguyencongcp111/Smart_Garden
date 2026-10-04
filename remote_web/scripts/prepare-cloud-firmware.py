from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = root.parent / 'smart_garden_phase3' / 'smart_garden_phase3.ino'
target = root / 'firmware' / 'smart_garden_cloud'
target.mkdir(parents=True, exist_ok=True)
text = source.read_text(encoding='utf-8-sig')
text = text.replace('// ESP32 và máy chạy web app (npm run dev) nằm CHUNG một mạng WiFi/router.', '// Cloud variant: core irrigation unchanged; HTTPS runs in a separate FreeRTOS task.')
text = text.replace('void addCORSHeaders() {', '#include "cloud_bridge.h"\n\nvoid addCORSHeaders() {', 1)
text = text.replace('  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);', '  WiFi.setAutoReconnect(true);\n  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);', 1)
text = text.replace('  while (WiFi.status() != WL_CONNECTED) {', '  unsigned long wifiStart = millis();\n  while (WiFi.status() != WL_CONNECTED && millis() - wifiStart < 15000) {', 1)
text = text.replace('  updateSensorCache();\n}\n\nvoid loop()', '  updateSensorCache();\n  startCloudBridge();\n}\n\nvoid loop()', 1)
text = text.replace('  server.handleClient();', '  server.handleClient();\n  cloudBridgeTick();', 1)
(target / 'smart_garden_cloud.ino').write_text(text, encoding='utf-8')
certs = '\n'.join((root / 'firmware' / 'certs' / name).read_text().strip() for name in ['isrgrootx1.pem', 'gtsr1.pem', 'gtsr4.pem'])
(target / 'cloud_ca.h').write_text('#pragma once\n// Public roots from letsencrypt.org and pki.goog; not secrets.\nstatic const char CLOUD_ROOT_CA[] = R"PEM(' + certs + '\n)PEM";\n', encoding='utf-8')
print('Created firmware/smart_garden_cloud; original sketch was only read.')
