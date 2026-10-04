// src/services/sensorService.js
//
// Lưu ý kiến trúc: trình duyệt KHÔNG thể tự quét mạng LAN để "tìm" ESP32
// (không có quyền gửi ARP/mDNS broadcast từ JS). Vì vậy "phát hiện cảm biến"
// ở đây nghĩa là: gọi thử tới một địa chỉ (IP tĩnh do người dùng nhập, hoặc
// hostname mDNS như smartgarden.local) và xác nhận nó có phản hồi đúng endpoint
// /status hay không — giống một health-check hơn là quét mạng thật sự.
//
// String target giữ kết nối LAN cũ; { deviceId, token } dùng API cloud.
// HTTPS Production dùng cloud để không phụ thuộc LAN / mixed content.

import { SENSOR_CONFIG } from '../constants/constants';
import { normalizeAutoConfig } from '../utils/irrigationConfig';
import { cloudStatus, cloudReadings, cloudCommand } from './cloudDeviceService';

const isCloud = (target) => target && typeof target === 'object';

const normalizeHost = (host) => {
  let h = host.trim();
  h = h.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return h;
};

export const buildSensorBaseUrl = (host) => {
  const normalized = normalizeHost(host);
  return `http://${normalized}`;
};

const fetchWithTimeout = async (url, timeoutMs = SENSOR_CONFIG.REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return response;
  } catch (error) {
    clearTimeout(timer);
    if (error.name === 'AbortError') {
      throw new Error('Hết thời gian chờ - không có phản hồi từ cảm biến');
    }
    throw new Error('Không kết nối được - kiểm tra lại IP và mạng WiFi (cảm biến phải chung mạng với máy này)');
  }
};

// "Phát hiện" cảm biến: gọi /status, coi là tìm thấy nếu phản hồi hợp lệ
export const detectSensor = async (host) => {
  if (isCloud(host)) return cloudStatus(host);
  if (typeof location !== 'undefined' && location.protocol === 'https:') throw new Error('Hãy chọn kết nối Internet bằng ID thiết bị khi dùng website HTTPS.');
  const baseUrl = buildSensorBaseUrl(host);
  const response = await fetchWithTimeout(`${baseUrl}${SENSOR_CONFIG.STATUS_ENDPOINT}`);

  if (!response.ok) {
    throw new Error(`Thiết bị phản hồi lỗi (HTTP ${response.status})`);
  }

  const data = await response.json();
  if (!data || data.device !== 'smart-garden-esp32') {
    throw new Error('Địa chỉ này phản hồi nhưng không phải thiết bị Smart Garden');
  }

  return data;
};

export const fetchSensorReadings = async (host) => {
  if (isCloud(host)) return cloudReadings(host);
  const baseUrl = buildSensorBaseUrl(host);
  const response = await fetchWithTimeout(`${baseUrl}${SENSOR_CONFIG.SENSORS_ENDPOINT}`);

  if (!response.ok) {
    throw new Error(`Không lấy được dữ liệu cảm biến (HTTP ${response.status})`);
  }

  return response.json();
};

// Bật/tắt relay bơm tưới. turnOn=true -> "on", false -> "off".
// durationSec (tùy chọn, chỉ áp dụng khi turnOn=true): tự tắt sau số giây này.
// Không truyền -> chạy không giới hạn (vẫn bị chặn bởi giới hạn an toàn 10 phút trên ESP32).
export const setRelayState = async (host, turnOn, durationSec) => {
  if (isCloud(host)) {
    const result = await cloudCommand(host, { type: 'relay', on: turnOn, durationSec: turnOn ? durationSec : 0 });
    if (result.relay !== (turnOn ? 'on' : 'off')) throw new Error('ESP32 chưa xác nhận đúng trạng thái bơm yêu cầu.');
    return result;
  }
  const baseUrl = buildSensorBaseUrl(host);
  let url = `${baseUrl}${SENSOR_CONFIG.RELAY_ENDPOINT}?state=${turnOn ? 'on' : 'off'}`;
  if (turnOn && durationSec) {
    url += `&duration=${durationSec}`;
  }
  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || `Không điều khiển được relay (HTTP ${response.status})`);
  }

  return response.json();
};

// Cấu hình chế độ tưới tự động: enabled, startPercent (độ ẩm bật tưới),
// stopPercent (độ ẩm tắt tưới), durationSec (thời gian tưới tối đa, tính bằng giây)
export const setAutoConfig = async (host, config) => {
  const { enabled, startPercent, stopPercent, durationSec } = normalizeAutoConfig(config);
  if (isCloud(host)) {
    const result = await cloudCommand(host, { type: 'auto', config: { enabled, startPercent, stopPercent, durationSec } });
    if (result.auto_enabled !== enabled || result.auto_start_percent !== startPercent || result.auto_stop_percent !== stopPercent || result.auto_duration_sec !== durationSec) throw new Error('ESP32 chưa xác nhận đúng cấu hình yêu cầu.');
    return result;
  }
  const baseUrl = buildSensorBaseUrl(host);
  const params = new URLSearchParams({
    enabled: enabled ? '1' : '0',
    start: String(startPercent),
    stop: String(stopPercent),
    duration: String(durationSec),
  });
  const response = await fetchWithTimeout(`${baseUrl}${SENSOR_CONFIG.AUTO_ENDPOINT}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Không lưu được cấu hình tự động (HTTP ${response.status})`);
  }

  const result = await response.json();
  if (result.auto_enabled !== enabled || result.auto_start_percent !== startPercent || result.auto_stop_percent !== stopPercent || result.auto_duration_sec !== durationSec) {
    throw new Error('ESP32 chưa xác nhận đúng cấu hình yêu cầu. Hãy kiểm tra cấu hình hiện tại trước khi thử lại.');
  }
  return result;
};
