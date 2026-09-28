// src/components/ForecastCard.jsx

import React from 'react';

const ForecastCard = ({ day }) => {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-xl p-4 text-center">
      <div className="font-semibold text-gray-700 mb-2">{day.date}</div>
      <img 
        src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`}
        alt="weather"
        className="w-16 h-16 mx-auto"
      />
      <div className="text-sm capitalize text-gray-600 mb-2">{day.description}</div>
      <div className="flex justify-center gap-2 text-sm">
        <span className="text-red-600 font-semibold">{Math.round(day.temp_max)}°</span>
        <span className="text-blue-600">{Math.round(day.temp_min)}°</span>
      </div>
      {day.rain > 0 && (
        <div className="text-xs text-blue-600 mt-1">☔ {day.rain.toFixed(1)}mm</div>
      )}
    </div>
  );
};

export default ForecastCard;