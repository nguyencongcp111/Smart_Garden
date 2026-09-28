// src/components/WeatherDetails.jsx

import React from 'react';
import { ThermometerSun, Droplets, Wind, Eye, Gauge, ArrowUp, ArrowDown, CloudRain, Sunrise, Sunset } from 'lucide-react';
import { formatTime } from '../utils/dateFormatter';

const WeatherDetails = ({ weather }) => {
  const details = [
    {
      icon: ThermometerSun,
      label: 'Cảm giác',
      value: `${Math.round(weather.main.feels_like)}°C`,
      color: 'blue'
    },
    {
      icon: Droplets,
      label: 'Độ ẩm',
      value: `${weather.main.humidity}%`,
      color: 'blue'
    },
    {
      icon: Wind,
      label: 'Gió',
      value: `${weather.wind.speed} m/s`,
      color: 'blue'
    },
    {
      icon: Eye,
      label: 'Tầm nhìn',
      value: `${(weather.visibility / 1000).toFixed(1)} km`,
      color: 'blue'
    },
    {
      icon: Gauge,
      label: 'Áp suất',
      value: `${weather.main.pressure} hPa`,
      color: 'blue'
    },
    {
      icon: ArrowUp,
      label: 'Cao nhất',
      value: `${Math.round(weather.main.temp_max)}°C`,
      color: 'blue'
    },
    {
      icon: ArrowDown,
      label: 'Thấp nhất',
      value: `${Math.round(weather.main.temp_min)}°C`,
      color: 'blue'
    },
    {
      icon: CloudRain,
      label: 'Lượng mưa',
      value: `${weather.rain?.['1h'] || 0} mm`,
      color: 'blue'
    },
    {
      icon: Sunrise,
      label: 'Mặt trời mọc',
      value: formatTime(weather.sys.sunrise),
      color: 'orange'
    },
    {
      icon: Sunset,
      label: 'Mặt trời lặn',
      value: formatTime(weather.sys.sunset),
      color: 'orange'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {details.map((detail, index) => {
        const Icon = detail.icon;
        return (
          <div 
            key={index} 
            className={`bg-${detail.color}-50 rounded-lg p-4`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-5 h-5 text-${detail.color}-600`} />
              <span className="text-gray-600 text-sm">{detail.label}</span>
            </div>
            <div className="text-2xl font-bold text-gray-800">{detail.value}</div>
          </div>
        );
      })}
    </div>
  );
};

export default WeatherDetails;