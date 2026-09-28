// src/services/weatherService.js

import { API_CONFIG, WEATHER_UNITS } from '../constants/constants';
import { formatDate } from '../utils/dateFormatter';

export const isSuccessfulWeatherResponse = (data, expectedCode = 200) => {
  return String(data?.cod) === String(expectedCode);
};

const buildWeatherUrl = (endpoint, city) => {
  const encodedCity = encodeURIComponent(city.trim());
  return `${API_CONFIG.WEATHER_BASE_URL}/${endpoint}?q=${encodedCity}&appid=${API_CONFIG.WEATHER_API_KEY}&units=${WEATHER_UNITS.METRIC}&lang=vi`;
};

export const fetchCurrentWeather = async (city) => {
  const url = buildWeatherUrl('weather', city);
  
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Khóa API thời tiết không hợp lệ');
    }
    throw new Error('Không thể lấy dữ liệu thời tiết');
  }

  const data = await response.json();
  
  if (!isSuccessfulWeatherResponse(data)) {
    throw new Error('Không tìm thấy thành phố');
  }
  
  return data;
};

export const fetchForecast = async (city) => {
  const url = buildWeatherUrl('forecast', city);
  
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Khóa API thời tiết không hợp lệ');
    }
    throw new Error('Không thể lấy dữ liệu thời tiết');
  }

  const data = await response.json();
  
  if (!isSuccessfulWeatherResponse(data)) {
    throw new Error('Không tìm thấy dự báo');
  }
  
  return processForecastData(data);
};

const processForecastData = (forecastData) => {
  const dailyData = {};
  
  forecastData.list.forEach(item => {
    const date = formatDate(item.dt);
    
    if (!dailyData[date]) {
      dailyData[date] = {
        date,
        temp_max: item.main.temp_max,
        temp_min: item.main.temp_min,
        icon: item.weather[0].icon,
        description: item.weather[0].description,
        rain: item.rain?.['3h'] || 0
      };
    } else {
      dailyData[date].temp_max = Math.max(dailyData[date].temp_max, item.main.temp_max);
      dailyData[date].temp_min = Math.min(dailyData[date].temp_min, item.main.temp_min);
      dailyData[date].rain += item.rain?.['3h'] || 0;
    }
  });
  
  return Object.values(dailyData).slice(0, 5);
};