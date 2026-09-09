import { BASE_URL } from './api';

export type ChatMessage = {
  id: number; sender_id: number; sender_name: string; body: string; has_image: boolean;
  recalled: boolean; created_at: string; reply_id: number | null; reply_body: string | null;
  reply_image: boolean; reactions: { userId: number; emoji: string }[];
};
export type ChatRoom = { id: string; name: string; memberId: number | null; memberIds: number[]; ownerId: number | null; unread: number; last: Pick<ChatMessage, 'id' | 'body' | 'has_image' | 'recalled' | 'created_at' | 'sender_id'> | null };
export type ChatPage = { messages: ChatMessage[]; hasMore: boolean; reads: { reader_id: number; last_id: number }[] };
export async function chatApi<T>(token: string, path: string, method = 'GET', body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${BASE_URL}/admin/chat${path}`, {
      method, signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(response.status === 404 && (path === '/rooms' || path === '/groups' || path === '/members') ? 'Máy chủ chưa cập nhật chức năng chat. Vui lòng chờ triển khai backend hoàn tất rồi thử lại.' : data.message || 'Không thể kết nối chat.');
    return data;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw new Error('Kết nối quá lâu. Vui lòng thử lại.');
    throw e;
  } finally { clearTimeout(timeout); }
}
export const roomPath = (id: string) => `/rooms/${encodeURIComponent(id)}`;
