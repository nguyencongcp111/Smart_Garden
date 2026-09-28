// src/App.jsx

import React, { useState } from 'react';
import Header from './components/Header';
import WeatherAlerts from './components/WeatherAlerts';
import CurrentWeather from './components/CurrentWeather';
import ForecastList from './components/ForecastList';
import Chatbot from './components/Chatbot';
import DataManager from './components/DataManager';
import SensorPanel from './components/SensorPanel';
import { useWeather } from './hooks/useWeather';
import { useFarmData } from './hooks/useFarmData';
import { useChat } from './hooks/useChat';
import { useSensor } from './hooks/useSensor';

const App = () => {
  const [showDataManager, setShowDataManager] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // Weather hook
  const { weather, forecast, alerts, loading, error, searchWeather } = useWeather();

  // Sensor hook (ESP32: soil moisture + DHT11)
  const sensor = useSensor();

  // Farm data hook
  const {
    farmData,
    handleFileUpload,
    handleDownloadJSON,
    handleDownloadCSV,
    addCrop,
    addActivity,
    deleteItem,
    clearAll
  } = useFarmData(weather);

  // Chat hook
  const {
    messages,
    inputMessage,
    setInputMessage,
    loading: chatLoading,
    sendMessage,
    chatEndRef
  } = useChat(weather);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header with Search */}
        <Header 
          onSearch={searchWeather}
          onToggleDataManager={() => setShowDataManager(!showDataManager)}
          loading={loading}
        />

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4 mb-6">
            <p className="text-red-700 font-semibold">❌ {error}</p>
          </div>
        )}

        {/* Data Manager */}
        <DataManager 
          isOpen={showDataManager}
          onClose={() => setShowDataManager(false)}
          farmData={farmData}
          onFileUpload={handleFileUpload}
          onDownloadJSON={handleDownloadJSON}
          onDownloadCSV={handleDownloadCSV}
          onAddCrop={addCrop}
          onAddActivity={addActivity}
          onDeleteItem={deleteItem}
          onClearAll={clearAll}
        />

        {/* Weather Alerts */}
        <WeatherAlerts alerts={alerts} />

        {/* Sensor Panel (ESP32: soil moisture + DHT11, đối chiếu với OpenWeather) */}
        <SensorPanel sensor={sensor} weather={weather} />

        {/* Current Weather */}
        <CurrentWeather weather={weather} />

        {/* Forecast */}
        <ForecastList forecast={forecast} />
      </div>

      {/* Chatbot */}
      <Chatbot 
        isOpen={chatOpen}
        onToggle={() => setChatOpen(!chatOpen)}
        messages={messages}
        inputMessage={inputMessage}
        onInputChange={setInputMessage}
        onSend={sendMessage}
        loading={chatLoading}
        chatEndRef={chatEndRef}
      />
    </div>
  );
};

export default App;