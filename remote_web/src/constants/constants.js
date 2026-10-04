// src/constants/constants.js

export const API_CONFIG = {
  WEATHER_BASE_URL: '/api/weather',
  // Full model collection path; chatService appends /<model>:generateContent.
  GEMINI_API_URL: '/api/gemini/v1beta/models',
  GEMINI_MODEL: 'gemini-2.5-flash',
};

export const WEATHER_UNITS = {
  METRIC: 'metric',
  IMPERIAL: 'imperial',
};

export const ALERT_LEVELS = {
  DANGER: 'danger',
  WARNING: 'warning',
  INFO: 'info',
  SUCCESS: 'success',
};

export const ALERT_TYPES = {
  STORM: 'storm',
  HEAVY_RAIN: 'heavy-rain',
  HEAT: 'heat',
  FROST: 'frost',
  HUMIDITY: 'humidity',
  FAVORABLE: 'favorable',
};

export const ALERT_COLORS = {
  [ALERT_LEVELS.DANGER]: {
    bg: 'bg-red-50',
    border: 'border-red-500',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
  },
  [ALERT_LEVELS.WARNING]: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-500',
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
  },
  [ALERT_LEVELS.INFO]: {
    bg: 'bg-blue-50',
    border: 'border-blue-500',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  [ALERT_LEVELS.SUCCESS]: {
    bg: 'bg-green-50',
    border: 'border-green-500',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
  },
};

export const SAMPLE_QUESTIONS = [
  "Thời tiết hôm nay có phù hợp để phun thuốc không?",
  "Khi nào nên tưới nước cho lúa?",
  "Làm thế nào để phòng tránh sâu bệnh khi mưa nhiều?",
  "Cây trồng nào phù hợp với thời tiết hiện tại?",
];

export const SENSOR_CONFIG = {
  DEFAULT_IP: '',
  DEFAULT_MDNS: 'smartgarden.local',
  PORT: 80,
  STATUS_ENDPOINT: '/status',
  SENSORS_ENDPOINT: '/sensors',
  RELAY_ENDPOINT: '/relay',
  AUTO_ENDPOINT: '/auto',
  POLL_INTERVAL_MS: 5000,
  REQUEST_TIMEOUT_MS: 3000,
};

// Ngưỡng % độ ẩm đất để phân loại (điều chỉnh theo loại cây trồng nếu cần)
export const SOIL_THRESHOLDS = {
  DRY: 30,   // dưới mức này: đất khô, cần tưới
  MOIST: 70, // trên mức này: đất đủ ẩm/ướt
};

export const STORAGE_KEYS = {
  FARM_DATA: 'farm-data',
  SENSOR_CONFIG: 'sensor-config',
};

export const FILE_TYPES = {
  JSON: '.json',
  CSV: '.csv',
  TXT: '.txt',
};
