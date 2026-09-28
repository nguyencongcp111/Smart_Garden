// src/hooks/useFarmData.js

import { useState, useEffect } from 'react';
import { loadFarmData, saveFarmData, clearFarmData } from '../services/storageService';
import { readFile, parseJSON, parseCSV, createTextNote, downloadJSON, downloadCSV } from '../utils/fileHandler';
import { getCurrentDate, getCurrentDateTime } from '../utils/dateFormatter';

export const useFarmData = (weather) => {
  const [farmData, setFarmData] = useState({
    crops: [],
    activities: [],
    notes: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await loadFarmData();
    setFarmData(data);
  };

  const saveData = async (data) => {
    try {
      await saveFarmData(data);
      setFarmData(data);
      alert('Đã lưu dữ liệu thành công!');
    } catch (error) {
      alert(error.message);
    }
  };

  const handleFileUpload = async (file) => {
    try {
      const content = await readFile(file);
      
      if (file.name.endsWith('.json')) {
        const jsonData = parseJSON(content);
        saveData(jsonData);
      } else if (file.name.endsWith('.csv')) {
        const activities = parseCSV(content);
        saveData({ ...farmData, activities });
      } else {
        const newNote = createTextNote(content);
        saveData({ ...farmData, notes: [...farmData.notes, newNote] });
      }
    } catch (error) {
      alert('Lỗi đọc file: ' + error.message);
    }
  };

  const handleDownloadJSON = () => {
    downloadJSON(farmData, `farm-data-${getCurrentDate()}.json`);
  };

  const handleDownloadCSV = () => {
    try {
      downloadCSV(farmData.activities, `farm-activities-${getCurrentDate()}.csv`);
    } catch (error) {
      alert(error.message);
    }
  };

  const addCrop = (cropName) => {
    const newCrop = {
      id: Date.now(),
      name: cropName,
      plantDate: getCurrentDate(),
      status: 'Đang trồng'
    };
    saveData({ ...farmData, crops: [...farmData.crops, newCrop] });
  };

  const addActivity = (activityName) => {
    const newActivity = {
      id: Date.now(),
      date: getCurrentDateTime(),
      activity: activityName,
      weather: weather ? `${Math.round(weather.main.temp)}°C, ${weather.weather[0].description}` : 'N/A'
    };
    saveData({ ...farmData, activities: [...farmData.activities, newActivity] });
  };

  const deleteItem = (type, id) => {
    const newData = { ...farmData };
    newData[type] = newData[type].filter(item => item.id !== id);
    saveData(newData);
  };

  const clearAll = async () => {
    try {
      await clearFarmData();
      setFarmData({ crops: [], activities: [], notes: [] });
      alert('Đã xóa tất cả dữ liệu!');
    } catch (error) {
      alert(error.message);
    }
  };

  return {
    farmData,
    handleFileUpload,
    handleDownloadJSON,
    handleDownloadCSV,
    addCrop,
    addActivity,
    deleteItem,
    clearAll
  };
};