import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, SafeAreaView, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useUserStore } from '@/store/userStore';
import { BASE_URL } from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────
type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'on_the_way' | 'delivered' | 'cancelled';
type BulkStatus  = 'pending' | 'confirmed' | 'delivering' | 'delivered' | 'cancelled';
type OrderTab    = 'orders' | 'bulk';

export interface NormalOrder {
  id: number; orderCode: string; userName: string; userPhone: string;
  userEmail: string; totalAmount: number; status: OrderStatus;
  paymentMethod: string; shippingAddress: string; createdAt: string; items: any[];
}
export interface BulkOrder {
  id: number; orderCode: string; userName: string; userPhone: string;
  userEmail: string; totalPrice: number; status: BulkStatus;
  orderDate: string; createdAt: string; items: any[];
}

// ─── Constants ───────────────────────────────────────────────────
const NORMAL_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: 'pending',    label: 'Chờ xác nhận' },
  { value: 'confirmed',  label: 'Đã xác nhận'  },
  { value: 'preparing',  label: 'Đang chuẩn bị'},
  { value: 'on_the_way', label: 'Đang giao'    },
  { value: 'delivered',  label: 'Đã giao'      },
  { value: 'cancelled',  label: 'Đã hủy'       },
];
const BULK_STATUSES: { value: BulkStatus; label: string }[] = [
  { value: 'pending',    label: 'Chờ xác nhận' },
  { value: 'confirmed',  label: 'Đã xác nhận'  },
  { value: 'delivering', label: 'Đang giao'    },
  { value: 'delivered',  label: 'Đã giao'      },
  { value: 'cancelled',  label: 'Đã hủy'       },
];
const STATUS_COLORS: Record<string, string> = {
  pending: '#ff9800', confirmed: '#2196f3', preparing: '#9c27b0',
  on_the_way: '#00bcd4', delivering: '#00bcd4',
  delivered: '#4caf50', cancelled: '#f44336',
};
const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', preparing: 'Đang chuẩn bị',
  on_the_way: 'Đang giao', delivering: 'Đang giao', delivered: 'Đã giao', cancelled: 'Đã hủy',
};

// ─── Helpers ──────────────────────────────────────────────────────
const fmtPrice = (n: number) => Number(n).toLocaleString('vi-VN') + 'đ';
const fmtDate  = (s: string) => new Date(s).toLocaleDateString('vi-VN');

// ─── Main Component ───────────────────────────────────────────────
export default function OrdersScreen() {
  const user = useUserStore(s => s.user);

  const [orderTab,     setOrderTab]     = useState<OrderTab>('orders');
  const [normalOrders, setNormal]       = useState<NormalOrder[]>([]);
  const [bulkOrders,   setBulk]         = useState<BulkOrder[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [orderModal,   setOrderModal]   = useState<{
    visible: boolean; orderId: number; type: 'normal' | 'bulk'; current: string;
  } | null>(null);

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${user?.token}`,
  }), [user?.token]);

  // ─── Fetch ────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    if (!user?.token) { setError('Chưa đăng nhập'); return; }
    try {
      setLoading(true); setError(null);
      const h = { Authorization: `Bearer ${user.token}` };
      const [r1, r2] = await Promise.all([
        fetch(`${BASE_URL}/admin/orders`,      { headers: h }),
        fetch(`${BASE_URL}/admin/bulk-orders`, { headers: h }),
      ]);
      if (!r1.ok) throw new Error('Không có quyền admin');
      const d1 = await r1.json(); setNormal(d1.orders ?? []);
      if (r2.ok) { const d2 = await r2.json(); setBulk(d2.orders ?? []); }
    } catch (e: any) {
      setError(e.message ?? 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [user?.token]);

  useFocusEffect(useCallback(() => { fetchOrders(); }, [fetchOrders]));

  // ─── Update status ────────────────────────────────────────────
  const updateOrderStatus = async (status: string) => {
    if (!orderModal || !user?.token) return;
    const { orderId, type } = orderModal;
    setOrderModal(null);
    const url = type === 'normal'
      ? `${BASE_URL}/admin/orders/${orderId}/status`
      : `${BASE_URL}/admin/bulk-orders/${orderId}/status`;
    try {
      const res = await fetch(url, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Cập nhật thất bại');
      fetchOrders();
    } catch (e: any) { setError(e.message); }
  };

  // ─── Render helpers ───────────────────────────────────────────
  const renderBadge = (status: string) => (
    <View style={[s.badge, { backgroundColor: STATUS_COLORS[status] ?? '#999' }]}>
      <Text style={s.badgeText}>{STATUS_LABELS[status] ?? status}</Text>
    </View>
  );

  const renderOrderCard = (o: NormalOrder) => (
    <View key={o.id} style={s.card}>
      <View style={s.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.code}>{o.orderCode}</Text>
          <Text style={s.meta}>👤 {o.userName}  📞 {o.userPhone}</Text>
          <Text style={s.meta}>📧 {o.userEmail}</Text>
          <Text style={s.meta}>📅 {fmtDate(o.createdAt)}</Text>
        </View>
        {renderBadge(o.status)}
      </View>
      <View style={s.divider} />
      <View style={s.row}>
        <Text style={s.label}>💳 Thanh toán</Text>
        <Text style={s.val}>{o.paymentMethod === 'cod' ? 'COD' : 'MoMo'}</Text>
      </View>
      <View style={s.row}>
        <Text style={s.label}>💰 Tổng tiền</Text>
        <Text style={[s.val, s.price]}>{fmtPrice(o.totalAmount)}</Text>
      </View>
      <View style={s.row}>
        <Text style={s.label}>📍 Địa chỉ</Text>
        <Text style={[s.val, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>
          {o.shippingAddress}
        </Text>
      </View>
      <TouchableOpacity
        style={s.updateBtn}
        onPress={() => setOrderModal({ visible: true, orderId: o.id, type: 'normal', current: o.status })}
      >
        <Text style={s.updateBtnText}>✏️ Cập nhật trạng thái</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBulkCard = (o: BulkOrder) => (
    <View key={o.id} style={s.card}>
      <View style={s.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.code}>{o.orderCode}</Text>
          <Text style={s.meta}>👤 {o.userName}  📞 {o.userPhone}</Text>
          <Text style={s.meta}>📅 {o.orderDate}</Text>
        </View>
        {renderBadge(o.status)}
      </View>
      <View style={s.divider} />
      {o.items.map((item, i) => (
        <View key={i} style={s.itemRow}>
          <Text style={s.itemName} numberOfLines={1}>{item.productName}</Text>
          <Text style={s.itemKg}>{item.kg}kg</Text>
          <Text style={s.itemPrice}>{Number(item.subtotal).toLocaleString('vi-VN')}đ</Text>
        </View>
      ))}
      <View style={s.divider} />
      <View style={s.row}>
        <Text style={s.label}>💰 Tổng tiền</Text>
        <Text style={[s.val, s.price]}>{fmtPrice(Number(o.totalPrice))}</Text>
      </View>
      <TouchableOpacity
        style={s.updateBtn}
        onPress={() => setOrderModal({ visible: true, orderId: o.id, type: 'bulk', current: o.status })}
      >
        <Text style={s.updateBtnText}>✏️ Cập nhật trạng thái</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Main Render ──────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>

      {/* Status update modal */}
      <Modal transparent visible={!!orderModal?.visible} animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setOrderModal(null)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Cập nhật trạng thái</Text>
            {(orderModal?.type === 'normal' ? NORMAL_STATUSES : BULK_STATUSES).map(st => (
              <TouchableOpacity
                key={st.value}
                style={[s.sheetItem, orderModal?.current === st.value && s.sheetItemActive]}
                onPress={() => updateOrderStatus(st.value)}
              >
                <View style={[s.dot, { backgroundColor: STATUS_COLORS[st.value] }]} />
                <Text style={[s.sheetItemText, orderModal?.current === st.value && { fontWeight: '800', color: '#2e7d32' }]}>
                  {st.label}
                </Text>
                {orderModal?.current === st.value && <Text style={{ color: '#2e7d32' }}>✓</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.sheetCancel} onPress={() => setOrderModal(null)}>
              <Text style={s.sheetCancelText}>Huỷ</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>🧾 Quản lý đơn hàng</Text>
        <Text style={s.headerSub}>Xin chào, {user?.username ?? 'Admin'}</Text>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {([
          { id: 'orders', label: 'Đơn thường', count: normalOrders.length },
          { id: 'bulk',   label: 'Đơn sỉ',     count: bulkOrders.length   },
        ] as { id: OrderTab; label: string; count: number }[]).map(t => (
          <TouchableOpacity
            key={t.id}
            style={[s.tab, orderTab === t.id && s.tabActive]}
            onPress={() => setOrderTab(t.id)}
          >
            <Text style={[s.tabText, orderTab === t.id && s.tabTextActive]}>
              {t.label}{t.count > 0 ? ` (${t.count})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#2e7d32" />
          <Text style={{ marginTop: 12, color: '#666' }}>Đang tải...</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text style={{ fontSize: 40 }}>⚠️</Text>
          <Text style={{ color: '#c62828', marginTop: 8, textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={fetchOrders}>
            <Text style={s.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchOrders(); }}
            />
          }
        >
          {orderTab === 'orders' && (
            normalOrders.length === 0
              ? <Text style={s.empty}>Chưa có đơn hàng nào</Text>
              : normalOrders.map(renderOrderCard)
          )}
          {orderTab === 'bulk' && (
            bulkOrders.length === 0
              ? <Text style={s.empty}>Chưa có đơn sỉ nào</Text>
              : bulkOrders.map(renderBulkCard)
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4faf4' },

  header: {
    backgroundColor: '#1b5e20', paddingHorizontal: 20,
    paddingTop: 16, paddingBottom: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  headerSub:   { fontSize: 13, color: '#a5d6a7', marginTop: 2 },

  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8f5e9' },
  tab:         { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive:   { borderBottomWidth: 3, borderBottomColor: '#2e7d32' },
  tabText:     { fontSize: 13, color: '#aaa', fontWeight: '600' },
  tabTextActive: { color: '#2e7d32', fontWeight: '800' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  list:   { padding: 16, gap: 12, paddingBottom: 40 },
  empty:  { textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 14 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    elevation: 2, shadowColor: '#2e7d32', shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 }, marginBottom: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  code:    { fontSize: 14, fontWeight: '800', color: '#1b5e20', marginBottom: 4 },
  meta:    { fontSize: 12, color: '#777', marginBottom: 2 },
  divider: { height: 1, backgroundColor: '#f1f8e9', marginVertical: 10 },
  row:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label:   { fontSize: 12, color: '#888' },
  val:     { fontSize: 12, color: '#333', fontWeight: '600' },
  price:   { color: '#e65100', fontSize: 14, fontWeight: '800' },
  badge:   { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  itemRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8 },
  itemName:  { flex: 1, fontSize: 12, color: '#333', fontWeight: '600' },
  itemKg:    { fontSize: 12, color: '#666', width: 40, textAlign: 'right' },
  itemPrice: { fontSize: 12, color: '#e65100', fontWeight: '700', width: 80, textAlign: 'right' },
  updateBtn:     { backgroundColor: '#e8f5e9', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  updateBtnText: { color: '#2e7d32', fontWeight: '700', fontSize: 13 },
  retryBtn:  { backgroundColor: '#2e7d32', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10, marginTop: 16 },
  retryText: { color: '#fff', fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36,
  },
  sheetTitle:      { fontSize: 16, fontWeight: '800', color: '#1b5e20', marginBottom: 16, textAlign: 'center' },
  sheetItem:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  sheetItemActive: { backgroundColor: '#f1f8e9', borderRadius: 10, paddingHorizontal: 8 },
  sheetItemText:   { flex: 1, fontSize: 14, color: '#333' },
  dot:             { width: 12, height: 12, borderRadius: 6 },
  sheetCancel:     { marginTop: 16, alignItems: 'center', paddingVertical: 12, backgroundColor: '#f5f5f5', borderRadius: 12 },
  sheetCancelText: { color: '#888', fontWeight: '700', fontSize: 14 },
});