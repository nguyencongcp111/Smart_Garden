// Persistent, atomic device mailbox. No state is stored in a function instance.
export const ONLINE_MS = 45000;
export const COMMAND_MS = 35000;
const CAS = "local v=redis.call('GET',KEYS[1]); if (v or '')~=ARGV[1] then return 0 end; redis.call('SET',KEYS[1],ARGV[2],'EX',ARGV[3]); return 1";

export function createCloudStore(redis, { now = Date.now } = {}) {
  const key = (id) => `smartgarden:device:${id}`;
  const read = async (id) => {
    const raw = await redis(['GET', key(id)]);
    return raw ? JSON.parse(raw) : null;
  };
  const update = async (id, transition) => {
    for (let attempt = 0; attempt < 8; attempt++) {
      const raw = await redis(['GET', key(id)]);
      const state = raw ? JSON.parse(raw) : {};
      const result = transition(state, now());
      const saved = await redis(['EVAL', CAS, '1', key(id), raw || '', JSON.stringify(state), '86400']);
      if (saved === 1) return result;
    }
    throw Object.assign(new Error('Thiết bị đang bận. Hãy thử lại.'), { status: 409 });
  };
  const expire = (state, time) => {
    if (state.pending && state.pending.expiresAt <= time) {
      state.result = { id: state.pending.id, status: 'expired', error: 'Lệnh hết hạn; ESP32 chưa xác nhận thực hiện.' };
      delete state.pending;
    }
  };
  return {
    async status(id) {
      const state = await read(id);
      if (!state?.readings || now() - state.lastSeen > ONLINE_MS) {
        throw Object.assign(new Error('ESP32 chưa online hoặc đã mất Internet. Hãy kiểm tra nguồn, Wi-Fi và cấu hình cloud.'), { status: 503 });
      }
      return { device: 'smart-garden-esp32', device_id: id, status: 'online', last_seen: state.lastSeen, readings: state.readings };
    },
    sync(id, body) {
      return update(id, (state, time) => {
        expire(state, time);
        if (state.pending && state.pending.bootId !== body.boot_id) {
          state.result = { id: state.pending.id, status: 'rejected', error: 'ESP32 đã khởi động lại. Hãy gửi lệnh mới.' };
          delete state.pending;
        }
        if (body.ack && state.pending?.id === body.ack.id) {
          const a = body.ack.result;
          const c = state.pending;
          const matches = body.ack.ok && (c.type === 'relay' ? a?.relay === (c.on ? 'on' : 'off') : a?.auto_enabled === c.config.enabled && a?.auto_start_percent === c.config.startPercent && a?.auto_stop_percent === c.config.stopPercent && a?.auto_duration_sec === c.config.durationSec);
          state.result = { id: body.ack.id, status: matches ? 'confirmed' : 'rejected', readings: { ...body.readings, ...(a || {}) }, error: matches ? null : (body.ack.error || 'ESP32 chưa xác nhận đúng thông số yêu cầu.') };
          delete state.pending;
        }
        state.bootId = body.boot_id;
        state.readings = body.readings;
        state.lastSeen = time;
        return { server_time: time, command: state.pending ? { ...state.pending, remaining_ms: state.pending.expiresAt - time } : null };
      });
    },
    enqueue(id, command) {
      return update(id, (state, time) => {
        expire(state, time);
        if (!state.readings || time - state.lastSeen > ONLINE_MS) throw Object.assign(new Error('ESP32 đang offline, chưa thể gửi lệnh.'), { status: 503 });
        if (state.pending) throw Object.assign(new Error('ESP32 đang có lệnh chờ xác nhận. Hãy chờ rồi thử lại.'), { status: 409 });
        state.pending = { ...command, bootId: state.bootId, expiresAt: time + COMMAND_MS };
        return { id: command.id, status: 'pending' };
      });
    },
    result(id, commandId) {
      return update(id, (state, time) => {
        expire(state, time);
        if (state.result?.id === commandId) return state.result;
        if (state.pending?.id === commandId) return { id: commandId, status: 'pending' };
        throw Object.assign(new Error('Không tìm thấy lệnh. Hãy kiểm tra trạng thái hiện tại của ESP32.'), { status: 404 });
      });
    },
  };
}
