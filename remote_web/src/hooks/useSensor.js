// src/hooks/useSensor.js

import { useState, useEffect, useRef, useCallback } from 'react';
import { detectSensor, fetchSensorReadings, setRelayState, setAutoConfig } from '../services/sensorService';
import { loadSensorConfig, saveSensorConfig } from '../services/storageService';
import { SENSOR_CONFIG } from '../constants/constants';

// Trạng thái kết nối hiển thị cho người dùng
export const CONNECTION_STATUS = {
  IDLE: 'idle',
  DETECTING: 'detecting',
  CONNECTED: 'connected',
  ERROR: 'error',
};

export const useSensor = () => {
  const [host, setHost] = useState('');
  const [status, setStatus] = useState(CONNECTION_STATUS.IDLE);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [readings, setReadings] = useState(null);
  const [error, setError] = useState(null);
  const [relayLoading, setRelayLoading] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const pollRef = useRef(null);

  // Nạp IP đã lưu lần trước và tự động thử kết nối
  useEffect(() => {
    (async () => {
      const saved = await loadSensorConfig();
      if (saved?.host) {
        setHost(saved.host);
        detect(saved.host, { silent: true });
      }
    })();
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = useCallback((activeHost) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const data = await fetchSensorReadings(activeHost);
        setReadings(data);
      } catch (err) {
        // Mất kết nối giữa chừng - không spam lỗi, chỉ đánh dấu lại trạng thái
        setStatus(CONNECTION_STATUS.ERROR);
        setError(err.message);
        stopPolling();
      }
    }, SENSOR_CONFIG.POLL_INTERVAL_MS);
  }, []);

  const detect = useCallback(async (targetHost, options = {}) => {
    const hostToUse = (targetHost ?? host).trim();
    if (!hostToUse) {
      setError('Vui lòng nhập địa chỉ IP hoặc hostname của cảm biến');
      setStatus(CONNECTION_STATUS.ERROR);
      return;
    }

    setStatus(CONNECTION_STATUS.DETECTING);
    setError(null);

    try {
      const info = await detectSensor(hostToUse);
      setDeviceInfo(info);
      setStatus(CONNECTION_STATUS.CONNECTED);

      const initialReadings = await fetchSensorReadings(hostToUse);
      setReadings(initialReadings);

      await saveSensorConfig({ host: hostToUse });
      startPolling(hostToUse);
    } catch (err) {
      setStatus(CONNECTION_STATUS.ERROR);
      setError(err.message);
      setDeviceInfo(null);
      if (!options.silent) {
        setReadings(null);
      }
    }
  }, [host, startPolling]);

  const toggleRelay = useCallback(async (turnOn, durationSec) => {
    if (!host || status !== CONNECTION_STATUS.CONNECTED) return;
    setRelayLoading(true);
    setError(null);
    try {
      const result = await setRelayState(host, turnOn, durationSec);
      setReadings((prev) => (prev ? {
        ...prev,
        relay: result.relay,
        relay_auto_triggered: false,
        manual_duration_sec: result.manual_duration_sec ?? 0,
      } : prev));
    } catch (err) {
      setError(err.message);
    } finally {
      setRelayLoading(false);
    }
  }, [host, status]);

  const updateAutoConfig = useCallback(async (config) => {
    if (!host || status !== CONNECTION_STATUS.CONNECTED) return;
    setAutoSaving(true);
    setError(null);
    try {
      const result = await setAutoConfig(host, config);
      setReadings((prev) => (prev ? {
        ...prev,
        auto_enabled: result.auto_enabled,
        auto_start_percent: result.auto_start_percent,
        auto_stop_percent: result.auto_stop_percent,
        auto_duration_sec: result.auto_duration_sec,
      } : prev));
    } catch (err) {
      setError(err.message);
    } finally {
      setAutoSaving(false);
    }
  }, [host, status]);

  const disconnect = () => {
    stopPolling();
    setStatus(CONNECTION_STATUS.IDLE);
    setDeviceInfo(null);
    setReadings(null);
    setError(null);
  };

  return {
    host,
    setHost,
    status,
    deviceInfo,
    readings,
    error,
    detect,
    disconnect,
    relayLoading,
    toggleRelay,
    autoSaving,
    updateAutoConfig,
  };
};
