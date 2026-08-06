import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { loginUser, registerUser, logoutUser, type User as AuthUser } from '../services/authService';

type SessionUser = Partial<AuthUser> & {
  email: string;
  username?: string | null;
  phone?: string | null;
  address?: string | null;
  role?: string | null;
  vipTier?: 'silver' | 'gold' | 'platinum' | null;
  quarterlySpending?: number | null;
  rewardPoints?: number | null;
  vipQuarterKey?: string | null;
  vipTierUpdatedAt?: string | null;
  token?: string | null;
};
const normalizeToken = (token?: string | null, fallback: string | null = null): string | null => {
  const cleanedToken = token?.trim();
  return cleanedToken ? cleanedToken : fallback;
};

const normalizeUser = (user: SessionUser, fallbackToken: string | null = null): Partial<AuthUser> & {
  email: string;
  username?: string | null;
  phone?: string | null;
  role?: string | null;
    address?: string | null;
  token?: string | null;
} => {
  const normalizedToken = normalizeToken(user.token, fallbackToken);

  return {
    ...user,
    name: user.name ?? user.username ?? null,
    username: user.username ?? user.name ?? null,
    address: user.address ?? null,
    role: user.role ?? null,
    vipTier: user.vipTier ?? null,
    quarterlySpending: Number(user.quarterlySpending ?? 0),
    rewardPoints: Number(user.rewardPoints ?? 0),
    vipQuarterKey: user.vipQuarterKey ?? null,
    vipTierUpdatedAt: user.vipTierUpdatedAt ?? null,
    token: normalizedToken,
  };
};

type AuthStore = {
  user: SessionUser | null;
  token: string | null;
  isAuthenticating: boolean;
  error: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setUser: (user: SessionUser) => void;
  clearUser: () => void;
  register: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

export const useUserStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticating: false,
      error: null,
      isAuthenticated: false,
      hasHydrated: false,

      setUser: (user) =>
        set((state) => {
          const nextUser = normalizeUser(user, state.token);
          const nextToken = normalizeToken(nextUser.token, state.token);

          return {
            user: nextUser,
            token: nextToken,
            isAuthenticated: true,
            isAuthenticating: false,
            error: null,
          };
        }),

      clearUser: () =>
        set({
          user: null,
          token: null,
          isAuthenticating: false,
          isAuthenticated: false,
          error: null,
        }),

      register: async (email, password, name) => {
        set({ isAuthenticating: true, error: null });

        try {
          const session = await registerUser({ email, password, name });
          set({
            user: normalizeUser(session.user, session.token),
            token: normalizeToken(session.token),
            isAuthenticating: false,
            isAuthenticated: true,
            error: null,
          });
        } catch (error) {
          set({
            isAuthenticating: false,
            error: error instanceof Error ? error.message : 'Đăng ký thất bại.',
          });
        }
      },

      login: async (email, password) => {
        set({ isAuthenticating: true, error: null });

        try {
          const session = await loginUser({ email, password });
          set({
            user: normalizeUser(session.user, session.token),
            token: normalizeToken(session.token),
            isAuthenticating: false,
            isAuthenticated: true,
            error: null,
          });
        } catch (error) {
          set({
            isAuthenticating: false,
            error: error instanceof Error ? error.message : 'Đăng nhập thất bại.',
          });
        }
      },

      logout: async () => {
        const token = get().token;
        set({ isAuthenticating: true, error: null });

        try {
          await logoutUser(token || undefined);
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticating: false,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      clearError: () => set({ error: null }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);