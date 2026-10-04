const request = async (target, action, { method = 'GET', body, command } = {}) => {
  const params = new URLSearchParams({ id: target.deviceId, action });
  if (command) params.set('command', command);
  let response;
  try {
    response = await fetch(`/api/device?${params}`, {
      method, headers: { Authorization: `Bearer ${target.token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000),
    });
  } catch { throw new Error('Không kết nối được cloud. Hãy kiểm tra Internet và thử lại.'); }
  let data;
  try { data = await response.json(); }
  catch { throw new Error('Cloud trả về dữ liệu không hợp lệ. Hãy kiểm tra cấu hình Vercel.'); }
  if (!response.ok) throw new Error(data?.error?.message || `Cloud phản hồi HTTP ${response.status}`);
  return data;
};

export const cloudStatus = (target) => request(target, 'status');
export const cloudReadings = (target) => request(target, 'sensors');

export async function cloudCommand(target, body, { sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), now = Date.now } = {}) {
  const queued = await request(target, 'command', { method: 'POST', body });
  const deadline = now() + 45000;
  while (now() < deadline) {
    await sleep(1500);
    const result = await request(target, 'result', { command: queued.id });
    if (result.status === 'confirmed') {
      if (!result.readings) throw new Error('ESP32 chưa trả về trạng thái xác nhận.');
      return result.readings;
    }
    if (result.status !== 'pending') throw new Error(result.error || 'ESP32 từ chối hoặc chưa thực hiện lệnh.');
  }
  throw new Error('Chưa nhận được xác nhận từ ESP32. Hãy kiểm tra trạng thái hiện tại trước khi gửi lại lệnh.');
}
