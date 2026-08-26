import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BASE_URL } from '@/services/api';
import { useUserStore } from '@/store/userStore';

const LABELS: Record<string, string> = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', delivering: 'Đang giao', delivered: 'Đã giao', cancelled: 'Đã hủy' };
const COLORS: Record<string, string> = { pending: '#ff9800', confirmed: '#2196f3', delivering: '#00acc1', delivered: '#43a047', cancelled: '#e53935' };
const money = (value: unknown) => `${Number(value ?? 0).toLocaleString('vi-VN')}đ`;

export default function BulkOrderTrackingScreen() {
  const user = useUserStore(s => s.user);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [dateSearch, setDateSearch] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!user?.token) { setError('Vui lòng đăng nhập để theo dõi đơn sỉ.'); setLoading(false); return; }
    try {
      setError('');
      const res = await fetch(`${BASE_URL}/bulk-orders`, { headers: { Authorization: `Bearer ${user.token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể tải đơn sỉ');
      setOrders(data.orders ?? data ?? []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user?.token]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));
  const needle = dateSearch.trim().toLowerCase();
  const filtered = orders.filter(o => {
    const d = new Date(o.createdAt);
    const values = [d.toLocaleDateString('vi-VN'), d.toISOString().slice(0, 10), String(d.getMonth() + 1), String(d.getFullYear())];
    return !needle || values.some(v => v.toLowerCase().includes(needle));
  });

  return <SafeAreaView style={s.page}>
    <View style={s.header}><Text style={s.title}>📋 Quản lý hóa đơn sỉ</Text><Text style={s.sub}>Theo dõi đơn hàng và xem hóa đơn admin đã gửi</Text></View>
    <View style={s.searchBox}><Text style={s.searchIcon}>🔎</Text><TextInput value={dateSearch} onChangeText={setDateSearch} style={s.search} placeholder="Tìm theo ngày/tháng/năm, VD: 24/08/2026" placeholderTextColor="#90a4ae" />{dateSearch ? <TouchableOpacity onPress={() => setDateSearch('')}><Text style={s.clear}>✕</Text></TouchableOpacity> : null}</View>
    {loading ? <View style={s.center}><ActivityIndicator size="large" color="#2e7d32" /></View> :
      <ScrollView contentContainerStyle={s.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        {error ? <Text style={s.error}>{error}</Text> : null}
        {!error && filtered.length === 0 ? <View style={s.empty}><Text style={s.emptyIcon}>📦</Text><Text style={s.emptyTitle}>{orders.length ? 'Không tìm thấy đơn' : 'Chưa có đơn sỉ'}</Text></View> : null}
        {filtered.map(o => <TouchableOpacity key={o.id} style={s.card} onPress={() => setOpenId(openId === o.id ? null : o.id)}>
          <View style={s.cardTop}><View style={{ flex: 1 }}><Text style={s.store}>🏪 {user?.username || 'Cửa hàng của tôi'}</Text><Text style={s.date}>📅 {new Date(o.createdAt).toLocaleString('vi-VN')}</Text></View><View style={[s.badge, { backgroundColor: COLORS[o.status] || '#78909c' }]}><Text style={s.badgeText}>{LABELS[o.status] || o.status}</Text></View></View>
          <View style={[s.invoiceState, o.invoiceSent ? s.invoiceReady : s.invoiceWaiting]}><Text style={[s.invoiceStateText, o.invoiceSent && s.invoiceReadyText]}>{o.invoiceSent ? `Hóa đơn: ${money(o.totalPrice)}` : 'Admin chưa gửi hóa đơn'}</Text></View>
          <Text style={s.hint}>{openId === o.id ? 'Ẩn chi tiết ↑' : o.invoiceSent ? 'Xem chi tiết hóa đơn →' : 'Xem sản phẩm đã đặt →'}</Text>
          {openId === o.id ? <View style={s.table}>
            {(o.items || []).map((item: any, i: number) => <View key={item.id ?? i} style={[s.row, i % 2 === 1 && s.rowEven]}>
              <View style={s.itemMain}><Text style={s.no}>{i + 1}</Text><Text numberOfLines={1} style={s.product}>{item.productName}</Text><Text style={s.qty}>{item.kg} kg</Text></View>
              {o.invoiceSent ? <View style={s.priceLine}><Text style={s.unitPrice}>{item.kg} kg × {money(item.pricePerKg)}</Text><Text style={s.subtotal}>{money(item.subtotal)}</Text></View> : null}
              {item.note ? <Text style={s.itemNote}>Ghi chú: {item.note}</Text> : null}
            </View>)}
            {o.invoiceSent ? <View style={s.invoiceTotal}><Text style={s.invoiceTotalLabel}>TỔNG HÓA ĐƠN</Text><Text style={s.invoiceTotalValue}>{money(o.totalPrice)}</Text></View> : <Text style={s.waitingText}>Đơn giá và thành tiền sẽ hiển thị sau khi admin gửi hóa đơn.</Text>}
          </View> : null}
        </TouchableOpacity>)}
      </ScrollView>}
  </SafeAreaView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f4faf4' }, header: { backgroundColor: '#1b5e20', padding: 20 }, title: { color: '#fff', fontSize: 22, fontWeight: '900' }, sub: { color: '#c8e6c9', fontSize: 12, marginTop: 5 },
  searchBox: { flexDirection: 'row', alignItems: 'center', margin: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#c8e6c9', borderRadius: 12, paddingHorizontal: 12 }, searchIcon: { fontSize: 16 }, search: { flex: 1, padding: 12, fontSize: 14, color: '#263238', outlineStyle: 'none' } as any, clear: { color: '#78909c', padding: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, list: { paddingHorizontal: 14, paddingBottom: 40, gap: 12 }, error: { color: '#c62828', backgroundColor: '#ffebee', padding: 14, borderRadius: 10 }, empty: { alignItems: 'center', padding: 50 }, emptyIcon: { fontSize: 50 }, emptyTitle: { color: '#78909c', fontWeight: '700', marginTop: 10 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 15, shadowColor: '#000', shadowOpacity: .06, shadowOffset: { width: 0, height: 2 }, elevation: 2 }, cardTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' }, store: { color: '#1b5e20', fontSize: 17, fontWeight: '900' }, date: { color: '#78909c', fontSize: 11, marginTop: 4 }, badge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 }, badgeText: { color: '#fff', fontWeight: '800', fontSize: 10 }, hint: { color: '#2e7d32', fontSize: 11, fontWeight: '700', marginTop: 12 },
  invoiceState: { alignSelf: 'flex-start', borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5, marginTop: 10 }, invoiceWaiting: { backgroundColor: '#fff3e0' }, invoiceReady: { backgroundColor: '#e8f5e9' }, invoiceStateText: { color: '#e65100', fontSize: 10, fontWeight: '800' }, invoiceReadyText: { color: '#1b5e20' },
  table: { borderWidth: 1, borderColor: '#a5d6a7', marginTop: 12, overflow: 'hidden', borderRadius: 8 }, row: { padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0' }, rowEven: { backgroundColor: '#f1f8e9' }, itemMain: { flexDirection: 'row', alignItems: 'center' }, no: { width: 28, color: '#78909c', fontSize: 11 }, product: { flex: 1, minWidth: 0, color: '#263238', fontWeight: '800', fontSize: 12 }, qty: { width: 70, textAlign: 'right', color: '#1b5e20', fontWeight: '900', fontSize: 12 }, priceLine: { flexDirection: 'row', justifyContent: 'space-between', marginLeft: 28, marginTop: 5 }, unitPrice: { color: '#607d8b', fontSize: 10 }, subtotal: { color: '#e65100', fontSize: 11, fontWeight: '900' }, itemNote: { marginLeft: 28, marginTop: 4, color: '#8d6e63', fontSize: 9, fontStyle: 'italic' }, invoiceTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1b5e20', padding: 12 }, invoiceTotalLabel: { color: '#c8e6c9', fontSize: 11, fontWeight: '800' }, invoiceTotalValue: { color: '#fff', fontSize: 18, fontWeight: '900' }, waitingText: { color: '#78909c', fontSize: 10, textAlign: 'center', padding: 12 },
});
