import express, { Request, Response, NextFunction } from 'express';

type RateEntry = { count: number; resetAt: number };
type ChatMessage = { role: 'user' | 'assistant'; content: string };

const requests = new Map<string, RateEntry>();

function aiRateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const current = requests.get(key);
  if (!current || current.resetAt <= now) {
    requests.set(key, { count: 1, resetAt: now + 60_000 });
    return next();
  }
  current.count += 1;
  if (current.count > 12) return res.status(429).json({ message: 'Bạn gửi quá nhanh. Vui lòng chờ một phút rồi thử lại.' });
  next();
}

function normalizeHistory(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length > 20) return null;
  const result: ChatMessage[] = [];
  for (const item of value) {
    if (!item || (item.role !== 'user' && item.role !== 'assistant') || typeof item.content !== 'string') return null;
    const content = item.content.trim();
    if (!content || content.length > 2_000) return null;
    result.push({ role: item.role, content });
  }
  return result;
}

export function installAiChat(app: express.Express) {
  app.post('/api/ai-chat', aiRateLimit, async (req, res) => {
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) return res.status(503).json({ message: 'Chatbot AI chưa được cấu hình trên máy chủ.' });

    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const history = normalizeHistory(req.body?.history ?? []);
    if (!message || message.length > 2_000 || history === null) {
      return res.status(400).json({ message: 'Câu hỏi hoặc lịch sử trò chuyện không hợp lệ.' });
    }
    const messages = [...history, { role: 'user' as const, content: message }];
    if (messages.reduce((total, item) => total + item.content.length, 0) > 12_000) {
      return res.status(400).json({ message: 'Cuộc trò chuyện quá dài. Vui lòng bắt đầu cuộc trò chuyện mới.' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-6',
          max_tokens: 1_000,
          system: 'Bạn là trợ lý AI tổng quát, hữu ích và thân thiện trên website FreshVeggies. Trả lời bằng ngôn ngữ người dùng. Không bịa thông tin; nói rõ khi không chắc chắn.',
          messages,
        }),
      });
      const data: any = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error('Anthropic API error:', response.status, data?.error?.type || 'unknown');
        return res.status(response.status === 429 ? 429 : 502).json({ message: response.status === 429 ? 'Chatbot đang bận. Vui lòng thử lại sau.' : 'Không thể nhận phản hồi từ chatbot.' });
      }
      const reply = Array.isArray(data.content)
        ? data.content.filter((part: any) => part?.type === 'text' && typeof part.text === 'string').map((part: any) => part.text).join('\n').trim()
        : '';
      if (!reply) return res.status(502).json({ message: 'Chatbot không trả về nội dung.' });
      res.json({ reply });
    } catch (error) {
      console.error('AI chat request:', error instanceof Error ? error.name : 'unknown');
      res.status(502).json({ message: error instanceof Error && error.name === 'AbortError' ? 'Chatbot phản hồi quá lâu. Vui lòng thử lại.' : 'Không thể kết nối chatbot.' });
    } finally {
      clearTimeout(timeout);
    }
  });
}
