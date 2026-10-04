import React, { useState } from 'react';
import { CloudSun, Search, MapPin, Wind, Droplets, CloudRain, Loader2, Sunrise, Sunset } from 'lucide-react';

export default function WeatherPanel({ weather, forecast, loading, error, searchWeather }) {
  const [query, setQuery] = useState('');
  const localTime = (timestamp) => timestamp ? new Date((timestamp + (weather.timezone || 0)) * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '—';
  return (
    <section className="garden-panel weather-panel" aria-labelledby="weather-heading">
      <div className="panel-heading"><div className="panel-title"><span className="section-icon"><CloudSun size={23} /></span><div><p className="eyebrow">NGOÀI KHU VƯỜN</p><h2 id="weather-heading">Thời tiết khu vực</h2></div></div><span className="source-label">OpenWeather</span></div>
      <form className="search-bar" onSubmit={(e) => { e.preventDefault(); searchWeather(query); }}>
        <Search size={19} /><input aria-label="Tìm kiếm khu vực" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm thành phố, khu vực..." required />
        <button className="primary-button" disabled={loading || !query.trim()}>{loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}<span>Tìm kiếm</span></button>
      </form>
      {error && <p className="notice danger" role="alert">{error}</p>}
      {loading ? <div className="empty-state" role="status"><Loader2 size={36} className="animate-spin" /><p>Đang xem bầu trời nơi bạn...</p></div> : !weather ? (
        <div className="empty-state"><div className="empty-illustration"><CloudSun size={62} strokeWidth={1} /><span className="orbit-dot" /></div><h3>Hãy tìm kiếm khu vực của bạn</h3><p>Thời tiết hôm nay sẽ kể bạn nghe<br />khu vườn cần được chăm sóc thế nào.</p><span className="empty-caption">MỘT CHÚT THẤU HIỂU, THÊM MỘT MẦM XANH</span></div>
      ) : (
        <div className="weather-content">
          <div className="location-line"><MapPin size={16} /><h3>{weather.name}{weather.sys?.country ? `, ${weather.sys.country}` : ''}</h3><span>Hiện tại</span></div>
          <div className="weather-hero"><div><div className="temperature">{Math.round(weather.main.temp)}<span>°C</span></div><p>{weather.weather[0].description}</p><small>Cảm giác như {Math.round(weather.main.feels_like)}°C</small></div><img src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png`} alt={weather.weather[0].description} /></div>
          <div className="weather-metrics"><div><Droplets size={19} /><span>Độ ẩm</span><strong>{weather.main.humidity}<small>%</small></strong></div><div><Wind size={19} /><span>Gió</span><strong>{weather.wind.speed}<small>m/s</small></strong></div><div><CloudRain size={19} /><span>Mưa / giờ</span><strong>{weather.rain?.['1h'] ?? 0}<small>mm</small></strong></div></div>
          <div className="sun-times"><span><Sunrise size={17} /> Bình minh <b>{localTime(weather.sys?.sunrise)}</b></span><span><Sunset size={17} /> Hoàng hôn <b>{localTime(weather.sys?.sunset)}</b></span></div>
          {forecast.length > 0 && <div className="forecast-section"><div className="subheading"><h3>Những ngày sắp tới</h3><span>Dự báo 5 ngày</span></div><div className="forecast-strip">{forecast.map((day) => <div className="forecast-day" key={day.date}><span>{day.date}</span><img src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`} alt={day.description} /><strong>{Math.round(day.temp_max)}° <small>{Math.round(day.temp_min)}°</small></strong><span className="forecast-rain">{day.rain > 0 ? `${day.rain.toFixed(1)} mm` : 'Không mưa'}</span></div>)}</div></div>}
          <p className="data-source">Dữ liệu thời tiết từ OpenWeather · Đơn vị °C</p>
        </div>
      )}
    </section>
  );
}
