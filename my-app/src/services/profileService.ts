import { BASE_URL } from './api';
import { useUserStore } from '@/store/userStore';

// =======================
// 👤 UPDATE PROFILE
// =======================
export async function updateUserProfile(data: {
  email: string;
  username: string;
  address: string;
  phone: string;
}) {
  // Lấy token fresh từ store
  const { token, user } = useUserStore.getState();
  const authToken = token ?? user?.token ?? null;

  const res = await fetch(`${BASE_URL}/auth/update-profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`, // ← thêm token
    },
    body: JSON.stringify(data),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Cập nhật thất bại');
  return json;
}

// =======================
// 📲 SEND OTP
// =======================
export async function sendOtp(phone: string) {
  const res = await fetch(`${BASE_URL}/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message);
  return json;
}

// =======================
// 🔐 VERIFY OTP
// =======================
export async function verifyOtp(phone: string, otp: string) {
  const res = await fetch(`${BASE_URL}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message);
  return json;
}

// =======================
// 📥 GET USER
// =======================
export async function getUserByEmail(email: string) {
  const res = await fetch(`${BASE_URL}/user/${email}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message);
  return json;
}