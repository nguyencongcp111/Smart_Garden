// src/components/SensorPanel.jsx

import React from 'react';
import { Wifi, WifiOff, Loader2, Droplet, Thermometer, RefreshCw, Power, Settings2 } from 'lucide-react';
import { CONNECTION_STATUS } from '../hooks/useSensor';
import { classifySoilMoisture, compareSensorWithWeather, buildIrrigationHint } from '../utils/sensorAnalyzer';

const STATUS_BADGE = {
  [CONNECTION_STATUS.IDLE]: { text: 'Chưa kết nối', color: 'bg-gray-100 text-gray-600', Icon: WifiOff },
  [CONNECTION_STATUS.DETECTING]: { text: 'Đang dò tìm...', color: 'bg-blue-100 text-blue-600', Icon: Loader2 },
  [CONNECTION_STATUS.CONNECTED]: { text: 'Đã kết nối', color: 'bg-green-100 text-green-700', Icon: Wifi },
  [CONNECTION_STATUS.ERROR]: { text: 'Lỗi kết nối', color: 'bg-red-100 text-red-700', Icon: WifiOff },
};

const LEVEL_COLOR = {
  warning: 'text-yellow-700 bg-yellow-50 border-yellow-300',
  info: 'text-blue-700 bg-blue-50 border-blue-300',
  success: 'text-green-700 bg-green-50 border-green-300',
  danger: 'text-red-700 bg-red-50 border-red-300',
};

const SensorPanel = ({ sensor, weather }) => {
  const { host, setHost, status, deviceInfo, readings, error, detect, relayLoading, toggleRelay, autoSaving, updateAutoConfig } = sensor;
  const badge = STATUS_BADGE[status];

  // Form cấu hình tưới tự động - đồng bộ từ readings khi có dữ liệu mới từ ESP32
  const [autoForm, setAutoForm] = React.useState({ enabled: false, startPercent: 30, stopPercent: 70, durationSec: 120 });
  const [autoFormDirty, setAutoFormDirty] = React.useState(false);

  React.useEffect(() => {
    if (readings && !autoFormDirty) {
      setAutoForm({
        enabled: !!readings.auto_enabled,
        startPercent: readings.auto_start_percent ?? 30,
        stopPercent: readings.auto_stop_percent ?? 70,
        durationSec: readings.auto_duration_sec ?? 120,
      });
    }
  }, [readings, autoFormDirty]);

  const handleAutoFieldChange = (field, value) => {
    setAutoForm((prev) => ({ ...prev, [field]: value }));
    setAutoFormDirty(true);
  };

  const handleAutoSave = async () => {
    await updateAutoConfig(autoForm);
    setAutoFormDirty(false);
  };

  const autoThresholdInvalid = Number(autoForm.startPercent) >= Number(autoForm.stopPercent);

  // Lựa chọn giới hạn thời gian khi bật bơm THỦ CÔNG
  const [manualLimitMode, setManualLimitMode] = React.useState('unlimited'); // 'unlimited' | 'limited'
  const [manualDurationSec, setManualDurationSec] = React.useState(60);

  const handleManualToggle = () => {
    if (readings?.relay === 'on') {
      toggleRelay(false);
    } else {
      toggleRelay(true, manualLimitMode === 'limited' ? Number(manualDurationSec) : undefined);
    }
  };

  const soilInfo = readings ? classifySoilMoisture(readings.soil_percent) : null;
  const irrigationHint = readings ? buildIrrigationHint(readings.soil_percent, weather) : null;
  const comparison = readings ? compareSensorWithWeather(readings, weather) : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    detect(host);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Wifi className="w-6 h-6 text-green-600" />
          Cảm biến vườn (ESP32)
        </h2>
        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
          <badge.Icon className={`w-4 h-4 ${status === CONNECTION_STATUS.DETECTING ? 'animate-spin' : ''}`} />
          {badge.text}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="text"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="IP cảm biến (vd: 192.168.1.45) hoặc smartgarden.local"
          className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 text-sm"
        />
        <button
          type="submit"
          disabled={status === CONNECTION_STATUS.DETECTING}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${status === CONNECTION_STATUS.DETECTING ? 'animate-spin' : ''}`} />
          Dò tìm / Kết nối
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-3 mb-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {status === CONNECTION_STATUS.CONNECTED && deviceInfo && (
        <p className="text-xs text-gray-500 mb-4">
          Thiết bị: {deviceInfo.device} · IP: {deviceInfo.ip}
        </p>
      )}

      {readings && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <Droplet className="w-6 h-6 text-blue-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-gray-800">{readings.soil_percent}%</div>
            <div className="text-xs text-gray-500">Độ ẩm đất</div>
            {soilInfo && <div className="text-xs mt-1 font-medium text-gray-700">{soilInfo.label}</div>}
          </div>
          <div className="bg-orange-50 rounded-xl p-4 text-center">
            <Thermometer className="w-6 h-6 text-orange-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-gray-800">
              {readings.dht11_ok ? `${readings.temperature}°C` : '—'}
            </div>
            <div className="text-xs text-gray-500">Nhiệt độ (DHT11)</div>
          </div>
          <div className="bg-cyan-50 rounded-xl p-4 text-center">
            <Droplet className="w-6 h-6 text-cyan-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-gray-800">
              {readings.dht11_ok ? `${readings.humidity}%` : '—'}
            </div>
            <div className="text-xs text-gray-500">Độ ẩm không khí (DHT11)</div>
          </div>
        </div>
      )}

      {readings && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Power className={`w-5 h-5 ${readings.relay === 'on' ? 'text-green-600' : 'text-gray-400'}`} />
              <div>
                <div className="text-sm font-semibold text-gray-800">Bơm tưới nước</div>
                <div className="text-xs text-gray-500">
                  Trạng thái: {readings.relay === 'on' ? 'Đang bật' : 'Đang tắt'}
                  {readings.relay === 'on' && (readings.relay_auto_triggered ? ' (tự động)' : ' (thủ công)')}
                </div>
              </div>
            </div>
            <button
              onClick={handleManualToggle}
              disabled={relayLoading || status !== CONNECTION_STATUS.CONNECTED || readings.auto_enabled}
              title={readings.auto_enabled ? 'Đang ở chế độ tự động - tắt tự động để điều khiển tay' : ''}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${
                readings.relay === 'on'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {relayLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
              {readings.relay === 'on' ? 'Tắt bơm' : 'Bật bơm'}
            </button>
          </div>

          {readings.relay !== 'on' && !readings.auto_enabled && (
            <div className="mt-3 pt-3 border-t border-purple-200 flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="manualLimitMode"
                  checked={manualLimitMode === 'unlimited'}
                  onChange={() => setManualLimitMode('unlimited')}
                  className="accent-purple-600"
                />
                Không giới hạn thời gian
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="manualLimitMode"
                  checked={manualLimitMode === 'limited'}
                  onChange={() => setManualLimitMode('limited')}
                  className="accent-purple-600"
                />
                Giới hạn
                <input
                  type="number"
                  min="1"
                  value={manualDurationSec}
                  onChange={(e) => { setManualDurationSec(e.target.value); setManualLimitMode('limited'); }}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                giây
              </label>
            </div>
          )}

          {readings.relay === 'on' && !readings.relay_auto_triggered && (
            <p className="text-xs text-gray-500 mt-2">
              {readings.manual_duration_sec > 0
                ? `Sẽ tự động tắt sau ${readings.manual_duration_sec} giây kể từ lúc bật.`
                : 'Không giới hạn thời gian - nhớ tắt tay khi tưới xong.'}
              {' '}(giới hạn an toàn tối đa vẫn là 10 phút)
            </p>
          )}
        </div>
      )}

      {readings && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-teal-600" />
              Tưới tự động
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-gray-600">{autoForm.enabled ? 'Đang bật' : 'Đang tắt'}</span>
              <input
                type="checkbox"
                checked={autoForm.enabled}
                onChange={(e) => handleAutoFieldChange('enabled', e.target.checked)}
                className="w-4 h-4 accent-teal-600"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Bật tưới khi độ ẩm ≤ (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={autoForm.startPercent}
                onChange={(e) => handleAutoFieldChange('startPercent', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tắt tưới khi độ ẩm ≥ (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={autoForm.stopPercent}
                onChange={(e) => handleAutoFieldChange('stopPercent', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tưới tối đa (giây)</label>
              <input
                type="number"
                min="1"
                value={autoForm.durationSec}
                onChange={(e) => handleAutoFieldChange('durationSec', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {autoThresholdInvalid && (
            <p className="text-xs text-red-600 mb-2">
              Ngưỡng "bật tưới" phải nhỏ hơn ngưỡng "tắt tưới" (đất khô hơn thì mới bật, ẩm hơn thì mới tắt).
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleAutoSave}
              disabled={autoSaving || status !== CONNECTION_STATUS.CONNECTED || autoThresholdInvalid}
              className="flex items-center gap-2 px-4 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50 text-sm"
            >
              {autoSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Lưu cấu hình
            </button>
            {autoFormDirty && !autoSaving && (
              <span className="text-xs text-amber-600">Có thay đổi chưa lưu</span>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Khi bật, ESP32 tự bơm mỗi khi độ ẩm đất chạm ngưỡng dưới, và tự dừng khi đạt ngưỡng trên hoặc hết thời gian tối đa — kể cả khi bạn tắt trình duyệt này, vì logic chạy trên ESP32.
          </p>
        </div>
      )}

      {irrigationHint && (
        <div className={`border rounded-lg p-3 mb-4 text-sm font-medium ${LEVEL_COLOR[irrigationHint.level]}`}>
          {irrigationHint.label}
        </div>
      )}

      {comparison && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Đối chiếu DHT11 với OpenWeather</h3>
          <table className="w-full text-sm mb-2">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="pb-1"></th>
                <th className="pb-1">DHT11 (tại vườn)</th>
                <th className="pb-1">OpenWeather (khu vực)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1 text-gray-600">Nhiệt độ</td>
                <td className="py-1 font-medium">{comparison.sensorTemp}°C</td>
                <td className="py-1 font-medium">{comparison.owTemp}°C</td>
              </tr>
              <tr>
                <td className="py-1 text-gray-600">Độ ẩm</td>
                <td className="py-1 font-medium">{comparison.sensorHumidity}%</td>
                <td className="py-1 font-medium">{comparison.owHumidity}%</td>
              </tr>
            </tbody>
          </table>
          <ul className="text-xs text-gray-600 space-y-1">
            {comparison.notes.map((note, idx) => (
              <li key={idx}>• {note}</li>
            ))}
          </ul>
        </div>
      )}

      {!readings && status === CONNECTION_STATUS.IDLE && (
        <p className="text-sm text-gray-500">
          Nhập IP của ESP32 (xem trên Serial Monitor khi khởi động) rồi nhấn "Dò tìm / Kết nối". ESP32 phải cùng mạng WiFi với máy đang chạy web này.
        </p>
      )}
    </div>
  );
};

export default SensorPanel;
