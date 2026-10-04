import { useState, useEffect, useRef, useCallback } from 'react';
import { detectSensor, fetchSensorReadings, setRelayState, setAutoConfig } from '../services/sensorService';
import { SENSOR_CONFIG } from '../constants/constants';
import { normalizeAutoConfig } from '../utils/irrigationConfig';

export const CONNECTION_STATUS = { IDLE: 'idle', DETECTING: 'detecting', CONNECTED: 'connected', ERROR: 'error' };

export const useSensor = () => {
  const [connectionMode, setConnectionMode] = useState(import.meta.env.DEV ? 'local' : 'cloud');
  const [accessToken, setAccessToken] = useState('');
  const activeTarget = useRef(null);
  const [host, setHost] = useState('');
  const [activeHost, setActiveHost] = useState('');
  const [sessionId, setSessionId] = useState(0);
  const [status, setStatus] = useState(CONNECTION_STATUS.IDLE);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [readings, setReadings] = useState(null);
  const [error, setError] = useState(null);
  const [relayLoading, setRelayLoading] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [configVersion, setConfigVersion] = useState(0);
  const pollRef = useRef(null);
  const generation = useRef(0);
  const mutation = useRef(false);
  const revision = useRef(0);
  const stopPolling = useCallback(() => clearTimeout(pollRef.current), []);

  useEffect(() => () => { generation.current += 1; stopPolling(); }, [stopPolling]);

  const startPolling = useCallback((target, epoch) => {
    stopPolling();
    const poll = async () => {
      const currentRevision = revision.current;
      try {
        const data = await fetchSensorReadings(target);
        if (generation.current !== epoch || currentRevision !== revision.current) return;
        if (!mutation.current && currentRevision === revision.current) setReadings(data);
      } catch (err) {
        if (generation.current !== epoch || currentRevision !== revision.current) return;
        setStatus(CONNECTION_STATUS.ERROR);
        setError(err.message);
        return;
      }
      if (generation.current === epoch && !mutation.current) pollRef.current = setTimeout(poll, SENSOR_CONFIG.POLL_INTERVAL_MS);
    };
    pollRef.current = setTimeout(poll, SENSOR_CONFIG.POLL_INTERVAL_MS);
  }, [stopPolling]);

  const detect = useCallback(async (targetHost = host) => {
    if (mutation.current) return;
    const address = targetHost.trim();
    if (!address) { setError(connectionMode === 'cloud' ? 'Vui lòng nhập ID thiết bị.' : 'Vui lòng nhập IP của ESP32.'); return; }
    if (connectionMode === 'cloud' && (!/^[a-zA-Z0-9_-]{3,64}$/.test(address) || accessToken.trim().length < 32)) { setError('Hãy nhập ID hợp lệ và mã truy cập web từ cấu hình cloud.'); return; }
    const target = connectionMode === 'cloud' ? { deviceId: address, token: accessToken.trim() } : address;
    activeTarget.current = null;
    const epoch = ++generation.current;
    setSessionId(epoch);
    stopPolling();
    setReadings(null);
    setDeviceInfo(null);
    setActiveHost('');
    setStatus(CONNECTION_STATUS.DETECTING);
    setError(null);
    try {
      const info = await detectSensor(target);
      const data = await fetchSensorReadings(target);
      if (generation.current !== epoch) return;
      setDeviceInfo(info);
      setReadings(data);
      setActiveHost(address);
      activeTarget.current = target;
      setStatus(CONNECTION_STATUS.CONNECTED);
      startPolling(target, epoch);
    } catch (err) {
      if (generation.current !== epoch) return;
      setStatus(CONNECTION_STATUS.ERROR);
      setError(err.message);
    }
  }, [host, connectionMode, accessToken, startPolling, stopPolling]);

  const updateAutoConfig = useCallback(async (config) => {
    if (!activeHost || status !== CONNECTION_STATUS.CONNECTED) throw new Error('Hãy kết nối lại ESP32 trước khi lưu cấu hình.');
    if (mutation.current) throw new Error('Đang gửi lệnh tới ESP32, vui lòng chờ.');
    const validated = normalizeAutoConfig(config);
    const epoch = generation.current;
    mutation.current = true;
    revision.current += 1;
    stopPolling();
    setAutoSaving(true);
    setError(null);
    try {
      const result = await setAutoConfig(activeTarget.current, validated);
      if (epoch !== generation.current) throw new Error('Kết nối đã thay đổi. Hãy kiểm tra lại cấu hình trên thiết bị.');
      setReadings((prev) => prev ? { ...prev, ...result } : prev);
      setConfigVersion((value) => value + 1);
      return result;
    } catch (err) {
      if (epoch === generation.current) setError(err.message);
      throw err;
    } finally {
      mutation.current = false;
      setAutoSaving(false);
      if (epoch === generation.current) startPolling(activeTarget.current, epoch);
    }
  }, [activeHost, status, startPolling, stopPolling]);

  const toggleRelay = useCallback(async (turnOn, durationSec) => {
    if (!activeHost || status !== CONNECTION_STATUS.CONNECTED || mutation.current) return;
    const epoch = generation.current;
    mutation.current = true;
    revision.current += 1;
    stopPolling();
    setRelayLoading(true);
    setError(null);
    try {
      const result = await setRelayState(activeTarget.current, turnOn, durationSec);
      if (epoch === generation.current) setReadings((prev) => prev ? { ...prev, relay: result.relay, relay_auto_triggered: false, manual_duration_sec: result.manual_duration_sec ?? 0 } : prev);
    } catch (err) {
      if (epoch === generation.current) setError(err.message);
    } finally {
      mutation.current = false;
      setRelayLoading(false);
      if (epoch === generation.current) startPolling(activeTarget.current, epoch);
    }
  }, [activeHost, status, startPolling, stopPolling]);

  const disconnect = () => {
    if (mutation.current) return;
    setSessionId(++generation.current);
    stopPolling();
    setHost('');
    setAccessToken('');
    activeTarget.current = null;
    setActiveHost('');
    setStatus(CONNECTION_STATUS.IDLE);
    setDeviceInfo(null);
    setReadings(null);
    setError(null);
  };

  const changeConnectionMode = (mode) => {
    if (mutation.current || status === CONNECTION_STATUS.DETECTING) return;
    disconnect();
    setConnectionMode(mode);
  };
  return { connectionMode, changeConnectionMode, accessToken, setAccessToken, host, setHost, activeHost, sessionId, status, deviceInfo, readings, error, detect, disconnect, relayLoading, toggleRelay, autoSaving, updateAutoConfig, configVersion };
};
