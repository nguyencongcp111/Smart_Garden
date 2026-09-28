// src/utils/fileHandler.js

import { getCurrentDateTime } from './dateFormatter';

export const readFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        resolve(content);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Lỗi đọc file'));
    reader.readAsText(file);
  });
};

export const parseJSON = (content) => {
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error('File JSON không hợp lệ');
  }
};

export const parseCSV = (content) => {
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',');
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });
      data.push(row);
    }
  }
  
  return data;
};

export const createTextNote = (content) => {
  return {
    id: Date.now(),
    date: getCurrentDateTime(),
    content: content
  };
};

export const downloadJSON = (data, filename) => {
  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  downloadBlob(dataBlob, filename);
};

export const downloadCSV = (data, filename) => {
  if (!data || data.length === 0) {
    throw new Error('Không có dữ liệu để xuất');
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => row[header] || '').join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};