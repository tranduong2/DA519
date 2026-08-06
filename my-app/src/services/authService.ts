import { BASE_URL } from './api';

// authService.ts - tìm và sửa
export type User = {
  id: number;
  email: string;
  name?: string | null;      // thêm | null
  username?: string | null;  // thêm | null
  phone?: string | null;     // thêm | null
  role?: string | null;      // thêm | null
  token?: string | null;     // thêm | null
  vipTier?: 'silver' | 'gold' | 'platinum' | null;
  quarterlySpending?: number | null;
  rewardPoints?: number | null;
  vipQuarterKey?: string | null;
  vipTierUpdatedAt?: string | null;
};
export type AuthSession = {
  token: string;
  user: User;
};

export type RegisterUserInput = {
  name: string;
  email: string;
  password: string;
  phone?: string;
};

export type LoginUserInput = {
  email: string;
  password: string;
};

async function parseAuthResponse(response: Response, fallbackMessage: string): Promise<AuthSession> {
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.message || fallbackMessage);
  }

  if (!payload?.token || !payload?.user) {
    throw new Error('Phản hồi đăng nhập không hợp lệ.');
  }

  return payload as AuthSession;
}

export async function registerUser(data: RegisterUserInput): Promise<AuthSession> {
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  return parseAuthResponse(response, 'Không thể đăng ký.');
}

export async function loginUser(data: LoginUserInput): Promise<AuthSession> {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  return parseAuthResponse(response, 'Không thể đăng nhập.');
}

export async function logoutUser(token?: string) {
  await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}
