// src/components/CurrentWeather.jsx

import React from 'react';
import WeatherDetails from './WeatherDetails';

const CurrentWeather = ({ weather }) => {
  if (!weather) return null;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{weather.name}</h2>
        <div className="flex items-center justify-center gap-4">
          <img 
            src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png`}
            alt="weather"
            className="w-32 h-32"
          />
          <div>
            <div className="text-6xl font-bold text-gray-800">
              {Math.round(weather.main.temp)}°C
            </div>
            <div className="text-xl text-gray-600 capitalize">
              {weather.weather[0].description}
            </div>
          </div>
        </div>
      </div>

      <WeatherDetails weather={weather} />
    </div>
  );
};

export default CurrentWeather;