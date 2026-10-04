import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('chat context and ESP32 configuration contract', async (t) => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const originalFetch = globalThis.fetch;
  try {
    const { sendChatMessage } = await server.ssrLoadModule('/src/services/chatService.js');
    const { setAutoConfig } = await server.ssrLoadModule('/src/services/sensorService.js');
    const config = { enabled: true, startPercent: 35, stopPercent: 65, durationSec: 90 };
    const readings = { soil_percent: 22, dht11_ok: false, temperature: 999, humidity: 999, auto_enabled: false, auto_start_percent: 30, auto_stop_percent: 70, auto_duration_sec: 120, relay: 'off' };
    await t.test('empty, HTML, truncated and invalid responses produce readable errors', async () => {
      for (const [body, status, expected] of [
        ['', 500, /phản hồi rỗng \(HTTP 500\)/],
        ['  ', 200, /phản hồi rỗng/],
        ['<html>Not found</html>', 404, /không đúng định dạng JSON \(HTTP 404\)/],
        ['{"candidates":', 200, /không đúng định dạng JSON/],
        ['null', 200, /dữ liệu không hợp lệ/],
        ['{"error":{"message":"Quota exceeded"}}', 429, /Quota exceeded/],
        ['{"promptFeedback":{"blockReason":"SAFETY"}}', 200, /diễn đạt lại/],
        ['{"candidates":[{"finishReason":"MAX_TOKENS"}]}', 200, /bị cắt/],
      ]) {
        globalThis.fetch = async () => new Response(body, { status });
        await assert.rejects(() => sendChatMessage('Gợi ý tưới', { readings }), expected);
      }
      globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
      await assert.rejects(() => sendChatMessage('Gợi ý tưới', { readings }), /Không nhận được phản hồi từ máy chủ/);
      globalThis.fetch = async () => { throw new DOMException('Aborted', 'AbortError'); };
      await assert.rejects(() => sendChatMessage('Gợi ý tưới', { readings }), /Quá thời gian chờ/);
    });
    await t.test('includes plant, measured soil moisture and existing configuration; excludes failed DHT readings', async () => {
      let captured;
      globalThis.fetch = async (url, options) => {
        assert.equal(new URL(url, 'http://localhost').pathname, '/api/gemini/v1beta/models/gemini-2.5-flash:generateContent');
        captured = JSON.parse(options.body);
        return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: 'Gợi ý cho húng quế.', recommendation: config }) }] } }] });
      };
      const reply = await sendChatMessage('Gợi ý tưới', { readings, plantName: 'Húng quế', weather: null });
      const context = JSON.parse(captured.contents.at(-1).parts[0].text.split('\n')[1]);
      assert.equal(context.plantName, 'Húng quế');
      assert.equal(context.sensors.soilMoisturePercent, 22);
      assert.equal(context.sensors.temperatureC, null);
      assert.equal(context.sensors.airHumidityPercent, null);
      assert.equal(context.sensors.currentAutoConfig.startPercent, 30);
      assert.deepEqual(reply.recommendation, config);
      assert.equal((await sendChatMessage('Gợi ý tưới', { readings: null })).recommendation, null);
    });
    await t.test('sends exact validated values to the chosen host and requires matching confirmation', async () => {
      let url;
      globalThis.fetch = async (target) => {
        url = new URL(target);
        return Response.json({ auto_enabled: true, auto_start_percent: 35, auto_stop_percent: 65, auto_duration_sec: 90 });
      };
      await setAutoConfig('192.0.2.32', config);
      assert.equal(url.hostname, '192.0.2.32');
      assert.equal(url.pathname, '/auto');
      assert.equal(url.searchParams.get('start'), '35');
      assert.equal(url.searchParams.get('stop'), '65');
      assert.equal(url.searchParams.get('duration'), '90');
      assert.equal(url.searchParams.get('enabled'), '1');
      globalThis.fetch = async () => Response.json({ auto_enabled: true, auto_start_percent: 30 });
      await assert.rejects(() => setAutoConfig('192.0.2.32', config), /chưa xác nhận/);
      globalThis.fetch = async () => Response.json({ error: 'failed' }, { status: 500 });
      await assert.rejects(() => setAutoConfig('192.0.2.32', config), /HTTP 500/);
    });
    await t.test('invalid configuration cannot reach the network', async () => {
      let calls = 0;
      globalThis.fetch = async () => { calls += 1; return Response.json({}); };
      await assert.rejects(() => setAutoConfig('192.0.2.32', { ...config, durationSec: 0 }));
      assert.equal(calls, 0);
    });
  } finally { globalThis.fetch = originalFetch; await server.close(); }
});
