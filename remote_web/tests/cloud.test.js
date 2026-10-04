import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createCloudStore, COMMAND_MS, ONLINE_MS } from '../server/cloudStore.js';
import { createDeviceHandler, validateSync, authorize } from '../server/cloudApi.js';
import { createExternalHandler } from '../server/externalApi.js';

const deviceToken = 'd'.repeat(64);
const webToken = 'w'.repeat(64);
const env = { GARDEN_DEVICES_JSON: JSON.stringify({ 'garden-01': { deviceToken, webToken } }), GEMINI_API_KEY: 'private-gemini', WEATHER_API_KEY: 'private-weather' };
const readings = { soil_raw: 2300, soil_percent: 38, dht11_ok: false, relay: 'off', relay_auto_triggered: false, auto_enabled: false, auto_start_percent: 30, auto_stop_percent: 70, auto_duration_sec: 120 };
const config = { enabled: true, startPercent: 35, stopPercent: 65, durationSec: 90 };
const applied = { ...readings, auto_enabled: true, auto_start_percent: 35, auto_stop_percent: 65, auto_duration_sec: 90 };
function fixture() {
  let time = 100000;
  const values = new Map();
  const redis = async ([command, ...args]) => {
    if (command === 'GET') return values.get(args[0]) || null;
    assert.equal(command, 'EVAL');
    const [, , key, expected, value] = args;
    if ((values.get(key) || '') !== expected) return 0;
    values.set(key, value);
    return 1;
  };
  return { store: createCloudStore(redis, { now: () => time }), advance: (ms) => { time += ms; } };
}
async function call(handler, { method = 'GET', url = '/api/device?id=garden-01&action=status', token = webToken, body } = {}) {
  let data;
  const headers = {};
  const res = { statusCode: 200, setHeader: (k, v) => { headers[k.toLowerCase()] = v; }, end: (text) => { data = JSON.parse(text); } };
  await handler({ method, url, headers: { authorization: `Bearer ${token}` }, body }, res);
  return { status: res.statusCode, data, headers };
}

test('cloud mailbox preserves the device contract and rejects stale or competing commands', async (t) => {
  const { store, advance } = fixture();
  await assert.rejects(() => store.status('garden-01'), /chưa online/);
  await store.sync('garden-01', { boot_id: 'boot0001', readings });
  assert.equal((await store.status('garden-01')).device_id, 'garden-01');
  await t.test('commands remain pending until the device confirms exact values', async () => {
    const id = '11111111-1111-1111-1111-111111111111';
    await store.enqueue('garden-01', { id, type: 'auto', config });
    assert.equal((await store.result('garden-01', id)).status, 'pending');
    await assert.rejects(() => store.enqueue('garden-01', { id: 'another', type: 'relay', on: true }), /lệnh chờ/);
    const sync = await store.sync('garden-01', { boot_id: 'boot0001', readings, ack: { id: 'wrong', ok: true, result: applied } });
    assert.equal(sync.command.id, id);
    await store.sync('garden-01', { boot_id: 'boot0001', readings: applied, ack: { id, ok: true, result: applied } });
    assert.equal((await store.result('garden-01', id)).status, 'confirmed');
    assert.equal((await store.sync('garden-01', { boot_id: 'boot0001', readings: applied })).command, null);
  });
  await t.test('expired commands cannot be executed after reconnecting', async () => {
    await store.enqueue('garden-01', { id: 'expired', type: 'auto', config });
    advance(COMMAND_MS + 1);
    assert.equal((await store.sync('garden-01', { boot_id: 'boot0001', readings })).command, null);
    assert.equal((await store.result('garden-01', 'expired')).status, 'expired');
  });
  await t.test('reboot cancels a command created for an earlier boot', async () => {
    await store.enqueue('garden-01', { id: 'reboot', type: 'auto', config });
    assert.equal((await store.sync('garden-01', { boot_id: 'boot0002', readings })).command, null);
    assert.equal((await store.result('garden-01', 'reboot')).status, 'rejected');
  });
  await t.test('concurrent browser commands cannot overwrite one another', async () => {
    const results = await Promise.allSettled(['a', 'b'].map((id) => store.enqueue('garden-01', { id, type: 'auto', config })));
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    advance(COMMAND_MS + 1);
    await store.sync('garden-01', { boot_id: 'boot0002', readings });
  });
  await t.test('wrong confirmation is rejected and old sensor data is offline', async () => {
    await store.enqueue('garden-01', { id: 'wrong-values', type: 'auto', config });
    await store.sync('garden-01', { boot_id: 'boot0002', readings, ack: { id: 'wrong-values', ok: true, result: readings } });
    assert.equal((await store.result('garden-01', 'wrong-values')).status, 'rejected');
    advance(ONLINE_MS + 1);
    await assert.rejects(() => store.status('garden-01'), /mất Internet/);
    await assert.rejects(() => store.enqueue('garden-01', { id: 'offline', type: 'auto', config }), /offline/);
  });
});

test('cloud API authenticates both roles and validates writes before changing persistent state', async () => {
  const { store } = fixture();
  const handler = createDeviceHandler({ env, store });
  assert.equal((await call(handler, { method: 'POST', url: '/api/device?id=garden-01&action=sync', body: { boot_id: 'boot0001', readings } })).status, 401);
  assert.equal((await call(handler, { method: 'POST', url: '/api/device?id=garden-01&action=sync', token: deviceToken, body: { boot_id: 'boot0001', readings } })).status, 200);
  assert.equal((await call(handler, { token: deviceToken })).status, 401);
  const status = await call(handler);
  assert.equal(status.status, 200);
  assert.equal(status.headers['cache-control'], 'no-store');
  assert.equal((await call(handler, { method: 'POST', url: '/api/device?id=garden-01&action=command', body: { type: 'relay', on: true, durationSec: 601 } })).status, 400);
  assert.equal((await call(handler, { method: 'POST', url: '/api/device?id=garden-01&action=command', body: '{' })).status, 400);
  const queued = await call(handler, { method: 'POST', url: '/api/device?id=garden-01&action=command', body: { type: 'auto', config } });
  assert.equal(queued.status, 202);
  assert.equal((await call(handler, { url: `/api/device?id=garden-01&action=result&command=${queued.data.id}` })).data.status, 'pending');
  assert.throws(() => validateSync({ boot_id: 'boot0001', readings: { ...readings, soil_percent: 101 } }), /cảm biến/);
  assert.throws(() => validateSync({ boot_id: 'boot0001', readings, ack: { id: queued.data.id, ok: true } }), /Thiếu trạng thái/);
  assert.throws(() => authorize({ headers: { authorization: `Bearer ${'é'.repeat(64)}` } }, 'garden-01', 'webToken', env), /không đúng/);
});

test('Vercel cloud APIs keep vendor keys on the server and handle malformed upstream responses', async () => {
  let observed;
  let reply = Response.json({ candidates: [] });
  const fetcher = async (url, options) => { observed = { url: String(url), options }; return reply; };
  const limiter = async () => {};
  const gemini = createExternalHandler('gemini', { env, fetcher, limiter });
  const request = { method: 'POST', url: '/api/gemini?model=gemini-2.5-flash:generateContent&key=ignored', body: { contents: [{ parts: [{ text: 'hello' }] }] } };
  assert.equal((await call(gemini, request)).status, 200);
  assert.equal(observed.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
  assert.equal(observed.options.headers['x-goog-api-key'], env.GEMINI_API_KEY);
  reply = new Response('');
  const empty = await call(gemini, request);
  assert.equal(empty.status, 502);
  assert.match(empty.data.error.message, /rỗng/);
  reply = new Response('<html>Error</html>');
  assert.equal((await call(gemini, request)).status, 502);
  assert.equal((await call(gemini, { ...request, url: '/api/gemini?model=evil' })).status, 404);
  const weather = createExternalHandler('weather', { env, fetcher, limiter });
  reply = Response.json({ cod: 200 });
  assert.equal((await call(weather, { url: '/api/weather?endpoint=weather&q=Hanoi' })).status, 200);
  assert.equal(new URL(observed.url).searchParams.get('appid'), env.WEATHER_API_KEY);
  assert.equal((await call(weather, { url: '/api/weather?endpoint=other&q=Hanoi' })).status, 400);
  const limited = createExternalHandler('gemini', { env, fetcher, limiter: async () => { throw Object.assign(new Error('rate'), { status: 429 }); } });
  assert.equal((await call(limited, request)).status, 429);
});

test('browser waits for cloud acknowledgement, preserves configuration checks, and propagates errors', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const original = globalThis.fetch;
  try {
    const { cloudCommand } = await server.ssrLoadModule('/src/services/cloudDeviceService.js');
    const { setAutoConfig } = await server.ssrLoadModule('/src/services/sensorService.js');
    const target = { deviceId: 'garden-01', token: webToken };
    let calls = 0;
    let time = 0;
    globalThis.fetch = async (url, options) => {
      assert.equal(options.headers.Authorization, `Bearer ${webToken}`);
      assert.equal(new URL(url, 'https://garden.test').searchParams.get('id'), 'garden-01');
      calls++;
      return Response.json(calls === 1 ? { id: 'id' } : calls === 2 ? { status: 'pending' } : { status: 'confirmed', readings: applied });
    };
    const result = await cloudCommand(target, { type: 'auto', config }, { now: () => time, sleep: async (ms) => { time += ms; } });
    assert.equal(calls, 3);
    assert.deepEqual(result, applied);
    globalThis.fetch = async () => Response.json({ status: 'expired', error: 'Lệnh hết hạn' });
    await assert.rejects(() => cloudCommand(target, {}, { now: () => time, sleep: async (ms) => { time += ms; } }), /hết hạn/);
    calls = 0;
    globalThis.fetch = async () => { calls++; return Response.json({}); };
    await assert.rejects(() => setAutoConfig(target, { ...config, durationSec: 0 }));
    assert.equal(calls, 0);
  } finally { globalThis.fetch = original; await server.close(); }
});
