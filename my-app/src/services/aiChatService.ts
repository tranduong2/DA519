import { BASE_URL } from './api';

export type AiMessage = { role: 'user' | 'assistant'; content: string };

export async function askAi(message: string, history: AiMessage[]): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 50_000);
  try {
    const response = await fetch(`${BASE_URL}/api/ai-chat`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Không thể kết nối chatbot.');
    if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('Chatbot không trả về nội dung.');
    return data.reply.trim();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Chatbot phản hồi quá lâu. Vui lòng thử lại.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
