import React, { useState } from 'react';
import { Sprout, ArrowUpRight } from 'lucide-react';
import WeatherPanel from './components/WeatherPanel';
import SensorPanel from './components/SensorPanel';
import Chatbot from './components/Chatbot';
import BotanicalBackground from './components/BotanicalBackground';
import { useWeather } from './hooks/useWeather';
import { useSensor } from './hooks/useSensor';
import { useChat } from './hooks/useChat';

export default function App() {
  const weather = useWeather();
  const sensor = useSensor();
  const [plantName, setPlantName] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [reviewDraft, setReviewDraft] = useState(null);
  const contextKey = `${sensor.sessionId}|${sensor.activeHost}|${plantName.trim()}`;
  const chat = useChat({ weather: weather.weather, readings: sensor.status === 'connected' ? sensor.readings : null, plantName, contextKey });

  const handleRecommendation = async (message, action) => {
    if (action === 'rejected') {
      chat.updateRecommendation(message.id, { decision: 'rejected' });
      return;
    }
    if (message.contextKey !== contextKey || sensor.status !== 'connected' || sensor.autoSaving) return;
    if (action === 'reviewed') {
      setReviewDraft({ id: message.id, config: message.recommendation, sessionId: sensor.sessionId });
      chat.updateRecommendation(message.id, { decision: 'reviewed' });
      setChatOpen(false);
      return;
    }
    chat.updateRecommendation(message.id, { decision: 'saving', actionError: null });
    try {
      await sensor.updateAutoConfig(message.recommendation);
      setReviewDraft(null);
      chat.updateRecommendation(message.id, { decision: 'applied' });
    } catch (error) {
      chat.updateRecommendation(message.id, { decision: null, actionError: error.message });
    }
  };

  return (
    <div className="garden-app">
      <BotanicalBackground />
      <div className="garden-shell">
        <header className="garden-header">
          <a href="./" className="brand" aria-label="Smart Garden — trang chủ"><span className="brand-icon"><Sprout size={26} /></span><span>smart<span className="brand-light">garden</span><small>CHĂM CÂY, THẬT THẢNH THƠI.</small></span></a>
          <span className="header-note">Một góc xanh. Vạn điều an lành.<ArrowUpRight size={16} /></span>
        </header>
        <main>
          <div className="page-intro"><p className="eyebrow">YOUR EVERYDAY GARDEN</p><h1>Khu vườn trong tầm tay<span>.</span></h1><p>Theo dõi thời tiết, lắng nghe cây và chăm sóc khu vườn của bạn.</p></div>
          <div className="garden-grid">
            <WeatherPanel {...weather} />
            <SensorPanel sensor={sensor} weather={weather.weather} alerts={weather.alerts} plantName={plantName} onPlantNameChange={setPlantName} reviewDraft={reviewDraft} onAskAssistant={() => { setChatOpen(true); chat.sendMessage('Hãy gợi ý các chỉ số tưới tự động dựa trên cảm biến hiện tại và tên cây của tôi.'); }} />
          </div>
        </main>
        <footer className="garden-footer"><span><span className="tiny-dot" /> Gắn kết công nghệ với thiên nhiên</span><span>SMART GARDEN / ESP32</span></footer>
      </div>
      <Chatbot isOpen={chatOpen} onToggle={() => setChatOpen(!chatOpen)} {...chat} onInputChange={chat.setInputMessage} onSend={chat.sendMessage} onRecommendation={handleRecommendation} contextKey={contextKey} connected={sensor.status === 'connected'} autoSaving={sensor.autoSaving} plantName={plantName} />
    </div>
  );
}
