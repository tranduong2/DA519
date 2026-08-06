import React, { useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useUserStore } from '@/store/userStore';
import { useVipStore } from '@/store/vipStore';

function formatCurrency(value: number) {
  return value.toLocaleString('vi-VN') + 'đ';
}

function formatDate(dateString?: string | null) {
  if (!dateString) return 'Chưa có dữ liệu';
  return new Date(dateString).toLocaleDateString('vi-VN');
}

export default function VIPMembershipScreen() {
  const navigation = useNavigation<any>();
  const token = useUserStore((state) => state.token);
  const vipTier = useUserStore((state) => state.user?.vipTier ?? null);
  const store = useVipStore();

  // ✅ Fix: dùng useFocusEffect thay useEffect
  // Mỗi lần màn hình được focus (kể cả sau khi mua hàng quay lại),
  // dữ liệu VIP sẽ được fetch lại từ server thay vì dùng cache cũ.
  useFocusEffect(
    useCallback(() => {
      if (token) {
        store.loadVipData(token);
      }
    }, [token])
  );

  const currentStatus = store.status;
  const tiers = store.tiers.length > 0 ? store.tiers : currentStatus?.tiers ?? [];
  const activeTier = currentStatus?.tier ?? vipTier ?? null;
  const activeTierConfig = tiers.find((tier) => tier.key === activeTier) ?? null;
  const nextTier = tiers.find((tier) => tier.minSpending > (currentStatus?.quarterlySpending ?? 0));
  const nextTierProgress = nextTier
    ? Math.min((currentStatus?.quarterlySpending ?? 0) / nextTier.minSpending, 1)
    : 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Thành viên VIP</Text>
          <Text style={styles.subtitle}>Ưu đãi theo chu kỳ 3 tháng</Text>
        </View>
      </View>

      {store.loading && !currentStatus ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2e7d32" />
          <Text style={styles.loadingText}>Đang tải thông tin VIP...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Hạng hiện tại</Text>
            <Text style={styles.heroTier}>{activeTierConfig?.label ?? 'Member'}</Text>
            <Text style={styles.heroPoints}>
              {formatCurrency(currentStatus?.rewardPoints ?? 0)} điểm thưởng
            </Text>
            <Text style={styles.heroInfo}>
              Chu kỳ hiện tại: {currentStatus?.quarterKey ?? 'Chưa xác định'}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tiến trình lên hạng</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${nextTierProgress * 100}%` }]} />
            </View>
            <Text style={styles.sectionHint}>
              {nextTier
                ? `${formatCurrency(currentStatus?.quarterlySpending ?? 0)} / ${formatCurrency(nextTier.minSpending)} để lên ${nextTier.label}`
                : 'Bạn đã ở hạng cao nhất'}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quyền lợi VIP</Text>
            {tiers.map((tier) => (
              <View key={tier.key} style={[styles.tierCard, activeTier === tier.key && styles.tierCardActive]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tierName}>{tier.label}</Text>
                  <Text style={styles.tierMeta}>
                    Tối thiểu {formatCurrency(tier.minSpending)} • Giảm {tier.discountPercent}% • {tier.pointsMultiplier}x điểm
                  </Text>
                </View>
                {activeTier === tier.key && <Text style={styles.activeBadge}>Đang dùng</Text>}
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chu kỳ tiếp theo</Text>
            <Text style={styles.nextReset}>{formatDate(store.nextResetAt ?? currentStatus?.nextResetAt)}</Text>
            <Text style={styles.sectionHint}>Hệ thống sẽ tự làm mới điểm chi tiêu sau mỗi 3 tháng.</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4faf4' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: '#1b5e20' },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#fff', fontSize: 26, lineHeight: 28 },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, color: '#666' },
  content: { padding: 16, gap: 14 },
  heroCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#dcedc8' },
  heroLabel: { color: '#2e7d32', fontSize: 12, fontWeight: '700' },
  heroTier: { fontSize: 30, fontWeight: '900', color: '#1b5e20', marginTop: 4 },
  heroPoints: { marginTop: 6, fontSize: 15, fontWeight: '700', color: '#f57f17' },
  heroInfo: { marginTop: 6, fontSize: 12, color: '#757575' },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e8f5e9' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1b5e20', marginBottom: 10 },
  progressTrack: { height: 10, borderRadius: 999, backgroundColor: '#e8f5e9', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#2e7d32' },
  sectionHint: { marginTop: 8, fontSize: 12, color: '#666' },
  tierCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f1f8e9' },
  tierCardActive: { backgroundColor: '#f6fff6', borderRadius: 12, paddingHorizontal: 10 },
  tierName: { fontSize: 14, fontWeight: '800', color: '#212121' },
  tierMeta: { marginTop: 2, fontSize: 12, color: '#757575' },
  activeBadge: { color: '#2e7d32', fontSize: 11, fontWeight: '800', backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  nextReset: { fontSize: 16, fontWeight: '800', color: '#2e7d32' },
});