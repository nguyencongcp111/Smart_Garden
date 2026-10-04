import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAutoConfig, parseChatReply, validateAutoConfig } from '../src/utils/irrigationConfig.js';

const valid = { enabled: true, startPercent: 35, stopPercent: 65, durationSec: 90 };
test('accepts valid device ranges and converts form values', () => {
  assert.deepEqual(normalizeAutoConfig({ ...valid, startPercent: '35', durationSec: '90' }), valid);
  assert.equal(validateAutoConfig({ ...valid, startPercent: 0, stopPercent: 100, durationSec: 600 }), null);
});
test('rejects empty, non-finite, fractional, reversed and out-of-range inputs', () => {
  for (const update of [{ startPercent: '' }, { startPercent: ' ' }, { startPercent: null }, { startPercent: true }, { startPercent: [] }, { startPercent: -1 }, { startPercent: 65 }, { stopPercent: 101 }, { stopPercent: 20 }, { durationSec: 0 }, { durationSec: 601 }, { durationSec: 1.5 }, { durationSec: Infinity }, { durationSec: 'NaN' }, { enabled: 'true' }]) {
    assert.throws(() => normalizeAutoConfig({ ...valid, ...update }), undefined, JSON.stringify(update));
  }
});
test('only valid structured AI recommendations get actionable controls', () => {
  const text = JSON.stringify({ reply: 'Gợi ý theo cảm biến.', recommendation: valid });
  assert.deepEqual(parseChatReply(text, true).recommendation, valid);
  assert.deepEqual(parseChatReply('```json\n' + text + '\n```', true).recommendation, valid);
  assert.equal(parseChatReply(text, false).recommendation, null);
  assert.equal(parseChatReply(JSON.stringify({ reply: 'Kiểm tra.', recommendation: { ...valid, startPercent: 99 } }), true).recommendation, null);
  assert.equal(parseChatReply(JSON.stringify({ reply: 'Hỏi đáp.', recommendation: null }), true).recommendation, null);
  assert.throws(() => parseChatReply('Không phải JSON', true));
  assert.throws(() => parseChatReply('{"recommendation":null}', true));
});
