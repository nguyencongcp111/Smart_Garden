// Shared by the manual form and AI response parser; never send unchecked values to ESP32.
export function validateAutoConfig(config) {
  if (!config || typeof config.enabled !== 'boolean') return 'Cấu hình cần có trạng thái bật/tắt hợp lệ.';
  const values = [config.startPercent, config.stopPercent, config.durationSec];
  if (values.some((value) => value === '' || value == null || !['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim()) || !Number.isInteger(Number(value)))) return 'Vui lòng nhập đầy đủ các giá trị bằng số nguyên.';
  const [start, stop, duration] = values.map(Number);
  if (start < 0 || stop > 100 || start >= stop) return 'Ngưỡng độ ẩm phải từ 0–100%, và ngưỡng bật phải nhỏ hơn ngưỡng tắt.';
  if (duration < 1 || duration > 600) return 'Thời gian tưới phải từ 1–600 giây.';
  return null;
}

export function normalizeAutoConfig(config) {
  const error = validateAutoConfig(config);
  if (error) throw new Error(error);
  return { enabled: config.enabled, startPercent: Number(config.startPercent), stopPercent: Number(config.stopPercent), durationSec: Number(config.durationSec) };
}

export function parseChatReply(text, hasSensorData) {
  let data;
  try { data = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); }
  catch { throw new Error('Trợ lý trả về dữ liệu chưa đúng định dạng. Vui lòng thử lại.'); }
  if (!data || typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('Trợ lý chưa trả về lời giải thích. Vui lòng thử lại.');
  if (!data.recommendation) return { content: data.reply, recommendation: null };
  if (!hasSensorData) return { content: `${data.reply}\n\nHãy kết nối ESP32 để có dữ liệu cảm biến trước khi đề xuất cấu hình.`, recommendation: null };
  try {
    return { content: data.reply, recommendation: normalizeAutoConfig(data.recommendation) };
  } catch {
    return { content: `${data.reply}\n\nCác thông số gợi ý chưa hợp lệ nên chưa thể áp dụng. Hãy yêu cầu trợ lý gợi ý lại.`, recommendation: null };
  }
}
