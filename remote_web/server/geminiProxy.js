import https from 'node:https';

// A narrow Gemini route avoids Vite 4's legacy http-proxy / util._extend.
// Keep the API version in the incoming path, never in the target origin.
export function createGeminiMiddleware({ request = https.request, timeoutMs = 40000 } = {}) {
  return (req, res, next) => {
    const incoming = new URL(req.url, 'http://localhost');
    if (!incoming.pathname.startsWith('/api/gemini/')) return next();

    const sendError = (status, message) => {
      if (res.destroyed || res.writableEnded) return;
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: { message } }));
    };
    if (!/^\/api\/gemini\/v1beta\/models\/[a-zA-Z0-9._-]+:generateContent$/.test(incoming.pathname)) {
      sendError(404, 'Đường dẫn Gemini không hợp lệ. Vui lòng tải lại trang.');
      return;
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      sendError(405, 'Gemini chỉ nhận yêu cầu POST.');
      return;
    }

    const target = new URL(incoming.pathname.replace(/^\/api\/gemini/, ''), 'https://generativelanguage.googleapis.com');
    // Forward only the credential, not arbitrary incoming query parameters or headers.
    if (incoming.searchParams.has('key')) target.searchParams.set('key', incoming.searchParams.get('key'));
    let timer;
    const upstream = request(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    }, (reply) => {
      const chunks = [];
      let size = 0;
      reply.on('data', (chunk) => {
        size += chunk.length;
        if (size > 4 * 1024 * 1024) {
          sendError(502, 'Phản hồi từ Gemini quá lớn. Hãy thử một câu hỏi ngắn hơn.');
          upstream.destroy();
          return;
        }
        chunks.push(chunk);
      });
      reply.on('error', () => sendError(502, 'Kết nối Gemini bị gián đoạn khi nhận phản hồi. Vui lòng thử lại.'));
      reply.on('end', () => {
        clearTimeout(timer);
        if (res.destroyed || res.writableEnded) return;
        const body = Buffer.concat(chunks);
        if (!body.length) {
          sendError(502, `Gemini trả về phản hồi rỗng (HTTP ${reply.statusCode}). Vui lòng thử lại.`);
          return;
        }
        res.writeHead(reply.statusCode || 502, { 'Content-Type': reply.headers['content-type'] || 'application/json; charset=utf-8' });
        res.end(body);
      });
    });
    upstream.on('error', () => {
      clearTimeout(timer);
      sendError(502, 'Không kết nối được tới Gemini. Hãy kiểm tra kết nối mạng và thử lại.');
    });
    timer = setTimeout(() => {
      sendError(504, 'Quá thời gian chờ Gemini phản hồi. Vui lòng thử lại.');
      upstream.destroy();
    }, timeoutMs);
    // Cancel upstream work if the browser aborts or disconnects.
    res.on('close', () => { clearTimeout(timer); upstream.destroy(); });
    req.on('error', () => upstream.destroy());
    req.pipe(upstream);
  };
}

export function geminiProxyPlugin() {
  const configure = (server) => server.middlewares.use(createGeminiMiddleware());
  return {
    name: 'smart-garden-gemini',
    configureServer(server) { configure(server); },
    configurePreviewServer(server) { configure(server); },
  };
}
