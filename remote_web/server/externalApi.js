import { fail, readBody, sendJson, rateLimit } from './cloudApi.js';

export function createExternalHandler(service, { env = process.env, fetcher = fetch, limiter = rateLimit } = {}) {
  return async (req, res) => {
    try {
      const incoming = new URL(req.url, 'http://localhost');
      const expectedMethod = service === 'gemini' ? 'POST' : 'GET';
      if (req.method !== expectedMethod) { res.setHeader('Allow', expectedMethod); throw fail(405, 'Phương thức API không hợp lệ.'); }
      let target, options;
      if (service === 'gemini') {
        const model = incoming.searchParams.get('model') || incoming.pathname.split('/').at(-1);
        if (model !== `${env.GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent`) throw fail(404, 'Đường dẫn Gemini không hợp lệ. Vui lòng tải lại trang.');
        if (!env.GEMINI_API_KEY) throw fail(503, 'Chưa cấu hình GEMINI_API_KEY trên máy chủ.');
        const body = await readBody(req);
        if (!Array.isArray(body?.contents) || !body.contents.length || body.contents.length > 30) throw fail(400, 'Nội dung chatbot không hợp lệ hoặc lịch sử quá dài.');
        target = `https://generativelanguage.googleapis.com/v1beta/models/${model}`;
        options = { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY }, body: JSON.stringify(body), signal: AbortSignal.timeout(40000) };
      } else {
        const endpoint = incoming.searchParams.get('endpoint');
        const city = incoming.searchParams.get('q')?.trim();
        if (!['weather', 'forecast'].includes(endpoint) || !city || city.length > 100) throw fail(400, 'Hãy nhập khu vực hợp lệ.');
        if (!env.WEATHER_API_KEY) throw fail(503, 'Chưa cấu hình WEATHER_API_KEY trên máy chủ.');
        target = new URL(`https://api.openweathermap.org/data/2.5/${endpoint}`);
        target.search = new URLSearchParams({ q: city, appid: env.WEATHER_API_KEY, units: 'metric', lang: 'vi' }).toString();
        options = { signal: AbortSignal.timeout(10000) };
      }
      await limiter(req, service, service === 'gemini' ? 10 : 30, env);
      const reply = await fetcher(target, options);
      const text = await reply.text();
      let data;
      try { data = JSON.parse(text); }
      catch { throw fail(502, text.trim() ? 'Dịch vụ trả về dữ liệu không đúng định dạng JSON.' : 'Dịch vụ trả về phản hồi rỗng. Vui lòng thử lại.'); }
      if (!data || typeof data !== 'object') throw fail(502, 'Dịch vụ trả về dữ liệu không hợp lệ.');
      sendJson(res, reply.status, data);
    } catch (error) {
      sendJson(res, error.status || (error.name === 'TimeoutError' ? 504 : 502), { error: { message: error.status ? error.message : 'Không nhận được phản hồi từ dịch vụ cloud. Vui lòng thử lại.' } });
    }
  };
}
