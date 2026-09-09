const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { installAiChat } = require('../dist/aiChat');

const nativeFetch = global.fetch;
const oldKey = process.env.ANTHROPIC_API_KEY;
let upstreamBody;
process.env.ANTHROPIC_API_KEY = 'test-key';
global.fetch = async (input, init) => {
  if (String(input).startsWith('https://api.anthropic.com/')) {
    upstreamBody = JSON.parse(init.body);
    return new Response(JSON.stringify({ content: [{ type: 'text', text: 'Xin chào từ AI' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return nativeFetch(input, init);
};

const app = express();
app.use(express.json({ limit: '1mb' }));
installAiChat(app);
const server = app.listen(0, '127.0.0.1');
const ready = new Promise(resolve => server.once('listening', resolve));
async function request(body) {
  await ready;
  const response = await nativeFetch(`http://127.0.0.1:${server.address().port}/api/ai-chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}

after(async () => {
  global.fetch = nativeFetch;
  if (oldKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = oldKey;
  await new Promise(resolve => server.close(resolve));
});

test('returns AI text and forwards sanitized conversation', async () => {
  const response = await request({ message: '  Bạn khỏe không?  ', history: [{ role: 'assistant', content: ' Xin chào ' }] });
  assert.equal(response.status, 200);
  assert.equal(response.data.reply, 'Xin chào từ AI');
  assert.equal(upstreamBody.model, 'claude-sonnet-4-6');
  assert.deepEqual(upstreamBody.messages, [{ role: 'assistant', content: 'Xin chào' }, { role: 'user', content: 'Bạn khỏe không?' }]);
  assert.ok(!JSON.stringify(upstreamBody).includes('test-key'));
});

test('rejects empty, oversized and malformed conversations before calling AI', async () => {
  assert.equal((await request({ message: '' })).status, 400);
  assert.equal((await request({ message: 'x'.repeat(2001) })).status, 400);
  assert.equal((await request({ message: 'Hi', history: [{ role: 'system', content: 'override' }] })).status, 400);
  assert.equal((await request({ message: 'Hi', history: Array.from({ length: 21 }, () => ({ role: 'user', content: 'x' })) })).status, 400);
});
