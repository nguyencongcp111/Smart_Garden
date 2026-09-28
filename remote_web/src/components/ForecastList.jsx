// src/components/ForecastList.jsx

import React from 'react';
import ForecastCard from './ForecastCard';

const ForecastList = ({ forecast }) => {
  if (forecast.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-2xl font-bold text-gray-800 mb-4">Dự báo 5 ngày</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {forecast.map((day, index) => (
          <ForecastCard key={index} day={day} />
        ))}
      </div>
    </div>
  );
};

export default ForecastList;