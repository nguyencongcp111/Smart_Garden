// src/utils/weatherAnalyzer.js

import { Wind, CloudRain, ThermometerSun, AlertTriangle, Droplets, Sun } from 'lucide-react';
import { ALERT_LEVELS, ALERT_TYPES } from '../constants/constants';

export const analyzeWeatherAlerts = (weatherData) => {
  const alerts = [];
  
  if (!weatherData) return alerts;

  const temp = weatherData.main?.temp;
  const windSpeed = weatherData.wind?.speed;
  const humidity = weatherData.main?.humidity;
  const rain = weatherData.rain?.['1h'] || 0;
  const description = weatherData.weather?.[0]?.description?.toLowerCase() || '';

  // Cảnh báo bão (dựa trên tốc độ gió và mô tả)
  if (windSpeed > 20 || description.includes('storm') || description.includes('typhoon')) {
    alerts.push({
      type: ALERT_TYPES.STORM,
      level: ALERT_LEVELS.DANGER,
      title: '⚠️ Cảnh báo BÃO',
      message: `Tốc độ gió ${windSpeed.toFixed(1)} m/s. Không nên ra đồng. Gia cố nhà kính và che chắn cây trồng.`,
      icon: Wind
    });
  }

  // Cảnh báo mưa lớn
  if (rain > 10 || description.includes('heavy rain')) {
    alerts.push({
      type: ALERT_TYPES.HEAVY_RAIN,
      level: ALERT_LEVELS.WARNING,
      title: '🌧️ Cảnh báo MƯA LỚN',
      message: 'Mưa lớn có thể gây úng ngập. Kiểm tra hệ thống thoát nước. Tạm hoãn phun thuốc.',
      icon: CloudRain
    });
  }

  // Cảnh báo nắng nóng
  if (temp > 35) {
    alerts.push({
      type: ALERT_TYPES.HEAT,
      level: ALERT_LEVELS.WARNING,
      title: '🌡️ Cảnh báo NẮNG NÓNG',
      message: `Nhiệt độ ${temp.toFixed(1)}°C. Tăng cường tưới nước sáng sớm hoặc chiều mát. Che chắn cây non.`,
      icon: ThermometerSun
    });
  }

  // Cảnh báo sương giá
  if (temp < 10) {
    alerts.push({
      type: ALERT_TYPES.FROST,
      level: ALERT_LEVELS.DANGER,
      title: '❄️ Cảnh báo SƯƠNG GIÁ',
      message: `Nhiệt độ ${temp.toFixed(1)}°C. Nguy cơ sương giá cao. Che phủ cây trồng ngay.`,
      icon: AlertTriangle
    });
  }

  // Cảnh báo độ ẩm cao (nguy cơ bệnh)
  if (humidity > 85) {
    alerts.push({
      type: ALERT_TYPES.HUMIDITY,
      level: ALERT_LEVELS.INFO,
      title: '💧 Cảnh báo ĐỘ ẨM CAO',
      message: `Độ ẩm ${humidity}%. Nguy cơ nấm bệnh cao. Theo dõi sát sâu bệnh.`,
      icon: Droplets
    });
  }

  // Thời tiết thuận lợi
  if (temp >= 20 && temp <= 30 && windSpeed < 5 && humidity < 80 && !rain) {
    alerts.push({
      type: ALERT_TYPES.FAVORABLE,
      level: ALERT_LEVELS.SUCCESS,
      title: '✅ Thời tiết THUẬN LỢI',
      message: 'Điều kiện lý tưởng cho phun thuốc, bón phân và các hoạt động canh tác.',
      icon: Sun
    });
  }

  return alerts;
};