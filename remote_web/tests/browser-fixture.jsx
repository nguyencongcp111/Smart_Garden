// Development-only fixture, opened explicitly at /tests/browser.html; never included in the production entry.
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/App';
import '../src/index.css';

let failSave = false;
let failSensor = false;
let saves = 0;
const sensor = { soil_percent: 24, dht11_ok: true, temperature: 31, humidity: 67, relay: 'off', auto_enabled: false, auto_start_percent: 30, auto_stop_percent: 70, auto_duration_sec: 120 };
const weather = { cod: 200, name: 'Hồ Chí Minh', timezone: 25200, main: { temp: 32, feels_like: 35, humidity: 70, temp_min: 26, temp_max: 33 }, wind: { speed: 3.2 }, weather: [{ id: 801, description: 'mây thưa', icon: '02d' }], sys: { country: 'VN', sunrise: 1790636400, sunset: 1790679600 }, clouds: { all: 20 } };
let pendingCommand = null;
let commandPolls = 0;
document.querySelector('#fail-save').onclick = (event) => { failSave = !failSave; event.target.textContent = `Lỗi lưu: ${failSave ? 'bật' : 'tắt'}`; };
document.querySelector('#fail-sensor').onclick = (event) => { failSensor = !failSensor; event.target.textContent = `Mất mạng: ${failSensor ? 'bật' : 'tắt'}`; };
window.fetch = async (target, options) => {
  const url = new URL(target, location.origin);
  if (url.pathname === '/api/weather' && url.searchParams.get('endpoint') === 'weather') return Response.json(weather);
  if (url.pathname === '/api/weather' && url.searchParams.get('endpoint') === 'forecast') return Response.json({ cod: '200', list: Array.from({ length: 5 }, (_, i) => ({ ...weather, dt: 1790686800 + i * 86400 })) });
  if (url.pathname === '/api/device') {
    if (failSensor) return Response.json({ error: { message: 'ESP32 đang offline (mô phỏng)' } }, { status: 503 });
    if (url.searchParams.get('id') !== 'garden-01' || options.headers.Authorization !== `Bearer ${'w'.repeat(64)}`) return Response.json({ error: { message: 'ID hoặc mã truy cập không đúng (mô phỏng)' } }, { status: 401 });
    const action = url.searchParams.get('action');
    if (action === 'status') return Response.json({ device: 'smart-garden-esp32', device_id: 'garden-01' });
    if (action === 'sensors') return Response.json(sensor);
    if (action === 'command') {
      saves++;
      pendingCommand = JSON.parse(options.body);
      commandPolls = 0;
      document.querySelector('#test-log').textContent = `Lệnh cloud: ${saves} · garden-01 · đang chờ ESP32`;
      return Response.json({ id: 'fixture-command', status: 'pending' }, { status: 202 });
    }
    if (action === 'result') {
      if (++commandPolls < 2) return Response.json({ status: 'pending' });
      if (failSave) return Response.json({ status: 'rejected', error: 'ESP32 từ chối lệnh (mô phỏng)' });
      if (pendingCommand.type === 'auto') {
        const c = pendingCommand.config;
        Object.assign(sensor, { auto_enabled: c.enabled, auto_start_percent: c.startPercent, auto_stop_percent: c.stopPercent, auto_duration_sec: c.durationSec });
      } else { sensor.relay = pendingCommand.on ? 'on' : 'off'; }
      document.querySelector('#test-log').textContent = `Lệnh cloud: ${saves} · garden-01 · ESP32 đã xác nhận`;
      return Response.json({ status: 'confirmed', readings: sensor });
    }
  }
  if (url.pathname === '/status') return Response.json({ device: 'smart-garden-esp32', ip: url.hostname });
  if (url.pathname === '/sensors') {
    if (failSensor) throw new TypeError('Network error');
    return Response.json(sensor);
  }
  if (url.pathname === '/auto') {
    saves += 1;
    document.querySelector('#test-log').textContent = `Lệnh lưu: ${saves} · ${url.hostname} · ${url.search}`;
    if (failSave) return Response.json({ error: 'Simulated error' }, { status: 500 });
    Object.assign(sensor, { auto_enabled: url.searchParams.get('enabled') === '1', auto_start_percent: Number(url.searchParams.get('start')), auto_stop_percent: Number(url.searchParams.get('stop')), auto_duration_sec: Number(url.searchParams.get('duration')) });
    return Response.json({ auto_enabled: sensor.auto_enabled, auto_start_percent: sensor.auto_start_percent, auto_stop_percent: sensor.auto_stop_percent, auto_duration_sec: sensor.auto_duration_sec });
  }
  if (url.pathname === '/relay') { sensor.relay = url.searchParams.get('state'); return Response.json({ relay: sensor.relay }); }
  if (url.pathname.includes('/api/gemini/')) {
    const body = JSON.parse(options.body);
    const context = JSON.parse(body.contents.at(-1).parts[0].text.split('\n')[1]);
    const result = context.sensors ? { reply: `Với ${context.plantName || 'cây chưa đặt tên'}, độ ẩm đất đang ở ${context.sensors.soilMoisturePercent}%, nhiệt độ ${context.sensors.temperatureC}°C. Gợi ý bật tưới khi đất xuống 35%, dừng ở 65%, tối đa 90 giây mỗi lần. Hãy theo dõi và điều chỉnh theo đất và lưu lượng bơm.`, recommendation: { enabled: true, startPercent: 35, stopPercent: 65, durationSec: 90 } } : { reply: 'Hãy kết nối ESP32 để mình nhận dữ liệu cảm biến và gợi ý cấu hình tưới.', recommendation: null };
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(result) }] } }] });
  }
  throw new Error(`Unexpected request in isolated fixture: ${url.pathname}`);
};
createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
