import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, SafeAreaView, RefreshControl, TextInput,
} from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Admin'>>();
  const user = useUserStore(s => s.user);

  const [orderTab,     setOrderTab]     = useState<OrderTab>(route.params?.initialTab ?? 'orders');
  const [normalOrders, setNormal]       = useState<NormalOrder[]>([]);
  const [bulkOrders,   setBulk]         = useState<BulkOrder[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [dateSearch,   setDateSearch]   = useState('');
  const [orderModal,   setOrderModal]   = useState<{
    visible: boolean; orderId: number; type: 'normal' | 'bulk'; current: string;
  } | null>(null);
  const [detailOrder, setDetailOrder] = useState<{
    type: 'normal' | 'bulk'; order: NormalOrder | BulkOrder;
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
    <TouchableOpacity
      key={o.id}
      style={s.card}
      activeOpacity={0.78}
      onPress={() => navigation.navigate('AdminOrderDetail', { orderId: o.id, type: 'normal' })}
      accessibilityRole="button"
      accessibilityLabel={`Xem chi tiết đơn ${o.orderCode} của ${o.userName ?? 'khách hàng'}`}
    >
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
        onPress={(event) => {
          event.stopPropagation();
          setOrderModal({ visible: true, orderId: o.id, type: 'normal', current: o.status });
        }}
      >
        <Text style={s.updateBtnText}>✏️ Cập nhật trạng thái</Text>
      </TouchableOpacity>
      <Text style={s.viewHint}>Nhấn để xem chi tiết đơn hàng →</Text>
    </TouchableOpacity>
  );

  const renderBulkCard = (o: BulkOrder) => (
    <TouchableOpacity
      key={o.id}
      style={s.card}
      activeOpacity={0.78}
      onPress={() => navigation.navigate('AdminOrderDetail', { orderId: o.id, type: 'bulk' })}
      accessibilityRole="button"
      accessibilityLabel={`Xem chi tiết đơn sỉ của ${o.userName ?? 'cửa hàng'}`}
    >
      <View style={s.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.storeLabel}>CỬA HÀNG ĐẶT ĐƠN</Text>
          <Text style={s.storeName}>🏪 {o.userName || 'Chưa có tên cửa hàng'}</Text>
        </View>
        <View style={s.bulkCardActions}>
          {renderBadge(o.status)}
          <Text style={s.openArrow}>›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const matchesDate = (value: string) => {
    const q = dateSearch.trim().toLowerCase();
    if (!q) return true;
    const d = new Date(value);
    return [d.toLocaleDateString('vi-VN'), d.toISOString().slice(0, 10), String(d.getMonth() + 1), String(d.getFullYear())]
      .some(v => v.toLowerCase().includes(q));
  };
  const visibleNormalOrders = normalOrders.filter(o => matchesDate(o.createdAt));
  const visibleBulkOrders = bulkOrders.filter(o => matchesDate(o.createdAt) || (o.userName || '').toLowerCase().includes(dateSearch.trim().toLowerCase()));
  const storeSummaries = Object.values(bulkOrders.reduce<Record<string, {
    key: string; name: string; email: string; invoiceCount: number; total: number;
  }>>((groups, order) => {
    const key = order.userEmail || order.userName || `store-${order.id}`;
    if (!groups[key]) groups[key] = {
      key,
      name: order.userName || 'Chưa có tên cửa hàng',
      email: order.userEmail || '',
      invoiceCount: 0,
      total: 0,
    };
    groups[key].invoiceCount += 1;
    groups[key].total += Number(order.totalPrice) || 0;
    return groups;
  }, {})).filter(store => {
    const query = dateSearch.trim().toLowerCase();
    return !query || store.name.toLowerCase().includes(query) || store.email.toLowerCase().includes(query);
  });

  // ─── Main Render ──────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>

      {/* Order detail modal */}
      <Modal transparent visible={!!detailOrder} animationType="fade" onRequestClose={() => setDetailOrder(null)}>
        <View style={s.detailOverlay}>
          <View style={s.detailModal}>
            {detailOrder && (() => {
              const order = detailOrder.order;
              const isNormal = detailOrder.type === 'normal';
              const normalOrder = isNormal ? order as NormalOrder : null;
              const bulkOrder = !isNormal ? order as BulkOrder : null;
              return (
                <>
                  <View style={s.detailHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.detailTitle}>Chi tiết {isNormal ? 'đơn hàng' : 'đơn sỉ'}</Text>
                      <Text style={s.detailCode}>{order.orderCode}</Text>
                    </View>
                    {renderBadge(order.status)}
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={s.customerBox}>
                      <Text style={s.detailSectionTitle}>Thông tin khách hàng</Text>
                      <Text style={s.customerName}>👤 {order.userName || 'Chưa có tên khách hàng'}</Text>
                      <Text style={s.customerInfo}>📞 {order.userPhone || 'Chưa có số điện thoại'}</Text>
                      <Text style={s.customerInfo}>📧 {order.userEmail || 'Chưa có email'}</Text>
                      {normalOrder?.shippingAddress && (
                        <Text style={s.customerInfo}>📍 {normalOrder.shippingAddress}</Text>
                      )}
                    </View>

                    <Text style={s.detailSectionTitle}>Sản phẩm đã đặt ({order.items.length})</Text>
                    {order.items.map((item, index) => (
                      <View key={item.id ?? index} style={s.detailItem}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.detailItemName}>{item.productName}</Text>
                          <Text style={s.detailItemMeta}>
                            {isNormal ? `Số lượng: ${item.quantity}` : `Khối lượng: ${item.kg} kg`}
                          </Text>
                          {!!item.note && <Text style={s.detailItemNote}>Ghi chú: {item.note}</Text>}
                        </View>
                        <Text style={s.detailItemPrice}>
                          {fmtPrice(Number(isNormal ? item.price * item.quantity : item.subtotal))}
                        </Text>
                      </View>
                    ))}

                    <View style={s.detailTotalRow}>
                      <Text style={s.detailTotalLabel}>Tổng thanh toán</Text>
                      <Text style={s.detailTotalValue}>
                        {fmtPrice(Number(normalOrder?.totalAmount ?? bulkOrder?.totalPrice ?? 0))}
                      </Text>
                    </View>
                    {normalOrder && (
                      <Text style={s.paymentInfo}>
                        Phương thức: {normalOrder.paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng' : 'Chuyển khoản'}
                      </Text>
                    )}
                  </ScrollView>

                  <TouchableOpacity style={s.detailCloseBtn} onPress={() => setDetailOrder(null)}>
                    <Text style={s.detailCloseText}>Đóng</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

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
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>🧾 Quản lý đơn hàng</Text>
          <Text style={s.headerSub}>Xin chào, {user?.username ?? 'Admin'}</Text>
        </View>
        <TouchableOpacity style={s.manageProductsBtn} onPress={() => navigation.navigate('ManageProducts')}>
          <Text style={s.manageProductsText}>+ Quản lý SP sỉ</Text>
        </TouchableOpacity>
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

      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>🔎</Text>
        <TextInput
          value={dateSearch}
          onChangeText={setDateSearch}
          style={s.searchInput}
          placeholder={orderTab === 'bulk' ? 'Tìm tên cửa hàng hoặc ngày/tháng/năm' : 'Tìm theo ngày/tháng/năm, VD: 24/08/2026'}
          placeholderTextColor="#90a4ae"
        />
        {dateSearch ? <TouchableOpacity onPress={() => setDateSearch('')}><Text style={s.searchClear}>✕</Text></TouchableOpacity> : null}
      </View>

      {orderTab === 'bulk' && storeSummaries.length > 0 && (
        <View style={s.storeSummarySection}>
          <Text style={s.storeSummaryTitle}>TỔNG HÓA ĐƠN THEO QUÁN</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.storeSummaryList}>
            {storeSummaries.map(store => (
              <View key={store.key} style={s.storeSummaryCard}>
                <Text style={s.storeSummaryName} numberOfLines={1}>🏪 {store.name}</Text>
                <Text style={s.storeSummaryMeta}>{store.invoiceCount} hóa đơn</Text>
                <Text style={s.storeSummaryTotal}>{fmtPrice(store.total)}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

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
            visibleNormalOrders.length === 0
              ? <Text style={s.empty}>Không tìm thấy đơn hàng</Text>
              : visibleNormalOrders.map(renderOrderCard)
          )}
          {orderTab === 'bulk' && (
            visibleBulkOrders.length === 0
              ? <Text style={s.empty}>Không tìm thấy đơn sỉ</Text>
              : visibleBulkOrders.map(renderBulkCard)
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
    paddingTop: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  headerSub:   { fontSize: 13, color: '#a5d6a7', marginTop: 2 },
  manageProductsBtn: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9 },
  manageProductsText: { color: '#1b5e20', fontSize: 12, fontWeight: '800' },

  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8f5e9' },
  tab:         { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive:   { borderBottomWidth: 3, borderBottomColor: '#2e7d32' },
  tabText:     { fontSize: 13, color: '#aaa', fontWeight: '600' },
  tabTextActive: { color: '#2e7d32', fontWeight: '800' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', margin: 12, marginBottom: 0, backgroundColor: '#fff', borderWidth: 1, borderColor: '#c8e6c9', borderRadius: 12, paddingHorizontal: 12 },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, padding: 12, fontSize: 13, color: '#263238', outlineStyle: 'none' } as any,
  searchClear: { color: '#78909c', padding: 6 },
  storeSummarySection: { backgroundColor: '#f4faf4', paddingTop: 12 },
  storeSummaryTitle: { marginHorizontal: 14, marginBottom: 8, color: '#558b2f', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  storeSummaryList: { paddingHorizontal: 12, gap: 10 },
  storeSummaryCard: { width: 190, backgroundColor: '#fff', borderRadius: 14, padding: 13, borderWidth: 1, borderColor: '#c8e6c9' },
  storeSummaryName: { color: '#1b5e20', fontSize: 14, fontWeight: '900' },
  storeSummaryMeta: { color: '#78909c', fontSize: 11, marginTop: 5 },
  storeSummaryTotal: { color: '#e65100', fontSize: 17, fontWeight: '900', marginTop: 5 },

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
  storeLabel: { fontSize: 10, color: '#78909c', fontWeight: '800', letterSpacing: 0.8, marginBottom: 4 },
  storeName: { fontSize: 18, color: '#1b5e20', fontWeight: '900' },
  openArrow: { fontSize: 30, lineHeight: 32, color: '#66bb6a', fontWeight: '700' },
  bulkCardActions: { alignItems: 'flex-end', gap: 5 },
  bulkItemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e8f5e9' },
  bulkItemName: { flex: 1, fontSize: 17, lineHeight: 23, color: '#263238', fontWeight: '900' },
  quantityBox: { minWidth: 86, backgroundColor: '#e8f5e9', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  quantityLabel: { fontSize: 9, color: '#558b2f', fontWeight: '800', letterSpacing: 0.6 },
  quantityValue: { fontSize: 24, color: '#1b5e20', fontWeight: '900', lineHeight: 29 },
  updateBtn:     { backgroundColor: '#e8f5e9', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  updateBtnText: { color: '#2e7d32', fontWeight: '700', fontSize: 13 },
  viewHint: { color: '#78909c', fontSize: 11, textAlign: 'center', marginTop: 9 },
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
  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  detailModal: { width: '100%', maxWidth: 600, maxHeight: '88%', backgroundColor: '#fff', borderRadius: 20, padding: 18 },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  detailTitle: { fontSize: 18, fontWeight: '900', color: '#1b5e20' },
  detailCode: { fontSize: 13, color: '#78909c', marginTop: 3, fontWeight: '700' },
  customerBox: { backgroundColor: '#f1f8e9', borderRadius: 14, padding: 14, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#2e7d32' },
  detailSectionTitle: { fontSize: 13, fontWeight: '800', color: '#1b5e20', marginBottom: 9 },
  customerName: { fontSize: 14, fontWeight: '800', color: '#263238', marginBottom: 6 },
  customerInfo: { fontSize: 12, color: '#546e7a', lineHeight: 19 },
  detailItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#edf4ed', gap: 10 },
  detailItemName: { fontSize: 13, color: '#263238', fontWeight: '700' },
  detailItemMeta: { fontSize: 12, color: '#78909c', marginTop: 3 },
  detailItemNote: { fontSize: 11, color: '#8d6e63', fontStyle: 'italic', marginTop: 3 },
  detailItemPrice: { fontSize: 13, color: '#e65100', fontWeight: '800' },
  detailTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, paddingTop: 13, borderTopWidth: 2, borderTopColor: '#e8f5e9' },
  detailTotalLabel: { fontSize: 14, color: '#455a64', fontWeight: '700' },
  detailTotalValue: { fontSize: 17, color: '#e65100', fontWeight: '900' },
  paymentInfo: { fontSize: 12, color: '#607d8b', textAlign: 'right', marginTop: 7 },
  detailCloseBtn: { backgroundColor: '#2e7d32', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  detailCloseText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
