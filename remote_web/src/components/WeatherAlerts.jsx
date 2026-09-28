// src/components/WeatherAlerts.jsx

import React from 'react';
import { ALERT_COLORS } from '../constants/constants';

const WeatherAlerts = ({ alerts }) => {
  if (alerts.length === 0) return null;

  return (
    <div className="grid gap-4 mb-6">
      {alerts.map((alert, index) => {
        const colors = ALERT_COLORS[alert.level];
        const IconComponent = alert.icon;
        
        return (
          <div
            key={index}
            className={`rounded-xl p-4 shadow-md flex items-start gap-4 ${colors.bg} border-2 ${colors.border}`}
          >
            <div className={`p-2 rounded-lg ${colors.iconBg} ${colors.iconColor}`}>
              <IconComponent className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">{alert.title}</h3>
              <p className="text-gray-700">{alert.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default WeatherAlerts;