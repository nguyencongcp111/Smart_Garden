import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const id = process.argv[2] || 'garden-01';
if (!/^[a-zA-Z0-9_-]{3,64}$/.test(id)) throw new Error('ID không hợp lệ');
const devices = { [id]: { deviceToken: randomBytes(32).toString('hex'), webToken: randomBytes(32).toString('hex') } };
writeFileSync('cloud-credentials.json', JSON.stringify(devices, null, 2), { flag: 'wx', mode: 0o600 });
console.log('Đã tạo cloud-credentials.json. Tệp này được bỏ qua bởi Git. Sao chép JSON vào GARDEN_DEVICES_JSON; dùng deviceToken cho ESP32 và webToken trên website.');
