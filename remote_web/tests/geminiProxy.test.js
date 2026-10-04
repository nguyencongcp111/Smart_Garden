import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createServer as createViteServer } from 'vite';
import { createGeminiMiddleware, geminiProxyPlugin } from '../server/geminiProxy.js';

async function listen(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}`;
}

test('Gemini proxy forwards the correct path and returns JSON on failures', async (t) => {
  let scenario = 'success';
  let observed;
  let upstreamCalls = 0;
  const mockGemini = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    observed.body = JSON.parse(Buffer.concat(chunks).toString());
    if (scenario === 'network') return req.socket.destroy();
    if (scenario === 'timeout') return;
    if (scenario === 'empty') { res.writeHead(500); res.end(); return; }
    res.writeHead(scenario === 'quota' ? 429 : 200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(scenario === 'quota' ? { error: { message: 'Quota exceeded' } } : { candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: 'Hello', recommendation: null }) }] } }] }));
  });
  const upstreamOrigin = await listen(mockGemini);
  const middleware = createGeminiMiddleware({
    timeoutMs: 200,
    request(url, options, callback) {
      upstreamCalls += 1;
      observed = { url: url.href, options };
      return http.request(new URL(url.pathname + url.search, upstreamOrigin), options, callback);
    },
  });
  const app = http.createServer((req, res) => middleware(req, res, () => { res.writeHead(404); res.end('Unrelated route'); }));
  const origin = await listen(app);
  const request = () => fetch(`${origin}/api/gemini/v1beta/models/gemini-2.5-flash:generateContent?key=test-key`, { method: 'POST', body: JSON.stringify({ contents: [{ parts: [{ text: 'hello' }] }] }) });
  try {
    await t.test('forwards exactly one v1beta, the body, and upstream success', async () => {
      const reply = await request();
      assert.equal(reply.status, 200);
      assert.equal(JSON.parse((await reply.json()).candidates[0].content.parts[0].text).reply, 'Hello');
      assert.equal(observed.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=test-key');
      assert.equal(observed.body.contents[0].parts[0].text, 'hello');
      assert.equal(observed.options.method, 'POST');
    });
    await t.test('the real chatService URL passes through the middleware end to end', async () => {
      const vite = await createViteServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
      const nativeFetch = globalThis.fetch;
      try {
        const { sendChatMessage } = await vite.ssrLoadModule('/src/services/chatService.js');
        globalThis.fetch = (url, options) => nativeFetch(new URL(url, origin), options);
        const result = await sendChatMessage('Xin chào', { readings: null, plantName: '', weather: null });
        assert.equal(result.content, 'Hello');
        assert.equal(result.recommendation, null);
        assert.equal(new URL(observed.url).pathname, '/v1beta/models/gemini-2.5-flash:generateContent');
      } finally {
        globalThis.fetch = nativeFetch;
        await vite.close();
      }
    });
    await t.test('preserves upstream API errors', async () => {
      scenario = 'quota';
      const reply = await request();
      assert.equal(reply.status, 429);
      assert.equal((await reply.json()).error.message, 'Quota exceeded');
    });
    for (const [mode, status, message] of [['empty', 502, /phản hồi rỗng/], ['network', 502, /Không kết nối/], ['timeout', 504, /Quá thời gian/]]) {
      await t.test(`handles ${mode} with JSON instead of an empty response`, async () => {
        scenario = mode;
        const reply = await request();
        assert.equal(reply.status, status);
        assert.match((await reply.json()).error.message, message);
      });
    }
    await t.test('rejects repeated versions and wrong methods before contacting Gemini', async () => {
      const before = upstreamCalls;
      const wrongPath = await fetch(`${origin}/api/gemini/v1beta/v1beta/models/gemini-2.5-flash:generateContent`, { method: 'POST' });
      assert.equal(wrongPath.status, 404);
      assert.match((await wrongPath.json()).error.message, /Đường dẫn/);
      const wrongMethod = await fetch(`${origin}/api/gemini/v1beta/models/gemini-2.5-flash:generateContent`);
      assert.equal(wrongMethod.status, 405);
      assert.equal(wrongMethod.headers.get('allow'), 'POST');
      assert.equal(upstreamCalls, before);
    });
    await t.test('leaves app routes untouched and supports both dev and preview', async () => {
      assert.equal(await (await fetch(`${origin}/other`)).text(), 'Unrelated route');
      let installed = 0;
      const server = { middlewares: { use(handler) { assert.equal(typeof handler, 'function'); installed += 1; } } };
      const plugin = geminiProxyPlugin();
      assert.equal(plugin.configureServer(server), undefined);
      assert.equal(plugin.configurePreviewServer(server), undefined);
      assert.equal(installed, 2);
    });
  } finally {
    app.closeAllConnections();
    mockGemini.closeAllConnections();
    await Promise.all([new Promise((resolve) => app.close(resolve)), new Promise((resolve) => mockGemini.close(resolve))]);
  }
});
