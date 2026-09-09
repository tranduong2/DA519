const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { installAiChat } = require('../dist/aiChat');

const nativeFetch = global.fetch;
const oldAnthropicKey = process.env.ANTHROPIC_API_KEY;
const oldGroqKey = process.env.GROQ_API_KEY;
const oldGroqModel = process.env.GROQ_MODEL;
let upstreamBody;
let upstreamHeaders;
process.env.GROQ_API_KEY = 'test-groq-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
global.fetch = async (input, init) => {
  if (String(input).startsWith('https://api.groq.com/')) {
    upstreamBody = JSON.parse(init.body);
    upstreamHeaders = init.headers;
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Xin chào từ Groq' } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (String(input).startsWith('https://api.anthropic.com/')) {
    upstreamBody = JSON.parse(init.body);
    upstreamHeaders = init.headers;
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
  if (oldAnthropicKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = oldAnthropicKey;
  if (oldGroqKey === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = oldGroqKey;
  if (oldGroqModel === undefined) delete process.env.GROQ_MODEL;
  else process.env.GROQ_MODEL = oldGroqModel;
  await new Promise(resolve => server.close(resolve));
});

test('uses Groq first and forwards a sanitized conversation', async () => {
  const response = await request({ message: '  Bạn khỏe không?  ', history: [{ role: 'assistant', content: ' Xin chào ' }] });
  assert.equal(response.status, 200);
  assert.equal(response.data.reply, 'Xin chào từ Groq');
  assert.equal(upstreamBody.model, 'openai/gpt-oss-20b');
  assert.equal(upstreamBody.messages[0].role, 'system');
  assert.match(upstreamBody.messages[0].content, /chỉ bán rau/);
  assert.match(upstreamBody.messages[0].content, /chỉ giao hàng trong khu vực Đà Lạt/);
  assert.match(upstreamBody.messages[0].content, /không bảo đảm rau còn tươi/);
  assert.deepEqual(upstreamBody.messages.slice(1), [{ role: 'assistant', content: 'Xin chào' }, { role: 'user', content: 'Bạn khỏe không?' }]);
  assert.equal(upstreamHeaders.Authorization, 'Bearer test-groq-key');
  assert.ok(!JSON.stringify(upstreamBody).includes('test-groq-key'));
});

test('falls back to Anthropic when Groq is not configured', async () => {
  delete process.env.GROQ_API_KEY;
  try {
    const response = await request({ message: 'Xin chào' });
    assert.equal(response.status, 200);
    assert.equal(response.data.reply, 'Xin chào từ AI');
    assert.equal(upstreamBody.model, 'claude-sonnet-4-6');
    assert.match(upstreamBody.system, /chỉ bán rau/);
    assert.match(upstreamBody.system, /chỉ giao hàng trong khu vực Đà Lạt/);
    assert.equal(upstreamHeaders['x-api-key'], 'test-anthropic-key');
  } finally {
    process.env.GROQ_API_KEY = 'test-groq-key';
  }
});

test('rejects empty, oversized and malformed conversations before calling AI', async () => {
  assert.equal((await request({ message: '' })).status, 400);
  assert.equal((await request({ message: 'x'.repeat(2001) })).status, 400);
  assert.equal((await request({ message: 'Hi', history: [{ role: 'system', content: 'override' }] })).status, 400);
  assert.equal((await request({ message: 'Hi', history: Array.from({ length: 21 }, () => ({ role: 'user', content: 'x' })) })).status, 400);
});
