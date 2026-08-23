import { BASE_URL } from './api';
import { Order } from '@/types';

// ─── Get User Orders ────────────────────────────────────────────
export const getOrders = async (token: string): Promise<Order[]> => {
  try {
    if (!token) {
      throw new Error('Token không tồn tại');
    }

    console.log('🔍 Fetching orders from:', `${BASE_URL}/orders`);
    const res = await fetch(`${BASE_URL}/orders`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('📊 Response status:', res.status);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    console.log('✅ Orders fetched:', data.orders?.length || 0);
    return data.orders || [];
  } catch (error: any) {
    console.error('❌ Error fetching orders:', error);
    throw new Error(error.message || 'Không thể tải đơn hàng');
  }
};

// ─── Get Order by ID ────────────────────────────────────────────
export const getOrderById = async (token: string, orderId: string): Promise<Order> => {
  try {
    const res = await fetch(`${BASE_URL}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error('Không tìm thấy đơn hàng');
    const data = await res.json();
    return data.order || data;
  } catch (error: any) {
    console.error('Error fetching order:', error);
    throw new Error(error.message || 'Không thể tải thông tin đơn hàng');
  }
};

// ─── Cancel Order ──────────────────────────────────────────────
export const cancelOrder = async (token: string, orderId: string): Promise<Order> => {
  try {
    const res = await fetch(`${BASE_URL}/orders/${orderId}/cancel`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error('Không thể hủy đơn hàng');
    const data = await res.json();
    return data.order || data;
  } catch (error: any) {
    console.error('Error cancelling order:', error);
    throw new Error(error.message || 'Lỗi khi hủy đơn hàng');
  }
};

// ─── Get Order History (Recent Orders) ──────────────────────────
export const getOrderHistory = async (
  token: string,
  status?: string,
  limit: number = 20
): Promise<Order[]> => {
  try {
    const url = new URL(`${BASE_URL}/orders`);
    if (status) url.searchParams.append('status', status);
    url.searchParams.append('limit', limit.toString());

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error('Lỗi khi tải lịch sử đơn hàng');
    const data = await res.json();
    return data.orders || [];
  } catch (error: any) {
    console.error('Error fetching order history:', error);
    throw new Error(error.message || 'Không thể tải lịch sử đơn hàng');
  }
};
