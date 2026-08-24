import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Platform, RefreshControl, SafeAreaView, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BASE_URL } from '@/services/api';
import { useUserStore } from '@/store/userStore';
import { RootStackParamList } from '@/navigation/types';

const money = (value: number) => `${value.toLocaleString('vi-VN')}đ`;

export default function StoreInvoiceTotalsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const token = useUserStore(state => state.token);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [periodOffset, setPeriodOffset] = useState(0);

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
    if (!result[key]) result[key] = { key, name: order.userName || 'Chưa có tên quán', email: order.userEmail || '', phone: order.userPhone || '', count: 0, total: 0, orders: [] };
    result[key].count += 1;
    result[key].total += Number(order.totalPrice) || 0;
    result[key].orders.push(order);
    return result;
  }, {})).filter((store: any) => `${store.name} ${store.email} ${store.phone}`.toLowerCase().includes(search.trim().toLowerCase()));

  const grandTotal = stores.reduce((sum: number, store: any) => sum + store.total, 0);
  const latestDate = selectedStore ? new Date(Math.max(...selectedStore.orders.map((order: any) => new Date(order.createdAt).getTime()))) : new Date();
  const periodEnd = new Date(latestDate); periodEnd.setHours(23, 59, 59, 999); periodEnd.setDate(periodEnd.getDate() - periodOffset * 20);
  const periodStart = new Date(periodEnd); periodStart.setHours(0, 0, 0, 0); periodStart.setDate(periodStart.getDate() - 19);
  const periodOrders = selectedStore ? selectedStore.orders.filter((order: any) => { const date = new Date(order.createdAt); return date >= periodStart && date <= periodEnd; }) : [];
  const invoiceRows = [...periodOrders].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const periodTotal = invoiceRows.reduce((sum: number, order: any) => sum + (Number(order.totalPrice) || 0), 0);
  const editInvoice = (orderId: number) => {
    setSelectedStore(null);
    navigation.navigate('AdminOrderDetail', { orderId, type: 'bulk' });
  };
  const printPeriod = async () => {
    if (!selectedStore) return;
    const title = `Đối soát 20 ngày - ${selectedStore.name}`;
    if (Platform.OS === 'web') {
      const popup = window.open('', '_blank', 'width=900,height=700');
      if (!popup) return;
      const rows = invoiceRows.map((order: any, index: number) => `<tr><td>${index + 1}</td><td>${order.orderCode || `#${order.id}`}</td><td>${new Date(order.createdAt).toLocaleString('vi-VN')}</td><td>${money(Number(order.totalPrice) || 0)}</td></tr>`).join('');
      popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>@page{size:A4;margin:15mm}body{font-family:Arial;color:#263238}h1{color:#1b5e20}table{width:100%;border-collapse:collapse}th,td{border:1px solid #607d8b;padding:9px}th{background:#1b5e20;color:#fff}th:last-child,td:last-child{text-align:right}.total{font-size:20px;font-weight:bold;text-align:right;margin-top:18px}</style></head><body><h1>${title}</h1><p>Từ ${periodStart.toLocaleDateString('vi-VN')} đến ${periodEnd.toLocaleDateString('vi-VN')}</p><table><tr><th>STT</th><th>MÃ HÓA ĐƠN</th><th>NGÀY GIỜ</th><th>TỔNG HÓA ĐƠN</th></tr>${rows}</table><div class="total">TỔNG CỘNG ${invoiceRows.length} HÓA ĐƠN: ${money(periodTotal)}</div><script>window.onload=()=>window.print()<\/script></body></html>`);
      popup.document.close(); return;
    }
    await Share.share({ title, message: `${title}\n${periodStart.toLocaleDateString('vi-VN')} - ${periodEnd.toLocaleDateString('vi-VN')}\n\n${invoiceRows.map((order: any) => `${order.orderCode || `#${order.id}`} | ${new Date(order.createdAt).toLocaleString('vi-VN')} | ${money(Number(order.totalPrice) || 0)}`).join('\n')}\n\nTỔNG ${invoiceRows.length} HÓA ĐƠN: ${money(periodTotal)}` });
  };
  return (
    <SafeAreaView style={s.page}>
      <View style={s.header}><Text style={s.title}>🧾 Tổng hóa đơn theo quán</Text><Text style={s.sub}>Dữ liệu từ các đơn hàng lớn</Text></View>
      <TextInput value={search} onChangeText={setSearch} placeholder="Tìm tên quán, email hoặc số điện thoại" style={s.search} />
      {loading ? <ActivityIndicator size="large" color="#2e7d32" style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={s.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
          {error ? <Text style={s.error}>{error}</Text> : null}
          <View style={s.grandCard}><Text style={s.grandLabel}>TỔNG TẤT CẢ QUÁN</Text><Text style={s.grandValue}>{money(grandTotal)}</Text></View>
          {stores.map((store: any) => <TouchableOpacity key={store.key} style={s.card} onPress={() => navigation.navigate('StoreInvoiceStatement', { storeKey: store.key, storeName: store.name })}>
            <Text style={s.storeName}>🏪 {store.name}</Text>
            {store.email ? <Text style={s.meta}>📧 {store.email}</Text> : null}
            {store.phone ? <Text style={s.meta}>📞 {store.phone}</Text> : null}
            <View style={s.row}><Text style={s.count}>{store.count} hóa đơn</Text><Text style={s.total}>{money(store.total)}</Text></View>
            <Text style={s.openHint}>Nhấn để xem tổng theo ngày và in chu kỳ 20 ngày →</Text>
          </TouchableOpacity>)}
          {!error && stores.length === 0 ? <Text style={s.empty}>Chưa có hóa đơn phù hợp.</Text> : null}
        </ScrollView>
      )}
      <Modal visible={!!selectedStore} transparent animationType="slide" onRequestClose={() => setSelectedStore(null)}>
        <View style={s.overlay}><View style={s.modal}>
          <View style={s.modalHeader}><View style={{ flex: 1 }}><Text style={s.modalTitle}>🏪 {selectedStore?.name}</Text><Text style={s.periodLabel}>{periodStart.toLocaleDateString('vi-VN')} — {periodEnd.toLocaleDateString('vi-VN')}</Text></View><TouchableOpacity onPress={() => setSelectedStore(null)}><Text style={s.close}>✕</Text></TouchableOpacity></View>
          <View style={s.periodNav}><TouchableOpacity style={s.navBtn} onPress={() => setPeriodOffset(value => value + 1)}><Text style={s.navText}>‹ 20 ngày trước</Text></TouchableOpacity><TouchableOpacity disabled={periodOffset === 0} style={[s.navBtn, periodOffset === 0 && { opacity: 0.35 }]} onPress={() => setPeriodOffset(value => Math.max(0, value - 1))}><Text style={s.navText}>20 ngày sau ›</Text></TouchableOpacity></View>
          <View style={s.excelHead}><Text style={s.colCode}>MÃ HÓA ĐƠN</Text><Text style={s.colDate}>NGÀY GIỜ</Text><Text style={s.colMoney}>TỔNG TIỀN</Text><Text style={s.colEdit}>SỬA</Text></View>
          <ScrollView style={{ maxHeight: 360 }}>{invoiceRows.map((order: any) => <View key={order.id} style={s.excelRow}><Text style={s.colCodeValue}>{order.orderCode || `#${order.id}`}</Text><Text style={s.colDateValue}>{new Date(order.createdAt).toLocaleString('vi-VN')}</Text><Text style={s.colMoneyValue}>{money(Number(order.totalPrice) || 0)}</Text><TouchableOpacity style={s.editBtn} onPress={() => editInvoice(Number(order.id))}><Text style={s.editText}>Sửa</Text></TouchableOpacity></View>)}{invoiceRows.length === 0 ? <Text style={s.emptyPeriod}>Chu kỳ này chưa có hóa đơn.</Text> : null}</ScrollView>
          <View style={s.periodTotal}><View><Text style={s.periodTotalLabel}>TỔNG CỘNG CHU KỲ 20 NGÀY</Text><Text style={s.invoiceCount}>{invoiceRows.length} hóa đơn</Text></View><Text style={s.periodTotalValue}>{money(periodTotal)}</Text></View>
          <TouchableOpacity style={s.printBtn} onPress={printPeriod}><Text style={s.printText}>🖨️ In bảng đối soát 20 ngày</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f4faf4' }, header: { backgroundColor: '#1b5e20', padding: 18 }, title: { color: '#fff', fontSize: 20, fontWeight: '900' }, sub: { color: '#a5d6a7', marginTop: 4 },
  search: { margin: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#c8e6c9', borderRadius: 12, padding: 12, outlineStyle: 'none' } as any,
  list: { padding: 12, paddingBottom: 40, gap: 11 }, grandCard: { backgroundColor: '#fff3e0', borderRadius: 15, padding: 17, borderLeftWidth: 5, borderLeftColor: '#ef6c00' }, grandLabel: { color: '#bf360c', fontSize: 11, fontWeight: '900' }, grandValue: { color: '#e65100', fontSize: 25, fontWeight: '900', marginTop: 5 },
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 16, borderWidth: 1, borderColor: '#e0eee0' }, storeName: { color: '#1b5e20', fontSize: 17, fontWeight: '900' }, meta: { color: '#78909c', fontSize: 12, marginTop: 4 }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e8f5e9', paddingTop: 11, marginTop: 11 }, count: { color: '#607d8b', fontWeight: '700' }, total: { color: '#e65100', fontSize: 18, fontWeight: '900' }, error: { color: '#c62828', textAlign: 'center' }, empty: { color: '#78909c', textAlign: 'center', marginTop: 30 }, openHint: { color: '#558b2f', fontSize: 11, marginTop: 10, textAlign: 'right', fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', alignItems: 'center', justifyContent: 'center', padding: 14 }, modal: { width: '100%', maxWidth: 720, maxHeight: '92%', backgroundColor: '#fff', borderRadius: 18, padding: 17 }, modalHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 13 }, modalTitle: { color: '#1b5e20', fontSize: 20, fontWeight: '900' }, periodLabel: { color: '#78909c', marginTop: 4 }, close: { fontSize: 22, color: '#78909c', padding: 5 }, periodNav: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }, navBtn: { backgroundColor: '#e8f5e9', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 }, navText: { color: '#1b5e20', fontWeight: '800', fontSize: 12 }, excelHead: { flexDirection: 'row', backgroundColor: '#1b5e20', padding: 10 }, excelRow: { flexDirection: 'row', borderWidth: 1, borderTopWidth: 0, borderColor: '#c8e6c9', padding: 10 }, colDate: { flex: 1, color: '#fff', fontWeight: '800' }, colCount: { width: 120, textAlign: 'center', color: '#fff', fontWeight: '800' }, colMoney: { width: 150, textAlign: 'right', color: '#fff', fontWeight: '800' }, colDateValue: { flex: 1, color: '#263238', fontWeight: '700' }, colCountValue: { width: 120, textAlign: 'center', color: '#455a64', fontWeight: '700' }, colMoneyValue: { width: 150, textAlign: 'right', color: '#e65100', fontWeight: '900' }, emptyPeriod: { textAlign: 'center', color: '#78909c', padding: 25 }, periodTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff3e0', padding: 14, marginTop: 12, borderRadius: 10 }, periodTotalLabel: { color: '#bf360c', fontWeight: '900' }, periodTotalValue: { color: '#e65100', fontSize: 21, fontWeight: '900' }, printBtn: { backgroundColor: '#2e7d32', borderRadius: 11, padding: 13, alignItems: 'center', marginTop: 12 }, printText: { color: '#fff', fontWeight: '900' },
  colCode: { width: 135, color: '#fff', fontWeight: '800' },
  colCodeValue: { width: 135, color: '#1b5e20', fontWeight: '900' },
  colEdit: { width: 60, textAlign: 'center', color: '#fff', fontWeight: '800' },
  editBtn: { width: 60, backgroundColor: '#e8f5e9', borderRadius: 7, paddingVertical: 5, alignItems: 'center' },
  editText: { color: '#1b5e20', fontWeight: '900', fontSize: 12 },
  invoiceCount: { color: '#8d6e63', fontSize: 11, marginTop: 3, fontWeight: '700' },
});
