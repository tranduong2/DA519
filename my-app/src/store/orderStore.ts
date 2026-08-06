import { create } from 'zustand';
import { Order } from '@/types';

interface OrderStoreState {
  orders: Order[];
  selectedOrder: Order | null;
  loading: boolean;
  error: string | null;
  setOrders: (orders: Order[]) => void;
  setSelectedOrder: (order: Order | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  clearOrders: () => void;
}

export const useOrderStore = create<OrderStoreState>((set) => ({
  orders: [],
  selectedOrder: null,
  loading: false,
  error: null,

  setOrders: (orders) => set({ orders }),
  setSelectedOrder: (order) => set({ selectedOrder: order }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  updateOrderStatus: (orderId, status) =>
    set((state) => ({
      orders: state.orders.map((order) =>
        order.id === orderId ? { ...order, status } : order
      ),
      selectedOrder:
        state.selectedOrder?.id === orderId
          ? { ...state.selectedOrder, status }
          : state.selectedOrder,
    })),

  clearOrders: () => set({ orders: [], selectedOrder: null, error: null }),
}));