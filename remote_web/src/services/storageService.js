// src/services/storageService.js
//
// Dùng localStorage của trình duyệt (không phải window.storage - API đó chỉ tồn tại
// trong môi trường artifact của Claude, không có khi chạy npm run dev / deploy thật).

import { STORAGE_KEYS } from '../constants/constants';

export const loadFarmData = async () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FARM_DATA);
    if (raw) {
      return JSON.parse(raw);
    }
    return { crops: [], activities: [], notes: [] };
  } catch (error) {
    console.log('No saved data found');
    return { crops: [], activities: [], notes: [] };
  }
};

export const saveFarmData = async (data) => {
  try {
    localStorage.setItem(STORAGE_KEYS.FARM_DATA, JSON.stringify(data));
    return true;
  } catch (error) {
    throw new Error('Lỗi khi lưu dữ liệu: ' + error.message);
  }
};

export const clearFarmData = async () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.FARM_DATA);
    return true;
  } catch (error) {
    throw new Error('Lỗi khi xóa dữ liệu: ' + error.message);
  }
};

// Lưu địa chỉ IP/host của ESP32 để lần sau mở app không phải nhập lại
export const loadSensorConfig = async () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SENSOR_CONFIG);
    if (raw) {
      return JSON.parse(raw);
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const saveSensorConfig = async (config) => {
  try {
    localStorage.setItem(STORAGE_KEYS.SENSOR_CONFIG, JSON.stringify(config));
    return true;
  } catch (error) {
    throw new Error('Lỗi khi lưu cấu hình cảm biến: ' + error.message);
  }
};
