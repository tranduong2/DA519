
// EXPO_PUBLIC_API_URL is supplied by the deployment environment. The fallback
// keeps the local mobile development workflow working until a production URL is set.
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://da519.onrender.com";

// ─── Products ───────────────────────────────────────────
export const getProducts = async () => {
  const res = await fetch(`${BASE_URL}/products`);
  if (!res.ok) throw new Error("Lỗi khi tải danh sách sản phẩm");
  return res.json();
};

export const getProductById = async (id: string) => {
  const res = await fetch(`${BASE_URL}/products/${id}`);
  if (!res.ok) throw new Error("Không tìm thấy sản phẩm");
  return res.json();
};

export const getProductsByCategory = async (cat: string) => {
  const res = await fetch(`${BASE_URL}/products/cat/${cat}`);
  if (!res.ok) throw new Error("Lỗi khi tải danh mục");
  return res.json();
};

// ─── Cart / Orders ───────────────────────────────────────
export const placeOrder = async (token: string, items: { productId: string; quantity: number }[]) => {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error("Đặt hàng thất bại");
  return res.json();
};

export const getOrders = async (token: string) => {
  const res = await fetch(`${BASE_URL}/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Lỗi khi tải đơn hàng");
  return res.json();
};

export const getFlashSaleProducts = async () => {
  const res = await fetch(`${BASE_URL}/products/flashsale`);
  if (!res.ok) throw new Error("Lỗi tải flash sale");
  return res.json();
};

// ─── Bulk Order ──────────────────────────────────────────
export type BulkOrderItem = {
  productId: string | number;
  productName: string;
  kg: number;
  pricePerKg: number;
  subtotal: number;
  note: string;
};

export const createBulkOrder = async (
  token: string,
  payload: {
    orderCode: string;
    orderDate: string;
    items: BulkOrderItem[];
    totalPrice: number;
  }
) => {
  const res = await fetch(`${BASE_URL}/bulk-orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Gửi đơn hàng thất bại");
  return res.json();
};

// ─── Profile ─────────────────────────────────────────────
export const updateUserProfile = async (
  token: string,
  payload: { email: string; username: string; phone: string; address: string }
) => {
  const res = await fetch(`${BASE_URL}/auth/update-profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  // ✅ parse json trước để lấy message lỗi từ server
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Cập nhật thông tin thất bại");
  return data;
};

export const changePassword = async (
  token: string,
  payload: { currentPassword: string; newPassword: string }
) => {
  const res = await fetch(`${BASE_URL}/auth/change-password`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Đổi mật khẩu thất bại");
  return data;
};
