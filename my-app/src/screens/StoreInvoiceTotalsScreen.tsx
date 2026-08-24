import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BASE_URL } from '@/services/api';
import { useUserStore } from '@/store/userStore';

const money = (value: number) => `${value.toLocaleString('vi-VN')}đ`;

export default function StoreInvoiceTotalsScreen() {
  const token = useUserStore(state => state.token);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError('');
      const response = await fetch(`${BASE_URL}/admin/bulk-orders`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Không thể tải hóa đơn.');
      setOrders(payload.orders ?? []);
    } catch (reason: any) { setError(reason?.message || 'Không thể tải hóa đơn.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const stores = Object.values(orders.reduce<Record<string, any>>((result, order) => {
    const key = order.userEmail || order.userName || `store-${order.userId}`;
    if (!result[key]) result[key] = { key, name: order.userName || 'Chưa có tên quán', email: order.userEmail || '', phone: order.userPhone || '', count: 0, total: 0 };
    result[key].count += 1;
    result[key].total += Number(order.totalPrice) || 0;
    return result;
  }, {})).filter((store: any) => `${store.name} ${store.email} ${store.phone}`.toLowerCase().includes(search.trim().toLowerCase()));

  const grandTotal = stores.reduce((sum: number, store: any) => sum + store.total, 0);
  return (
    <SafeAreaView style={s.page}>
      <View style={s.header}><Text style={s.title}>🧾 Tổng hóa đơn theo quán</Text><Text style={s.sub}>Dữ liệu từ các đơn hàng lớn</Text></View>
      <TextInput value={search} onChangeText={setSearch} placeholder="Tìm tên quán, email hoặc số điện thoại" style={s.search} />
      {loading ? <ActivityIndicator size="large" color="#2e7d32" style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={s.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
          {error ? <Text style={s.error}>{error}</Text> : null}
          <View style={s.grandCard}><Text style={s.grandLabel}>TỔNG TẤT CẢ QUÁN</Text><Text style={s.grandValue}>{money(grandTotal)}</Text></View>
          {stores.map((store: any) => <View key={store.key} style={s.card}>
            <Text style={s.storeName}>🏪 {store.name}</Text>
            {store.email ? <Text style={s.meta}>📧 {store.email}</Text> : null}
            {store.phone ? <Text style={s.meta}>📞 {store.phone}</Text> : null}
            <View style={s.row}><Text style={s.count}>{store.count} hóa đơn</Text><Text style={s.total}>{money(store.total)}</Text></View>
          </View>)}
          {!error && stores.length === 0 ? <Text style={s.empty}>Chưa có hóa đơn phù hợp.</Text> : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f4faf4' }, header: { backgroundColor: '#1b5e20', padding: 18 }, title: { color: '#fff', fontSize: 20, fontWeight: '900' }, sub: { color: '#a5d6a7', marginTop: 4 },
  search: { margin: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#c8e6c9', borderRadius: 12, padding: 12, outlineStyle: 'none' } as any,
  list: { padding: 12, paddingBottom: 40, gap: 11 }, grandCard: { backgroundColor: '#fff3e0', borderRadius: 15, padding: 17, borderLeftWidth: 5, borderLeftColor: '#ef6c00' }, grandLabel: { color: '#bf360c', fontSize: 11, fontWeight: '900' }, grandValue: { color: '#e65100', fontSize: 25, fontWeight: '900', marginTop: 5 },
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 16, borderWidth: 1, borderColor: '#e0eee0' }, storeName: { color: '#1b5e20', fontSize: 17, fontWeight: '900' }, meta: { color: '#78909c', fontSize: 12, marginTop: 4 }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e8f5e9', paddingTop: 11, marginTop: 11 }, count: { color: '#607d8b', fontWeight: '700' }, total: { color: '#e65100', fontSize: 18, fontWeight: '900' }, error: { color: '#c62828', textAlign: 'center' }, empty: { color: '#78909c', textAlign: 'center', marginTop: 30 },
});
