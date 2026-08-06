import { create } from 'zustand';
import type { VipStatus, VipTierConfig } from '@/types';
import { getVipStatus, getVipTiers } from '@/services/vipService';

type VipState = {
  tiers: VipTierConfig[];
  status: VipStatus | null;
  nextResetAt: string | null;
  loading: boolean;
  error: string | null;
  loadVipData: (token: string) => Promise<void>;
  refreshVipStatus: (token: string) => Promise<void>;
  clearVip: () => void;
};

export const useVipStore = create<VipState>((set) => ({
  tiers: [],
  status: null,
  nextResetAt: null,
  loading: false,
  error: null,

  loadVipData: async (token) => {
    set({ loading: true, error: null });
    try {
      const [tierData, vipStatus] = await Promise.all([getVipTiers(token), getVipStatus(token)]);
      set({
        tiers: tierData.tiers,
        nextResetAt: tierData.nextResetAt,
        status: vipStatus,
        loading: false,
        error: null,
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Không thể tải VIP',
      });
    }
  },

  refreshVipStatus: async (token) => {
    try {
      const vipStatus = await getVipStatus(token);
      set({ status: vipStatus, nextResetAt: vipStatus.nextResetAt, error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Không thể tải VIP',
      });
    }
  },

  clearVip: () => set({ tiers: [], status: null, nextResetAt: null, loading: false, error: null }),
}));
