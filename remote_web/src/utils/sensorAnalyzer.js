// src/utils/sensorAnalyzer.js

import { SOIL_THRESHOLDS } from '../constants/constants';

export const classifySoilMoisture = (soilPercent) => {
  if (soilPercent === null || soilPercent === undefined) return null;
  if (soilPercent < SOIL_THRESHOLDS.DRY) {
    return { label: 'Khô - nên tưới nước', level: 'warning' };
  }
  if (soilPercent > SOIL_THRESHOLDS.MOIST) {
    return { label: 'Ướt - không cần tưới', level: 'info' };
  }
  return { label: 'Vừa đủ ẩm', level: 'success' };
};

// So sánh dữ liệu thực đo (DHT11) với dữ liệu dự báo (OpenWeather) cho cùng thời điểm.
// Trả về độ lệch và một số nhận định để hiển thị cho người dùng.
export const compareSensorWithWeather = (sensorData, weatherData) => {
  if (!sensorData || !sensorData.dht11_ok || !weatherData) {
    return null;
  }

  const sensorTemp = sensorData.temperature;
  const sensorHumidity = sensorData.humidity;
  const owTemp = weatherData.main?.temp;
  const owHumidity = weatherData.main?.humidity;

  if (owTemp === undefined || owHumidity === undefined) {
    return null;
  }

  const tempDiff = sensorTemp - owTemp;
  const humidityDiff = sensorHumidity - owHumidity;

  const notes = [];

  // OpenWeather đo ở trạm khí tượng khu vực, DHT11 đo tại chỗ (vườn/nhà kính) -
  // chênh lệch vài độ là bình thường (vi khí hậu), chênh lệch lớn mới đáng chú ý.
  if (Math.abs(tempDiff) >= 5) {
    notes.push(
      tempDiff > 0
        ? `Nhiệt độ tại vườn cao hơn dự báo khu vực ${tempDiff.toFixed(1)}°C — có thể do nhà kính/mái che giữ nhiệt.`
        : `Nhiệt độ tại vườn thấp hơn dự báo khu vực ${Math.abs(tempDiff).toFixed(1)}°C — có thể do bóng râm hoặc vị trí cảm biến.`
    );
  }

  if (Math.abs(humidityDiff) >= 15) {
    notes.push(
      humidityDiff > 0
        ? `Độ ẩm không khí tại vườn cao hơn dự báo ${humidityDiff.toFixed(0)}% — có thể do tưới nước gần đó hoặc thông gió kém.`
        : `Độ ẩm không khí tại vườn thấp hơn dự báo ${Math.abs(humidityDiff).toFixed(0)}% — kiểm tra lại vị trí đặt cảm biến DHT11.`
    );
  }

  if (notes.length === 0) {
    notes.push('Dữ liệu cảm biến khớp với dự báo khu vực — cảm biến đang hoạt động ổn định.');
  }

  return {
    sensorTemp,
    sensorHumidity,
    owTemp,
    owHumidity,
    tempDiff,
    humidityDiff,
    notes,
  };
};

// Gợi ý tưới cây dựa trên độ ẩm đất thực đo + dự báo mưa từ OpenWeather
export const buildIrrigationHint = (soilPercent, weatherData) => {
  if (soilPercent === null || soilPercent === undefined) return null;

  const rainNow = weatherData?.rain?.['1h'] || 0;
  const description = weatherData?.weather?.[0]?.description?.toLowerCase() || '';
  const rainExpected = rainNow > 0 || description.includes('mưa');

  if (soilPercent < SOIL_THRESHOLDS.DRY && !rainExpected) {
    return { label: '💧 Nên tưới nước - đất khô và không có mưa', level: 'warning' };
  }
  if (soilPercent < SOIL_THRESHOLDS.DRY && rainExpected) {
    return { label: '⏳ Đất khô nhưng trời sắp/đang mưa - có thể chờ thêm', level: 'info' };
  }
  if (soilPercent > SOIL_THRESHOLDS.MOIST && rainExpected) {
    return { label: '⚠️ Đất đã ướt và trời đang mưa - kiểm tra thoát nước', level: 'danger' };
  }
  return { label: '✅ Độ ẩm đất ổn, chưa cần tưới', level: 'success' };
};
