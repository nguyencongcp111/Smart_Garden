// src/utils/dateFormatter.js

export const formatTime = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleTimeString('vi-VN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

export const formatDate = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleDateString('vi-VN', { 
    weekday: 'short', 
    day: 'numeric',
    month: 'numeric'
  });
};

export const formatDateTime = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleString('vi-VN');
};

export const getCurrentDate = () => {
  return new Date().toISOString().split('T')[0];
};

export const getCurrentDateTime = () => {
  return new Date().toLocaleString('vi-VN');
};