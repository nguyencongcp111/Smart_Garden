import { timingSafeEqual, randomUUID, createHash } from 'node:crypto';
import { createCloudStore } from './cloudStore.js';
import { normalizeAutoConfig } from '../src/utils/irrigationConfig.js';

export const fail = (status, message) => Object.assign(new Error(message), { status });
export function sendJson(res, status, data) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = status;
  res.end(JSON.stringify(data));
}
export async function readBody(req) {
  if (req.body !== undefined) {
    let body;
    try { body = typeof req.body === 'string' || Buffer.isBuffer(req.body) ? JSON.parse(String(req.body)) : req.body; }
    catch { throw fail(400, 'Nội dung JSON không hợp lệ.'); }
    if (Buffer.byteLength(JSON.stringify(body)) > 32000) throw fail(413, 'Dữ liệu gửi quá lớn.');
    return body;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 32000) throw fail(413, 'Dữ liệu gửi quá lớn.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw fail(400, 'Nội dung JSON không hợp lệ.'); }
}
export async function redisCommand(command, env = process.env, fetcher = fetch) {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) throw fail(503, 'Chưa cấu hình kho dữ liệu cloud trên máy chủ.');
  const response = await fetcher(env.UPSTASH_REDIS_REST_URL, {
    method: 'POST', headers: { Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command), signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw fail(502, 'Chưa kết nối được kho dữ liệu cloud.');
  const data = await response.json();
  if (data.error) throw fail(502, 'Kho dữ liệu cloud từ chối yêu cầu.');
  return data.result;
}
export function authorize(req, id, role, env = process.env) {
  let devices;
  try { devices = JSON.parse(env.GARDEN_DEVICES_JSON || '{}'); }
  catch { throw fail(503, 'Cấu hình thiết bị trên máy chủ không hợp lệ.'); }
  const expected = devices[id]?.[role];
  const incoming = String(req.headers.authorization || '').replace(/^Bearer /, '');
  if (typeof expected !== 'string' || expected.length < 32 || Buffer.byteLength(incoming) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(incoming), Buffer.from(expected))) {
    throw fail(401, 'ID hoặc mã truy cập thiết bị không đúng.');
  }
}
export function validateSync(body) {
  if (!body || !/^[a-zA-Z0-9_-]{8,64}$/.test(body.boot_id || '')) throw fail(400, 'Thiếu mã phiên khởi động ESP32.');
  const r = body.readings;
  if (!r || !Number.isFinite(r.soil_percent) || r.soil_percent < 0 || r.soil_percent > 100 || !Number.isInteger(r.soil_raw) || r.soil_raw < 0 || r.soil_raw > 4095 || !['on', 'off'].includes(r.relay) || typeof r.dht11_ok !== 'boolean' || typeof r.relay_auto_triggered !== 'boolean') throw fail(400, 'Dữ liệu cảm biến không hợp lệ.');
  if (r.dht11_ok && (!Number.isFinite(r.temperature) || !Number.isFinite(r.humidity) || r.humidity < 0 || r.humidity > 100)) throw fail(400, 'Dữ liệu DHT11 không hợp lệ.');
  try { normalizeAutoConfig({ enabled: r.auto_enabled, startPercent: r.auto_start_percent, stopPercent: r.auto_stop_percent, durationSec: r.auto_duration_sec }); }
  catch { throw fail(400, 'Cấu hình tưới ESP32 không hợp lệ.'); }
  if (body.ack && (!/^[a-f0-9-]{36}$/.test(body.ack.id || '') || typeof body.ack.ok !== 'boolean' || (body.ack.error && typeof body.ack.error !== 'string'))) throw fail(400, 'Xác nhận lệnh không hợp lệ.');
  if (body.ack?.ok) {
    const a = body.ack.result;
    if (!a || !['on', 'off'].includes(a.relay)) throw fail(400, 'Thiếu trạng thái đã áp dụng lệnh.');
    try { normalizeAutoConfig({ enabled: a.auto_enabled, startPercent: a.auto_start_percent, stopPercent: a.auto_stop_percent, durationSec: a.auto_duration_sec }); }
    catch { throw fail(400, 'Trạng thái xác nhận không hợp lệ.'); }
  }
  return body;
}
export function validateCommand(body) {
  if (body?.type === 'auto') {
    try { return { type: 'auto', config: normalizeAutoConfig(body.config) }; }
    catch (e) { throw fail(400, e.message); }
  }
  if (body?.type === 'relay' && typeof body.on === 'boolean' && (!body.on || (Number.isInteger(body.durationSec) && body.durationSec >= 1 && body.durationSec <= 600))) {
    return { type: 'relay', on: body.on, durationSec: body.on ? body.durationSec : 0 };
  }
  throw fail(400, 'Lệnh tưới không hợp lệ.');
}
export function createDeviceHandler({ env = process.env, store = createCloudStore((command) => redisCommand(command, env)) } = {}) {
  return async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const id = url.searchParams.get('id') || '';
      const action = url.searchParams.get('action');
      if (!/^[a-zA-Z0-9_-]{3,64}$/.test(id)) throw fail(400, 'ID thiết bị phải có 3–64 ký tự, gồm chữ, số, dấu - hoặc _.');
      const method = action === 'sync' || action === 'command' ? 'POST' : 'GET';
      if (req.method !== method) { res.setHeader('Allow', method); throw fail(405, 'Phương thức không hợp lệ.'); }
      authorize(req, id, action === 'sync' ? 'deviceToken' : 'webToken', env);
      let result;
      if (action === 'sync') result = await store.sync(id, validateSync(await readBody(req)));
      else if (action === 'status') { const { readings, ...info } = await store.status(id); result = info; }
      else if (action === 'sensors') result = (await store.status(id)).readings;
      else if (action === 'command') result = await store.enqueue(id, { ...validateCommand(await readBody(req)), id: randomUUID() });
      else if (action === 'result') result = await store.result(id, url.searchParams.get('command'));
      else throw fail(404, 'Đường dẫn thiết bị không hợp lệ.');
      sendJson(res, action === 'command' ? 202 : 200, result);
    } catch (error) { sendJson(res, error.status || 502, { error: { message: error.status ? error.message : 'Kết nối cloud bị lỗi. Vui lòng thử lại.' } }); }
  };
}
export async function rateLimit(req, scope, limit, env = process.env) {
  const address = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local').split(',')[0].trim();
  const hash = createHash('sha256').update(address).digest('hex').slice(0, 24);
  const key = `smartgarden:rate:${scope}:${hash}:${Math.floor(Date.now() / 60000)}`;
  const count = await redisCommand(['EVAL', "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],120) end; return n", '1', key], env);
  if (count > limit) throw fail(429, 'Bạn gửi quá nhiều yêu cầu. Hãy thử lại sau một phút.');
}
