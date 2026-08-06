import { create } from "zustand";

type CartItem = {
  id: string;
  name: string;
  price: number;
  image: any;
  qty: number;
};

type CartState = {
  items: CartItem[];
  addToCart: (product: any, qty: number) => void;
  increaseQty: (id: string) => void;
  decreaseQty: (id: string) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addToCart: (product, qty) =>
    set((state) => {
      const exist = state.items.find((i) => i.id === product.id);

      // Lấy price từ nhiều field, ưu tiên số nguyên
      const rawPrice =
        product.priceNumber ??
        product.price ??
        product.salePrice ??
        0;

      // Nếu là string có dạng "15.000đ" thì clean về số
      const price = typeof rawPrice === "number"
        ? rawPrice
        : Number(String(rawPrice).replace(/[^0-9]/g, ""));

      if (exist) {
        return {
          items: state.items.map((i) =>
            i.id === product.id ? { ...i, qty: i.qty + qty } : i
          ),
        };
      }

      return {
        items: [
          ...state.items,
          {
            id: product.id,
            name: product.name,
            price: isNaN(price) ? 0 : price,
            image: product.image,
            qty,
          },
        ],
      };
    }),

  increaseQty: (id) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, qty: i.qty + 1 } : i
      ),
    })),

  decreaseQty: (id) =>
    set((state) => ({
      items: state.items
        .map((i) => (i.id === id ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0),
    })),

  clearCart: () => set({ items: [] }),

  getTotalPrice: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + item.price * item.qty, 0);
  },

  getTotalItems: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + item.qty, 0);
  },
}));