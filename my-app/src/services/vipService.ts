import { BASE_URL } from './api';
import type { VipStatus, VipTierConfig } from '@/types';

export async function getVipStatus(token: string): Promise<VipStatus> {
  const res = await fetch(`${BASE_URL}/vip/status`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Không thể tải trạng thái VIP');
  }

  return (json.vip ?? json) as VipStatus;
}

export async function getVipTiers(token: string): Promise<{ tiers: VipTierConfig[]; nextResetAt: string }> {
  const res = await fetch(`${BASE_URL}/vip/tiers`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Không thể tải cấu hình VIP');
  }

  return {
    tiers: (json.tiers || []) as VipTierConfig[],
    nextResetAt: json.nextResetAt,
  };
}
