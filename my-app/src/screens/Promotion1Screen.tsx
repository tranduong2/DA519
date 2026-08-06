import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { BASE_URL } from '@/services/api';
import { useUserStore } from '@/store/userStore'; // ✅ lấy token

type Props = NativeStackScreenProps<RootStackParamList, 'Promotion'>;

type DiscountType = 'percent' | 'fixed';

interface Promotion {
  id: string;
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue: number;
  maxUsage: number;
  usedCount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const MONTH_NAMES = [
  '', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

function formatCurrency(value: number) {
  return value.toLocaleString('vi-VN') + 'đ';
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

function isExpired(endDate: string) {
  if (!endDate) return false;
  return new Date(endDate) < new Date();
}

function isInMonth(promo: Promotion, month: number, year: number): boolean {
  const start      = new Date(promo.startDate);
  const end        = new Date(promo.endDate);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd   = new Date(year, month, 0, 23, 59, 59);
  return start <= monthEnd && end >= monthStart;
}

export default function PromotionScreen({ route }: Props) {
  const { month, year } = route.params;
  const token = useUserStore(state => state.token); // ✅

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');

  const fetchPromotions = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      // ✅ Dùng /admin/promotions kèm token (backend chưa có route public)
     const res = await fetch(`${BASE_URL}/promotions`, {
  headers: { 'Content-Type': 'application/json' },
});
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Lỗi tải dữ liệu');

      const list: Promotion[] = Array.isArray(data)
        ? data
        : (data.promotions ?? []);

      // Chỉ hiện KM đang active + còn hiệu lực trong tháng
      const filtered = list.filter(
        (p) => p.isActive && isInMonth(p, month, year),
      );

      setPromotions(filtered);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải khuyến mãi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month, year, token]);

  useEffect(() => { fetchPromotions(); }, [fetchPromotions]);

  /* ─── Loading ─── */
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e65100" />
        <Text style={styles.loadingText}>Đang tải khuyến mãi...</Text>
      </View>
    );
  }

  /* ─── Error ─── */
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchPromotions()}>
          <Text style={styles.retryText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          Platform.OS !== 'web' ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchPromotions(true)}
              colors={['#e65100']}
            />
          ) : undefined
        }
      >
        {/* ── Banner tiêu đề ── */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>🎁 Khuyến mãi</Text>
          <Text style={styles.pageSubtitle}>{MONTH_NAMES[month]} năm {year}</Text>
          <Text style={styles.pageCount}>
            {promotions.length} ưu đãi đang có hiệu lực
          </Text>
        </View>

        {/* ── Empty ── */}
        {promotions.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎈</Text>
            <Text style={styles.emptyText}>Chưa có khuyến mãi nào trong tháng này</Text>
            <Text style={styles.emptySubtext}>Hãy quay lại sau nhé!</Text>
          </View>
        )}

        {/* ── Danh sách ── */}
        {promotions.map((promo) => {
          const expired      = isExpired(promo.endDate);
          const usagePercent = promo.maxUsage > 0
            ? Math.min((promo.usedCount / promo.maxUsage) * 100, 100)
            : 0;
          const isFull = promo.maxUsage > 0 && promo.usedCount >= promo.maxUsage;

          return (
            <View key={promo.id} style={[styles.card, (expired || isFull) && styles.cardDim]}>

              <View style={styles.cardHeader}>
                <View style={styles.codePill}>
                  <Text style={styles.codeText}>{promo.code}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  expired || isFull ? styles.statusBadgeOff : styles.statusBadgeOn,
                ]}>
                  <Text style={styles.statusText}>
                    {isFull ? 'Đã hết lượt' : expired ? 'Hết hạn' : '✅ Đang có'}
                  </Text>
                </View>
              </View>

              {!!promo.description && (
                <Text style={styles.cardDesc}>{promo.description}</Text>
              )}

              <View style={styles.discountRow}>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountValue}>
                    {promo.discountType === 'percent'
                      ? `Giảm ${promo.discountValue}%`
                      : `Giảm ${formatCurrency(promo.discountValue)}`}
                  </Text>
                </View>
                {promo.minOrderValue > 0 && (
                  <Text style={styles.minOrder}>
                    Đơn tối thiểu {formatCurrency(promo.minOrderValue)}
                  </Text>
                )}
              </View>

              {promo.maxUsage > 0 && (
                <View style={styles.usageWrap}>
                  <View style={styles.usageRow}>
                    <Text style={styles.usageLabel}>
                      Đã dùng {promo.usedCount}/{promo.maxUsage} lượt
                    </Text>
                    <Text style={styles.usageLabel}>{Math.round(usagePercent)}%</Text>
                  </View>
                  <View style={styles.progressBg}>
                    <View style={[
                      styles.progressFill,
                      {
                        width: `${usagePercent}%` as any,
                        backgroundColor: usagePercent >= 100 ? '#e53935' : '#e65100',
                      },
                    ]} />
                  </View>
                </View>
              )}

              {(promo.startDate || promo.endDate) && (
                <Text style={styles.dateText}>
                  📅 {formatDate(promo.startDate)} – {formatDate(promo.endDate)}
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#fff8f0' },
  content:     { padding: 16, paddingBottom: 40 },
  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#fff8f0' },
  loadingText: { fontSize: 14, color: '#888' },
  errorIcon:   { fontSize: 40 },
  errorText:   { fontSize: 14, color: '#c62828', textAlign: 'center', paddingHorizontal: 32 },
  retryBtn:    { marginTop: 8, backgroundColor: '#e65100', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10 },
  retryText:   { color: '#fff', fontWeight: '700', fontSize: 14 },

  pageHeader: {
    backgroundColor: '#e65100',
    borderRadius: 20,
    padding: 22,
    marginBottom: 16,
    alignItems: 'center',
  },
  pageTitle:    { fontSize: 24, fontWeight: '900', color: '#fff' },
  pageSubtitle: { fontSize: 14, color: '#ffccbc', marginTop: 4 },
  pageCount:    { fontSize: 12, color: '#ffe0b2', marginTop: 6, fontWeight: '600' },

  empty:        { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyIcon:    { fontSize: 52 },
  emptyText:    { fontSize: 16, fontWeight: '700', color: '#555' },
  emptySubtext: { fontSize: 13, color: '#999' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#e65100',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
  },
  cardDim: { opacity: 0.6 },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  codePill: {
    backgroundColor: '#fff3e0',
    borderWidth: 1.5,
    borderColor: '#e65100',
    borderRadius: 10,
    borderStyle: 'dashed',
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  codeText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#e65100',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  statusBadge:    { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeOn:  { backgroundColor: '#e8f5e9' },
  statusBadgeOff: { backgroundColor: '#fce4ec' },
  statusText:     { fontSize: 11, fontWeight: '700', color: '#2e7d32' },

  cardDesc: { fontSize: 13, color: '#555', marginBottom: 10, lineHeight: 20 },

  discountRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' },
  discountBadge: { backgroundColor: '#e53935', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  discountValue: { color: '#fff', fontWeight: '900', fontSize: 15 },
  minOrder:      { fontSize: 12, color: '#888' },

  usageWrap:    { marginBottom: 10 },
  usageRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  usageLabel:   { fontSize: 11, color: '#aaa' },
  progressBg:   { height: 6, backgroundColor: '#f5e0d5', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },

  dateText: { fontSize: 12, color: '#bbb', marginTop: 2 },
});