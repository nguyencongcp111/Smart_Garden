import React, { useEffect, useRef, useState } from 'react';
import { Wifi, WifiOff, Loader2, Droplets, Thermometer, Sprout, Power, SlidersHorizontal, Sparkles, ArrowRight, AlertCircle, Check, Cable, X } from 'lucide-react';
import { classifySoilMoisture, compareSensorWithWeather, buildIrrigationHint } from '../utils/sensorAnalyzer';
import { validateAutoConfig } from '../utils/irrigationConfig';

const DEFAULT_CONFIG = { enabled: false, startPercent: 30, stopPercent: 70, durationSec: 120 };
const readConfig = (readings) => readings ? { enabled: !!readings.auto_enabled, startPercent: readings.auto_start_percent ?? 30, stopPercent: readings.auto_stop_percent ?? 70, durationSec: readings.auto_duration_sec ?? 120 } : DEFAULT_CONFIG;
const STATUS = { idle: 'Chưa kết nối', detecting: 'Đang kết nối', connected: 'Đã kết nối', error: 'Mất kết nối' };

export default function SensorPanel({ sensor, weather, alerts, plantName, onPlantNameChange, reviewDraft, onAskAssistant }) {
  const { host, setHost, activeHost, sessionId, status, readings, error, detect, disconnect, relayLoading, toggleRelay, autoSaving, updateAutoConfig, configVersion } = sensor;
  const connected = status === 'connected';
  const cloud = sensor.connectionMode === 'cloud';
  const busy = autoSaving || relayLoading;
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoForm, setAutoForm] = useState(DEFAULT_CONFIG);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [manualDuration, setManualDuration] = useState(60);
  const formRef = useRef(null);
  const firstField = useRef(null);

  useEffect(() => { setDirty(false); setSaved(false); setAutoOpen(false); setAutoForm(DEFAULT_CONFIG); }, [sessionId]);
  useEffect(() => { setDirty(false); }, [configVersion]);
  useEffect(() => { if (!dirty) setAutoForm(readConfig(readings)); }, [readings, dirty]);
  useEffect(() => {
    if (!reviewDraft || reviewDraft.sessionId !== sessionId) return;
    setAutoForm({ ...reviewDraft.config });
    setDirty(true);
    setSaved(false);
    setAutoOpen(true);
    const timer = setTimeout(() => { formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); firstField.current?.focus({ preventScroll: true }); }, 100);
    return () => clearTimeout(timer);
  }, [reviewDraft, sessionId]);

  const changeField = (field, value) => { setAutoForm((prev) => ({ ...prev, [field]: value })); setDirty(true); setSaved(false); };
  const configError = validateAutoConfig(autoForm);
  const manualInvalid = !Number.isInteger(Number(manualDuration)) || Number(manualDuration) < 1 || Number(manualDuration) > 600;
  const save = async (event) => {
    event.preventDefault();
    try { await updateAutoConfig(autoForm); setDirty(false); setSaved(true); }
    catch { setSaved(false); }
  };
  const soil = readings ? classifySoilMoisture(readings.soil_percent) : null;
  const hint = connected && readings ? buildIrrigationHint(readings.soil_percent, weather) : null;
  const comparison = connected && readings ? compareSensorWithWeather(readings, weather) : null;
  const relevantAlerts = alerts.filter((alert) => alert.level !== 'success');

  return (
    <section className="garden-panel sensor-panel" aria-labelledby="sensor-heading">
      <div className="panel-heading"><div className="panel-title"><span className="section-icon"><Sprout size={23} /></span><div><p className="eyebrow">BÊN TRONG KHU VƯỜN</p><h2 id="sensor-heading">Cây & cảm biến</h2></div></div><span className={`connection-badge ${status}`}><span className="tiny-dot" />{STATUS[status]}</span></div>
      <div className="connection-mode" role="group" aria-label="Cách kết nối ESP32">
        <button type="button" className={cloud ? 'secondary-button' : 'text-button'} aria-pressed={cloud} disabled={busy || status === 'detecting'} onClick={() => sensor.changeConnectionMode?.('cloud')}>Internet · ID thiết bị</button>
        <button type="button" className={!cloud ? 'secondary-button' : 'text-button'} aria-pressed={!cloud} disabled={busy || status === 'detecting' || (typeof location !== 'undefined' && location.protocol === 'https:')} onClick={() => sensor.changeConnectionMode?.('local')}>Wi-Fi nội bộ · IP</button>
      </div>
      {cloud && <label className="cloud-token">Mã truy cập web<input type="password" aria-label="Mã truy cập web" autoComplete="off" value={sensor.accessToken} onChange={(e) => sensor.setAccessToken(e.target.value)} disabled={busy || status === 'detecting'} placeholder="Mã webToken của thiết bị" /></label>}
      <form className="search-bar" onSubmit={(event) => { event.preventDefault(); detect(host); }}>
        <Wifi size={19} /><input aria-label={cloud ? 'ID thiết bị ESP32' : 'Địa chỉ IP ESP32'} value={host} onChange={(event) => setHost(event.target.value)} placeholder={cloud ? 'Nhập ID thiết bị, vd: garden-01' : 'Nhập IP ESP32, vd: 192.168.1.45'} disabled={busy || status === 'detecting' || connected} required />
        <button className="primary-button" disabled={busy || status === 'detecting' || !host.trim()}>{status === 'detecting' ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}<span>Kết nối</span></button>
      </form>
      {error && <p className="notice danger" role="alert"><AlertCircle size={17} />{error}</p>}
      {host.trim() && <label className="plant-field"><Sprout size={19} /><span>Tên cây <small>(tùy chọn)</small><input aria-label="Tên cây" value={plantName} onChange={(event) => onPlantNameChange(event.target.value)} placeholder="Ví dụ: Húng quế, cà chua, sen đá..." maxLength={100} /></span></label>}
      {status === 'detecting' && <div className="empty-state compact" role="status"><Loader2 size={35} className="animate-spin" /><h3>Đang kết nối khu vườn...</h3><p>Đợi một chút để nhận dữ liệu từ ESP32.</p></div>}
      {!readings && status !== 'detecting' && <div className="empty-state"><div className="empty-illustration"><Sprout size={64} strokeWidth={1} /><span className="orbit-dot" /></div><h3>{status === 'error' ? 'Chưa kết nối được ESP32' : cloud ? 'Hãy nhập ID thiết bị' : 'Hãy nhập IP'}</h3><p>Kết nối ESP32 để lắng nghe cây của bạn<br />qua từng chỉ số cảm biến.</p><span className="empty-caption"><Cable size={14} /> {cloud ? 'THEO DÕI KHU VƯỜN QUA INTERNET' : 'ESP32 VÀ THIẾT BỊ CẦN CÙNG MẠNG WI-FI'}</span></div>}
      {readings && <div className="sensor-content">
        <div className="device-line"><span>{connected ? <Wifi size={14} /> : <WifiOff size={14} />} ESP32 · {activeHost}{!connected && ' · Số đo lần cuối'}</span><button className="text-button" onClick={disconnect} disabled={busy}>Ngắt kết nối</button></div>
        {cloud && busy && <p className="helper-text" role="status">Đang chờ ESP32 xác nhận thực hiện qua Internet, thường khoảng 10–25 giây...</p>}
        <div className="sensor-metrics">
          <div className="sensor-metric soil"><Droplets size={21} /><span>Độ ẩm đất</span><strong>{readings.soil_percent ?? '—'}<small>%</small></strong><span>{soil?.label || 'Chưa có số đo'}</span></div>
          <div className="sensor-metric"><Thermometer size={21} /><span>Nhiệt độ</span><strong>{readings.dht11_ok ? readings.temperature : '—'}<small>°C</small></strong><span>DHT11 tại vườn</span></div>
          <div className="sensor-metric"><Droplets size={21} /><span>Độ ẩm không khí</span><strong>{readings.dht11_ok ? readings.humidity : '—'}<small>%</small></strong><span>DHT11 tại vườn</span></div>
        </div>
        <div className="pump-section"><div className="subheading"><div className="pump-title"><Power size={18} /><div><h3>Bơm tưới nước</h3><p>{readings.relay === 'on' ? 'Đang tưới' : 'Đang nghỉ'} · {readings.auto_enabled ? 'Tự động' : 'Thủ công'}</p></div></div><button className={readings.relay === 'on' ? 'danger-button' : 'secondary-button'} onClick={() => toggleRelay(readings.relay !== 'on', Number(manualDuration))} title={readings.auto_enabled ? 'Tắt chế độ tự động trước khi điều khiển bơm thủ công' : ''} disabled={busy || !connected || readings.auto_enabled || (readings.relay !== 'on' && manualInvalid)}>{relayLoading ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}{readings.relay === 'on' ? 'Tắt bơm' : 'Bật bơm'}</button></div>
          {!readings.auto_enabled && readings.relay !== 'on' && <label className="manual-duration">Tưới trong <input type="number" aria-label="Thời gian tưới thủ công" value={manualDuration} onChange={(e) => setManualDuration(e.target.value)} min="1" max="600" step="1" /> giây <span>(1–600 giây)</span></label>}
          {readings.auto_enabled && <p className="helper-text">Tự động bật ≤ {readings.auto_start_percent}% · dừng ≥ {readings.auto_stop_percent}% · tối đa {readings.auto_duration_sec} giây.</p>}
        </div>
        <button className="ai-prompt" onClick={onAskAssistant} disabled={!connected || busy}><span className="ai-icon"><Sparkles size={21} /></span><span><strong>Để trợ lý chăm cây cùng bạn</strong><small>Gợi ý cấu hình tưới từ cảm biến{plantName.trim() ? ` cho ${plantName.trim()}` : ' và tên cây'}.</small></span><ArrowRight size={18} className="ai-arrow" /></button>
        <div className="auto-section" ref={formRef}><button className="auto-toggle" onClick={() => setAutoOpen(!autoOpen)} aria-expanded={autoOpen} aria-controls="auto-config-form"><span><SlidersHorizontal size={18} /> Cấu hình tưới tự động</span>{autoOpen ? <X size={17} /> : <span>Thiết lập <ArrowRight size={15} /></span>}</button>
          {autoOpen && <form id="auto-config-form" className="auto-form" onSubmit={save}><div className="subheading"><p>{dirty ? 'Chỉnh thông số rồi lưu khi bạn sẵn sàng.' : 'Cấu hình hiện tại trên ESP32.'}</p><label className="auto-enabled"><input type="checkbox" checked={autoForm.enabled} onChange={(e) => changeField('enabled', e.target.checked)} disabled={busy} /> Bật tự động</label></div>
            <div className="config-fields"><label>Bật tưới ≤ (%)<input ref={firstField} aria-label="Ngưỡng bật tưới" type="number" min="0" max="100" step="1" required value={autoForm.startPercent} onChange={(e) => changeField('startPercent', e.target.value)} disabled={busy} /></label><label>Dừng tưới ≥ (%)<input aria-label="Ngưỡng dừng tưới" type="number" min="0" max="100" step="1" required value={autoForm.stopPercent} onChange={(e) => changeField('stopPercent', e.target.value)} disabled={busy} /></label><label>Tối đa (giây)<input aria-label="Thời gian tưới tối đa" type="number" min="1" max="600" step="1" required value={autoForm.durationSec} onChange={(e) => changeField('durationSec', e.target.value)} disabled={busy} /></label></div>
            {configError && <p className="form-error" role="alert">{configError}</p>}
            <div className="save-row"><button className="primary-button" disabled={busy || !connected || !!configError}>{autoSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}Lưu cấu hình</button><span role="status">{saved ? 'Đã lưu trên ESP32' : dirty ? 'Chưa lưu thay đổi' : ''}</span></div>
          </form>}
        </div>
      </div>}
      {(hint || relevantAlerts.length > 0 || (readings && !readings.dht11_ok)) && <div className="garden-alerts"><h3><AlertCircle size={16} /> Lưu ý cho khu vườn</h3>
        {readings && !readings.dht11_ok && <p className="notice warning">Chưa đọc được DHT11. Hãy kiểm tra cảm biến nhiệt độ và độ ẩm không khí.</p>}
        {hint && <p className={`notice ${hint.level}`}>{hint.label}</p>}
        {relevantAlerts.map((alert, index) => <div className={`notice ${alert.level}`} key={index}><strong>{alert.title}</strong><p>{alert.message}</p></div>)}
        {comparison && <details className="comparison"><summary>Đối chiếu với thời tiết khu vực</summary><p>Nhiệt độ: {comparison.sensorTemp}°C tại vườn / {comparison.owTemp}°C khu vực.</p><p>Độ ẩm: {comparison.sensorHumidity}% tại vườn / {comparison.owHumidity}% khu vực.</p>{comparison.notes.map((note) => <p key={note}>{note}</p>)}</details>}
      </div>}
    </section>
  );
}
