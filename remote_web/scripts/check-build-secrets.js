import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv } from 'vite';
const files = (path) => readdirSync(path, { withFileTypes: true }).flatMap((item) => item.isDirectory() ? files(join(path, item.name)) : [join(path, item.name)]);
const env = { ...loadEnv('production', process.cwd(), ''), ...process.env };
const secrets = Object.entries(env).filter(([name, value]) => /API_KEY|REST_TOKEN|DEVICES_JSON/.test(name) && value?.length >= 12).map(([, value]) => value);
try {
  const devices = JSON.parse(readFileSync('cloud-credentials.json', 'utf8'));
  for (const device of Object.values(devices)) secrets.push(device.deviceToken, device.webToken);
} catch (e) { if (e.code !== 'ENOENT') throw e; }
const leaked = files('dist').some((file) => secrets.some((secret) => secret && readFileSync(file, 'utf8').includes(secret)));
if (leaked) throw new Error('Phát hiện khóa bí mật trong bản build. Không triển khai bản này.');
console.log('Build secret check passed: vendor keys and device tokens are absent from dist.');
