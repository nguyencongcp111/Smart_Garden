// src/hooks/useWeather.js

import { useState } from 'react';
import { fetchCurrentWeather, fetchForecast } from '../services/weatherService';
import { analyzeWeatherAlerts } from '../utils/weatherAnalyzer';

export const useWeather = () => {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchWeather = async (city) => {
    if (!city.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Lấy thời tiết hiện tại
      const weatherData = await fetchCurrentWeather(city);
      setWeather(weatherData);
      
      // Phân tích cảnh báo
      const newAlerts = analyzeWeatherAlerts(weatherData);
      setAlerts(newAlerts);
      
      // Lấy dự báo
      const forecastData = await fetchForecast(city);
      setForecast(forecastData);
      
    } catch (err) {
      setError(err.message);
      setWeather(null);
      setForecast([]);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    weather,
    forecast,
    alerts,
    loading,
    error,
    searchWeather
  };
};