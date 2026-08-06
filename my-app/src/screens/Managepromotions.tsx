import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  TextInput,
  Modal,
  Switch,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useUserStore } from '@/store/userStore';
import { BASE_URL } from '@/services/api';

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

const EMPTY_FORM = {
  code: '',
  description: '',
  discountType: 'percent' as DiscountType,
  discountValue: '',
  minOrderValue: '',
  maxUsage: '',
  startDate: '',
  endDate: '',
  isActive: true,
};

function formatCurrency(value: number) {
  return value.toLocaleString('vi-VN') + 'đ';
}

function isExpired(endDate: string) {
  if (!endDate) return false;
  return new Date(endDate) < new Date();
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
}

// ✅ Chuyển DD/MM/YYYY hoặc YYYY-MM-DD → YYYY-MM-DD
function toMySQLDate(dateStr: string): string | null {
  if (!dateStr) return null;
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return dateStr;
}

export default function ManagePromotions() {
  const token = useUserStore((state) => state.token);

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchPromotions = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const res = await fetch(`${BASE_URL}/admin/promotions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tải dữ liệu');
      setPromotions(data.promotions || []);
    } catch (err) {
      Alert.alert('Lỗi', err instanceof Error ? err.message : 'Không thể tải khuyến mãi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchPromotions(); }, [fetchPromotions]);

  const filtered = promotions.filter((p) => {
    const matchSearch =
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filterActive === 'all' ||
      (filterActive === 'active' && p.isActive) ||
      (filterActive === 'inactive' && !p.isActive);
    return matchSearch && matchFilter;
  });

  const openCreate = () => {
    setEditingPromo(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (promo: Promotion) => {
    setEditingPromo(promo);
    setForm({
      code: promo.code,
      description: promo.description || '',
      discountType: promo.discountType,
      discountValue: String(promo.discountValue),
      minOrderValue: String(promo.minOrderValue),
      maxUsage: String(promo.maxUsage),
      startDate: formatDate(promo.startDate),
      endDate: formatDate(promo.endDate),
      isActive: promo.isActive,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã khuyến mãi');
      return;
    }
    const discountValue = parseFloat(form.discountValue);
    if (!discountValue || discountValue <= 0) {
      Alert.alert('Lỗi', 'Giá trị giảm phải lớn hơn 0');
      return;
    }
    if (form.discountType === 'percent' && discountValue > 100) {
      Alert.alert('Lỗi', 'Phần trăm giảm không được vượt quá 100%');
      return;
    }

    const body = {
      code: form.code.trim().toUpperCase(),
      description: form.description,
      discountType: form.discountType,
      discountValue,
      minOrderValue: parseFloat(form.minOrderValue) || 0,
      maxUsage: parseInt(form.maxUsage) || 0,
      startDate: toMySQLDate(form.startDate),  // ✅ convert date
      endDate: toMySQLDate(form.endDate),      // ✅ convert date
      isActive: form.isActive,
    };

    try {
      setSaving(true);
      const url = editingPromo
        ? `${BASE_URL}/admin/promotions/${editingPromo.id}`
        : `${BASE_URL}/admin/promotions`;
      const method = editingPromo ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi lưu dữ liệu');

      Alert.alert('Thành công', editingPromo ? 'Đã cập nhật khuyến mãi' : 'Đã thêm khuyến mãi mới');
      setModalVisible(false);
      fetchPromotions();
    } catch (err) {
      Alert.alert('Lỗi', err instanceof Error ? err.message : 'Không thể lưu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (promo: Promotion) => {
    Alert.alert(
      'Xóa khuyến mãi',
      `Bạn chắc chắn muốn xóa mã "${promo.code}"?`,
      [
        { text: 'Hủy' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${BASE_URL}/admin/promotions/${promo.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.message);
              setPromotions((prev) => prev.filter((p) => p.id !== promo.id));
            } catch (err) {
              Alert.alert('Lỗi', err instanceof Error ? err.message : 'Không thể xóa');
            }
          },
        },
      ]
    );
  };

  const handleToggle = async (promo: Promotion) => {
    try {
      const res = await fetch(`${BASE_URL}/admin/promotions/${promo.id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPromotions((prev) =>
        prev.map((p) => (p.id === promo.id ? { ...p, isActive: data.promotion.isActive } : p))
      );
    } catch (err) {
      Alert.alert('Lỗi', err instanceof Error ? err.message : 'Không thể cập nhật');
    }
  };

  const totalActive = promotions.filter((p) => p.isActive).length;
  const totalUsed = promotions.reduce((sum, p) => sum + (p.usedCount || 0), 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2e7d32" />
          <Text style={styles.loadingText}>Đang tải khuyến mãi...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{promotions.length}</Text>
          <Text style={styles.statLabel}>Tổng mã</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#2e7d32' }]}>{totalActive}</Text>
          <Text style={styles.statLabel}>Đang hoạt động</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>{totalUsed}</Text>
          <Text style={styles.statLabel}>Lượt dùng</Text>
        </View>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm mã khuyến mãi..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#aaa"
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>+ Thêm</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filterActive === f && styles.filterTabActive]}
            onPress={() => setFilterActive(f)}
          >
            <Text style={[styles.filterTabText, filterActive === f && styles.filterTabTextActive]}>
              {f === 'all' ? 'Tất cả' : f === 'active' ? 'Hoạt động' : 'Dừng'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchPromotions(true)} colors={['#2e7d32']} />
        }
      >
        {filtered.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🎁</Text>
            <Text style={styles.emptyText}>Không có khuyến mãi nào</Text>
          </View>
        )}

        {filtered.map((promo) => {
          const expired = isExpired(promo.endDate);
          const usagePercent = promo.maxUsage > 0
            ? Math.min((promo.usedCount / promo.maxUsage) * 100, 100) : 0;

          return (
            <View key={promo.id} style={[styles.card, !promo.isActive && styles.cardInactive]}>
              <View style={styles.cardHeader}>
                <View style={styles.codeWrap}>
                  <Text style={styles.codeText}>{promo.code}</Text>
                  {expired && (
                    <View style={styles.expiredBadge}>
                      <Text style={styles.expiredBadgeText}>Hết hạn</Text>
                    </View>
                  )}
                </View>
                <Switch
                  value={promo.isActive}
                  onValueChange={() => handleToggle(promo)}
                  trackColor={{ false: '#e0e0e0', true: '#a5d6a7' }}
                  thumbColor={promo.isActive ? '#2e7d32' : '#bbb'}
                />
              </View>

              <Text style={styles.cardDesc}>{promo.description || '—'}</Text>

              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>
                  {promo.discountType === 'percent'
                    ? `-${promo.discountValue}%`
                    : `-${formatCurrency(promo.discountValue)}`}
                </Text>
                {promo.minOrderValue > 0 && (
                  <Text style={styles.minOrderText}>
                    · Đơn tối thiểu {formatCurrency(promo.minOrderValue)}
                  </Text>
                )}
              </View>

              {promo.maxUsage > 0 && (
                <>
                  <View style={styles.usageRow}>
                    <Text style={styles.usageLabel}>Đã dùng: {promo.usedCount}/{promo.maxUsage}</Text>
                    <Text style={styles.usageLabel}>{Math.round(usagePercent)}%</Text>
                  </View>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, {
                      width: `${usagePercent}%` as any,
                      backgroundColor: usagePercent >= 100 ? '#e53935' : '#2e7d32',
                    }]} />
                  </View>
                </>
              )}

              {(promo.startDate || promo.endDate) && (
                <Text style={styles.dateText}>
                  📅 {formatDate(promo.startDate)} → {formatDate(promo.endDate)}
                </Text>
              )}

              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(promo)}>
                  <Text style={styles.editBtnText}>✏️ Sửa</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(promo)}>
                  <Text style={styles.deleteBtnText}>🗑️ Xóa</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {editingPromo ? 'Chỉnh Sửa Khuyến Mãi' : 'Thêm Khuyến Mãi'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Mã khuyến mãi *</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: SUMMER25"
                value={form.code}
                onChangeText={(v) => setForm((f) => ({ ...f, code: v.toUpperCase() }))}
                autoCapitalize="characters"
              />

              <Text style={styles.label}>Mô tả</Text>
              <TextInput
                style={styles.input}
                placeholder="Mô tả ngắn về khuyến mãi"
                value={form.description}
                onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
              />

              <Text style={styles.label}>Loại giảm giá</Text>
              <View style={styles.typeRow}>
                {(['percent', 'fixed'] as DiscountType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeBtn, form.discountType === type && styles.typeBtnActive]}
                    onPress={() => setForm((f) => ({ ...f, discountType: type }))}
                  >
                    <Text style={[styles.typeBtnText, form.discountType === type && styles.typeBtnTextActive]}>
                      {type === 'percent' ? '% Phần trăm' : 'đ Số tiền cố định'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>
                Giá trị giảm ({form.discountType === 'percent' ? '%' : 'đ'}) *
              </Text>
              <TextInput
                style={styles.input}
                placeholder={form.discountType === 'percent' ? 'VD: 10' : 'VD: 20000'}
                value={form.discountValue}
                onChangeText={(v) => setForm((f) => ({ ...f, discountValue: v }))}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Đơn hàng tối thiểu (đ)</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: 100000"
                value={form.minOrderValue}
                onChangeText={(v) => setForm((f) => ({ ...f, minOrderValue: v }))}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Số lượt dùng tối đa</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: 100"
                value={form.maxUsage}
                onChangeText={(v) => setForm((f) => ({ ...f, maxUsage: v }))}
                keyboardType="numeric"
              />

              {/* ✅ Placeholder rõ ràng hơn */}
              <Text style={styles.label}>Ngày bắt đầu</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: 2026-05-13 hoặc 13/05/2026"
                value={form.startDate}
                onChangeText={(v) => setForm((f) => ({ ...f, startDate: v }))}
              />

              <Text style={styles.label}>Ngày kết thúc</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: 2026-07-13 hoặc 13/07/2026"
                value={form.endDate}
                onChangeText={(v) => setForm((f) => ({ ...f, endDate: v }))}
              />

              <View style={styles.switchRow}>
                <Text style={styles.label}>Kích hoạt ngay</Text>
                <Switch
                  value={form.isActive}
                  onValueChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                  trackColor={{ false: '#e0e0e0', true: '#a5d6a7' }}
                  thumbColor={form.isActive ? '#2e7d32' : '#bbb'}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={saving}>
                  <Text style={styles.cancelBtnText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.saveBtnText}>{editingPromo ? 'Cập nhật' : 'Thêm mới'}</Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4faf4' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#666' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 10, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', elevation: 2, shadowColor: '#2e7d32', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 } },
  statValue: { fontSize: 22, fontWeight: '800', color: '#1b5e20' },
  statLabel: { fontSize: 11, color: '#999', marginTop: 2 },
  toolbar: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 10 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 10, elevation: 1 },
  searchIcon: { fontSize: 16, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 13, color: '#333', paddingVertical: 10 },
  addBtn: { backgroundColor: '#2e7d32', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#c8e6c9' },
  filterTabActive: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  filterTabText: { fontSize: 12, color: '#2e7d32', fontWeight: '600' },
  filterTabTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: '#aaa', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 14, elevation: 2, shadowColor: '#2e7d32', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 } },
  cardInactive: { opacity: 0.55 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  codeWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  codeText: { fontSize: 16, fontWeight: '800', color: '#1b5e20', letterSpacing: 1, fontFamily: 'monospace' },
  expiredBadge: { backgroundColor: '#fce4ec', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  expiredBadgeText: { fontSize: 10, color: '#c62828', fontWeight: '700' },
  cardDesc: { fontSize: 12, color: '#666', marginBottom: 8 },
  discountBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f5e9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10, alignSelf: 'flex-start' },
  discountText: { fontSize: 14, fontWeight: '800', color: '#2e7d32' },
  minOrderText: { fontSize: 11, color: '#666', marginLeft: 4 },
  usageRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  usageLabel: { fontSize: 11, color: '#999' },
  progressBg: { height: 6, backgroundColor: '#e8f5e9', borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  dateText: { fontSize: 11, color: '#aaa', marginBottom: 10 },
  cardActions: { flexDirection: 'row', gap: 8 },
  editBtn: { flex: 1, backgroundColor: '#e8f5e9', borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  editBtnText: { fontSize: 13, color: '#2e7d32', fontWeight: '700' },
  deleteBtn: { flex: 1, backgroundColor: '#fce4ec', borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  deleteBtnText: { fontSize: 13, color: '#c62828', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1b5e20', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: '700', color: '#1b5e20', marginBottom: 4, marginTop: 10 },
  input: { backgroundColor: '#f4faf4', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#333', borderWidth: 1, borderColor: '#c8e6c9' },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, borderWidth: 1, borderColor: '#c8e6c9', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  typeBtnText: { fontSize: 12, color: '#2e7d32', fontWeight: '600' },
  typeBtnTextActive: { color: '#fff' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#c8e6c9', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, color: '#666', fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#2e7d32', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});