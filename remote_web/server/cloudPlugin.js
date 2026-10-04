import { createDeviceHandler, fail } from './cloudApi.js';
import { createExternalHandler } from './externalApi.js';

export function cloudApiPlugin(env) {
  const install = (server) => {
    // Vite dev/preview can keep using existing API keys before Redis is set up.
    // Production Vercel handlers always use the persistent Redis limiter.
    const localBuckets = new Map();
    const localLimiter = async (req, scope, limit) => {
      const time = Date.now();
      for (const [key, entry] of localBuckets) if (entry.until <= time) localBuckets.delete(key);
      const key = `${scope}:${req.socket?.remoteAddress || 'local'}`;
      const entry = localBuckets.get(key) || { count: 0, until: time + 60000 };
      if (++entry.count > limit) throw fail(429, 'Bạn gửi quá nhiều yêu cầu. Hãy thử lại sau một phút.');
      localBuckets.set(key, entry);
    };
    const localOptions = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN ? {} : { limiter: localLimiter };
    const device = createDeviceHandler({ env });
    const weather = createExternalHandler('weather', { env, ...localOptions });
    const gemini = createExternalHandler('gemini', { env, ...localOptions });
    server.middlewares.use((req, res, next) => {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (path === '/api/device') return void device(req, res);
      if (path === '/api/weather') return void weather(req, res);
      if (path === '/api/gemini' || path.startsWith('/api/gemini/')) return void gemini(req, res);
      next();
    });
  };
  return { name: 'smart-garden-cloud', configureServer: install, configurePreviewServer: install };
}
