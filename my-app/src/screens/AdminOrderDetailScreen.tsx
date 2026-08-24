import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, SafeAreaView, ScrollView, StyleSheet,
  Alert, Platform, Share, Text, TouchableOpacity, useWindowDimensions, View,
  TextInput,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '@/navigation/types';
import { BASE_URL } from '@/services/api';
import { useUserStore } from '@/store/userStore';

type DetailRoute = RouteProp<RootStackParamList, 'AdminOrderDetail'>;
type DetailNav = NativeStackNavigationProp<RootStackParamList, 'AdminOrderDetail'>;

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', preparing: 'Đang chuẩn bị',
  on_the_way: 'Đang giao', delivering: 'Đang giao', delivered: 'Đã giao', cancelled: 'Đã hủy',
};
const STATUS_COLORS: Record<string, string> = {
  pending: '#f57c00', confirmed: '#1976d2', preparing: '#7b1fa2',
  on_the_way: '#0097a7', delivering: '#0097a7', delivered: '#2e7d32', cancelled: '#c62828',
};
const money = (value: unknown) => `${Number(value ?? 0).toLocaleString('vi-VN')}đ`;
const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

export default function AdminOrderDetailScreen() {
  const navigation = useNavigation<DetailNav>();
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const { orderId, type } = useRoute<DetailRoute>().params;
  const token = useUserStore(state => state.token);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [bulkView, setBulkView] = useState<'packing' | 'pricing'>('packing');

  const loadOrder = useCallback(async () => {
    if (!token) {
      setError('Phiên đăng nhập admin đã hết hạn.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const url = type === 'normal'
        ? `${BASE_URL}/admin/orders/${orderId}`
        : `${BASE_URL}/admin/bulk-orders`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Không thể tải chi tiết đơn hàng.');
      const found = type === 'normal'
        ? payload.order
        : (payload.orders ?? []).find((item: any) => Number(item.id) === Number(orderId));
      if (!found) throw new Error('Không tìm thấy đơn hàng.');
      setOrder(found);
      if (type === 'bulk') {
        setPriceInputs(Object.fromEntries((found.items ?? []).map((item: any) => [
          String(item.id), Number(item.pricePerKg) > 0 ? String(Number(item.pricePerKg)) : '',
        ])));
      }
    } catch (reason: any) {
      setError(reason?.message || 'Không thể tải chi tiết đơn hàng.');
    } finally {
      setLoading(false);
    }
  }, [orderId, token, type]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  const updateBulkStatus = async (status: string) => {
    if (!token || type !== 'bulk') return;
    try {
      setSaving(true); setError('');
      const response = await fetch(`${BASE_URL}/admin/bulk-orders/${orderId}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Cập nhật trạng thái thất bại.');
      setOrder((current: any) => ({ ...current, status }));
    } catch (reason: any) { setError(reason.message); }
    finally { setSaving(false); }
  };

  const saveBulkPricing = async () => {
    if (!token || type !== 'bulk') return;
    const items = (order.items ?? []).map((item: any) => ({
      id: item.id,
      pricePerKg: Number(String(priceInputs[String(item.id)] ?? '').replace(/[^\d]/g, '')),
    }));
    if (items.some((item: any) => !Number.isFinite(item.pricePerKg) || item.pricePerKg <= 0)) {
      Alert.alert('Thiếu đơn giá', 'Vui lòng nhập đơn giá lớn hơn 0 cho tất cả sản phẩm.');
      return;
    }
    try {
      setSaving(true); setError('');
      const response = await fetch(`${BASE_URL}/admin/bulk-orders/${orderId}/pricing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Không thể lưu đơn giá.');
      setOrder(payload.order);
      Alert.alert('Thành công', `Đã tính tổng hóa đơn: ${money(payload.order.totalPrice)}`);
    } catch (reason: any) { setError(reason?.message || 'Không thể lưu đơn giá.'); }
    finally { setSaving(false); }
  };

  const printOrder = async () => {
    const isNormalOrder = type === 'normal';
    if (!isNormalOrder && (order.items ?? []).some((item: any) => Number(item.pricePerKg) <= 0)) {
      Alert.alert('Chưa thể in', 'Vui lòng nhập và lưu đơn giá cho tất cả sản phẩm.');
      return;
    }
    const rows = (order.items ?? []).map((item: any, index: number) => `
      <tr><td>${index + 1}</td><td>${escapeHtml(item.productName)}</td><td>${escapeHtml(isNormalOrder ? item.quantity : `${item.kg} kg`)}</td><td>${money(isNormalOrder ? item.price : item.pricePerKg)}</td><td>${money(isNormalOrder ? Number(item.price) * Number(item.quantity) : Number(item.kg) * Number(item.pricePerKg))}</td></tr>
      ${item.note ? `<tr class="note"><td></td><td colspan="4">Ghi chú: ${escapeHtml(item.note)}</td></tr>` : ''}
    `).join('');
    const title = isNormalOrder ? `Đơn hàng ${order.orderCode}` : `Hóa đơn sỉ - ${order.userName || 'Cửa hàng'}`;

    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank', 'width=980,height=760');
      if (!printWindow) { Alert.alert('Không thể in', 'Vui lòng cho phép trình duyệt mở cửa sổ mới.'); return; }
      printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
        @page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1f2937;margin:0}h1{color:#1b5e20;margin:0 0 6px;font-size:24px}.sub{color:#64748b;margin-bottom:20px}.info{border:1px solid #9ca3af;padding:12px;margin-bottom:16px;line-height:1.8}.status{font-weight:700;color:#1b5e20}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#2e7d32;color:#fff;text-align:left}th,td{border:1px solid #6b7280;padding:8px}th:first-child,td:first-child{width:45px;text-align:center}th:nth-child(3),td:nth-child(3){width:95px;text-align:center;font-weight:700}th:nth-child(4),td:nth-child(4),th:nth-child(5),td:nth-child(5){width:120px;text-align:right}tr:nth-child(even){background:#f1f8e9}.note td{font-size:11px;font-style:italic;color:#6b7280;background:#fff}.total{margin-top:16px;text-align:right;font-size:18px;font-weight:800}.footer{margin-top:22px;color:#64748b;font-size:11px;text-align:center}@media print{button{display:none}}
      </style></head><body><h1>🥦 FreshVeggies</h1><div class="sub">${escapeHtml(title)}</div><div class="info"><b>${isNormalOrder ? 'Khách hàng' : 'Cửa hàng'}:</b> ${escapeHtml(order.userName)}<br>${isNormalOrder ? `<b>Số điện thoại:</b> ${escapeHtml(order.userPhone)}<br><b>Địa chỉ:</b> ${escapeHtml(order.shippingAddress)}<br>` : ''}<b>Ngày đặt:</b> ${escapeHtml(new Date(order.createdAt).toLocaleString('vi-VN'))}<br><b>Trạng thái:</b> <span class="status">${escapeHtml(STATUS_LABELS[order.status] || order.status)}</span></div><table><thead><tr><th>STT</th><th>SẢN PHẨM</th><th>SỐ KG</th><th>ĐƠN GIÁ/KG</th><th>THÀNH TIỀN</th></tr></thead><tbody>${rows}</tbody></table><div class="total">TỔNG TIỀN: ${money(isNormalOrder ? order.totalAmount : order.totalPrice)}</div><div class="footer">Bản in từ hệ thống quản lý FreshVeggies</div><script>window.onload=()=>{window.print()}<\/script></body></html>`);
      printWindow.document.close();
      return;
    }

    const textRows = (order.items ?? []).map((item: any, i: number) => {
      const quantity = isNormalOrder ? item.quantity : `${item.kg} kg`;
      const priceText = ` × ${money(isNormalOrder ? item.price : item.pricePerKg)} = ${money(isNormalOrder ? Number(item.quantity) * Number(item.price) : Number(item.kg) * Number(item.pricePerKg))}`;
      return `${i + 1}. ${item.productName} - ${quantity}${priceText}`;
    }).join('\n');
    const totalText = `\n\nTỔNG TIỀN: ${money(isNormalOrder ? order.totalAmount : order.totalPrice)}`;
    await Share.share({ title, message: `${title}\n${isNormalOrder ? 'Khách hàng' : 'Cửa hàng'}: ${order.userName || ''}\nNgày: ${new Date(order.createdAt).toLocaleString('vi-VN')}\n\n${textRows}${totalText}` });
  };

  if (loading) {
    return <SafeAreaView style={s.page}><View style={s.center}><ActivityIndicator size="large" color="#2e7d32"/><Text style={s.loading}>Đang tải chi tiết đơn hàng...</Text></View></SafeAreaView>;
  }
  if (!order) {
    return (
      <SafeAreaView style={s.page}><View style={s.center}>
        <Text style={s.error}>{error}</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={loadOrder}><Text style={s.primaryText}>Thử lại</Text></TouchableOpacity>
        <TouchableOpacity style={s.secondaryBtn} onPress={() => navigation.goBack()}><Text style={s.secondaryText}>Quay lại</Text></TouchableOpacity>
      </View></SafeAreaView>
    );
  }

  const isNormal = type === 'normal';
  const total = order.totalAmount;

  return (
    <SafeAreaView style={s.page}>
      <View style={[s.topBar, isMobile && s.topBarMobile]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}><Text style={s.backIcon}>‹</Text></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.pageTitle}>{isNormal ? 'Chi tiết đơn hàng' : 'Chi tiết đơn sỉ'}</Text>
          <Text style={isNormal ? s.orderCode : s.headerStoreName}>
            {isNormal ? order.orderCode : `🏪 ${order.userName || 'Chưa có tên cửa hàng'}`}
          </Text>
        </View>
        {isNormal ? (
          <TouchableOpacity style={[s.printBtn, isMobile && s.printBtnMobile]} onPress={printOrder}><Text style={s.printBtnText}>🖨️ In đơn</Text></TouchableOpacity>
        ) : (
          <TouchableOpacity style={[s.invoicePrintBtn, isMobile && s.printBtnMobile]} onPress={printOrder}><Text style={s.invoicePrintText}>🧾y {isMobile ? 'In hóa đơn' : 'In hóa đơn có giá'}</Text></TouchableOpacity>
        )}
        <View style={[s.badge, isMobile && s.badgeMobile, { backgroundColor: STATUS_COLORS[order.status] ?? '#607d8b' }]}><Text style={s.badgeText}>{STATUS_LABELS[order.status] ?? order.status}</Text></View>
      </View>

      <ScrollView contentContainerStyle={[s.content, isMobile && s.contentMobile]}>
        {isNormal ? (
          <View style={[s.customerCard, isMobile && s.cardMobile]}>
            <Text style={s.sectionTitle}>Thông tin khách hàng</Text>
            <Text style={s.customerName}>👤 {order.userName || 'Chưa có tên khách hàng'}</Text>
            <Text style={s.info}>📞 {order.userPhone || 'Chưa có số điện thoại'}</Text>
            <Text style={s.info}>📧 {order.userEmail || 'Chưa có email'}</Text>
            {order.shippingAddress ? <Text style={s.info}>📍 {order.shippingAddress}</Text> : null}
            <Text style={s.info}>📅 {new Date(order.createdAt).toLocaleString('vi-VN')}</Text>
          </View>
        ) : (
          <View style={[s.storeCard, isMobile && s.cardMobile]}>
            <Text style={s.storeCardLabel}>CỬA HÀNG ĐẶT ĐƠN</Text>
            <Text style={s.storeCardName}>🏪 {order.userName || 'Chưa có tên cửa hàng'}</Text>
          </View>
        )}

        {!isNormal ? <View style={s.viewTabs}>
          <TouchableOpacity style={[s.viewTab, bulkView === 'packing' && s.viewTabActive]} onPress={() => setBulkView('packing')}><Text style={[s.viewTabText, bulkView === 'packing' && s.viewTabTextActive]}>📦 Bảng đóng hàng</Text></TouchableOpacity>
          <TouchableOpacity style={[s.viewTab, bulkView === 'pricing' && s.viewTabActive]} onPress={() => setBulkView('pricing')}><Text style={[s.viewTabText, bulkView === 'pricing' && s.viewTabTextActive]}>🧮 Tính giá & hóa đơn</Text></TouchableOpacity>
        </View> : null}

        <View style={[s.itemsCard, !isNormal && s.excelCard, isMobile && s.cardMobile]}>
          <Text style={s.sectionTitle}>{!isNormal && bulkView === 'packing' ? 'Danh sách đóng hàng' : 'Sản phẩm đã đặt'} ({order.items?.length ?? 0})</Text>
          {!isNormal ? <View style={s.excelHead}><Text style={s.excelNo}>STT</Text><Text style={s.excelProduct}>SẢN PHẨM</Text><Text style={s.excelQty}>{bulkView === 'packing' ? 'SỐ KG' : 'KG × ĐƠN GIÁ'}</Text>{bulkView === 'packing' ? <Text style={s.excelNote}>GHI CHÚ</Text> : null}</View> : null}
          {(order.items ?? []).map((item: any, index: number) => (
            <View key={item.id ?? index} style={[isNormal ? s.itemRow : s.bulkItemRow, !isNormal && index % 2 === 1 && s.excelRowAlt, isMobile && s.itemRowMobile]}>
              {!isNormal ? <Text style={s.excelNo}>{index + 1}</Text> : null}
              <View style={{ flex: 1 }}>
                <Text style={isNormal ? s.itemName : s.bulkItemName}>{item.productName}</Text>
                {isNormal ? <Text style={s.itemMeta}>Số lượng: {item.quantity}</Text> : null}
                {isNormal && item.note ? <Text style={s.note}>Ghi chú: {item.note}</Text> : null}
              </View>
              {isNormal ? <Text style={s.itemPrice}>{money(Number(item.price) * Number(item.quantity))}</Text> : null}
              {!isNormal ? (
                bulkView === 'pricing' ? <View style={s.pricingBox}>
                  <Text style={s.formulaKg}>{item.kg} kg ×</Text>
                  <TextInput
                    value={priceInputs[String(item.id)] ?? ''}
                    onChangeText={value => setPriceInputs(current => ({ ...current, [String(item.id)]: value.replace(/[^\d]/g, '') }))}
                    placeholder="Đơn giá/kg"
                    keyboardType="numeric"
                    style={s.priceInput}
                  />
                  <Text style={s.lineSubtotal}>= {money(Number(item.kg) * Number(priceInputs[String(item.id)] || 0))}</Text>
                </View> : <><Text style={s.packingKg}>{item.kg} kg</Text><Text style={s.packingNote}>{item.note || '—'}</Text></>
              ) : null}
            </View>
          ))}
        </View>

        {isNormal ? (
          <View style={[s.summaryCard, isMobile && s.cardMobile]}>
            <View style={[s.summaryRow, isMobile && s.summaryRowMobile]}><Text style={s.summaryLabel}>Thanh toán</Text><Text style={s.summaryValue}>{order.paymentMethod === 'cod' ? 'Khi nhận hàng (COD)' : 'Chuyển khoản'}</Text></View>
            <View style={[s.totalRow, isMobile && s.summaryRowMobile]}><Text style={s.totalLabel}>Tổng thanh toán</Text><Text style={s.totalValue}>{money(total)}</Text></View>
          </View>
        ) : (
          <>
          {bulkView === 'pricing' ? <View style={[s.summaryCard, isMobile && s.cardMobile]}>
            <TouchableOpacity disabled={saving} style={[s.calculateBtn, saving && { opacity: 0.6 }]} onPress={saveBulkPricing}>
              <Text style={s.calculateBtnText}>{saving ? 'Đang lưu...' : '🧮 Lưu đơn giá & tính tổng'}</Text>
            </TouchableOpacity>
            <View style={s.totalRow}><Text style={s.totalLabel}>Tổng hóa đơn</Text><Text style={s.totalValue}>{money(order.totalPrice)}</Text></View>
            <Text style={s.printHint}>Nhập đủ đơn giá và lưu trước khi in hóa đơn.</Text>
          </View> : null}
          <View style={[s.statusCard, isMobile && s.cardMobile]}>
            <Text style={s.sectionTitle}>Cập nhật trạng thái đơn sỉ</Text>
            {error ? <Text style={s.inlineError}>{error}</Text> : null}
            <View style={s.statusButtons}>
              {[['pending','Chờ xác nhận'],['confirmed','Đã xác nhận'],['delivering','Đang giao'],['delivered','Đã giao'],['cancelled','Đã hủy']].map(([value, label]) => (
                <TouchableOpacity key={value} disabled={saving} onPress={() => updateBulkStatus(value)} style={[s.statusBtn, order.status === value && { backgroundColor: STATUS_COLORS[value], borderColor: STATUS_COLORS[value] }]}>
                  <Text style={[s.statusBtnText, order.status === value && { color: '#fff' }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f4faf4' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loading: { color: '#607d8b', marginTop: 12 }, error: { color: '#c62828', textAlign: 'center', marginBottom: 18 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e0eee0' },
  topBarMobile: { paddingHorizontal: 10, paddingVertical: 10, gap: 8 },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#e8f5e9', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 31, lineHeight: 34, color: '#1b5e20', fontWeight: '500' },
  pageTitle: { fontSize: 19, fontWeight: '900', color: '#1b5e20' }, orderCode: { fontSize: 12, color: '#78909c', marginTop: 2 },
  headerStoreName: { fontSize: 14, color: '#2e7d32', fontWeight: '800', marginTop: 2 },
  printBtn: { backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#81c784', borderRadius: 9, paddingHorizontal: 13, paddingVertical: 8 },
  printBtnMobile: { paddingHorizontal: 9, paddingVertical: 7 },
  printBtnText: { color: '#1b5e20', fontWeight: '900', fontSize: 12 },
  printActions: { flexDirection: 'row', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' },
  invoicePrintBtn: { backgroundColor: '#2e7d32', borderRadius: 9, paddingHorizontal: 13, paddingVertical: 9 },
  invoicePrintText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  badge: { borderRadius: 9, paddingHorizontal: 11, paddingVertical: 7 }, badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  badgeMobile: { paddingHorizontal: 8, paddingVertical: 6 },
  content: { width: '100%', maxWidth: 900, alignSelf: 'center', padding: 18, paddingBottom: 42, gap: 16 },
  contentMobile: { padding: 10, paddingBottom: 30, gap: 10 },
  cardMobile: { borderRadius: 12, padding: 13 },
  customerCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, borderLeftWidth: 5, borderLeftColor: '#2e7d32' },
  storeCard: { backgroundColor: '#e8f5e9', borderRadius: 16, padding: 18, borderLeftWidth: 5, borderLeftColor: '#2e7d32' },
  storeCardLabel: { fontSize: 10, color: '#558b2f', fontWeight: '900', letterSpacing: 0.9, marginBottom: 6 },
  storeCardName: { fontSize: 22, color: '#1b5e20', fontWeight: '900' },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: '#1b5e20', marginBottom: 12 },
  customerName: { fontSize: 15, fontWeight: '800', color: '#263238', marginBottom: 7 }, info: { fontSize: 13, color: '#546e7a', lineHeight: 22 },
  itemsCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18 }, itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#edf4ed' },
  excelCard: { borderRadius: 2, borderWidth: 1, borderColor: '#78909c', padding: 12 },
  viewTabs: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 13, padding: 5, gap: 5 },
  viewTab: { flex: 1, borderRadius: 9, paddingVertical: 11, alignItems: 'center' }, viewTabActive: { backgroundColor: '#1b5e20' },
  viewTabText: { color: '#607d8b', fontWeight: '800', fontSize: 13 }, viewTabTextActive: { color: '#fff' },
  excelHead: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2e7d32', paddingVertical: 10, paddingHorizontal: 8, borderWidth: 1, borderColor: '#1b5e20' },
  excelNo: { width: 44, textAlign: 'center', fontWeight: '800', color: '#607d8b' },
  excelProduct: { flex: 1, color: '#fff', fontWeight: '900', fontSize: 11 },
  excelQty: { width: 110, textAlign: 'center', color: '#fff', fontWeight: '900', fontSize: 11 },
  excelNote: { width: 180, textAlign: 'center', color: '#fff', fontWeight: '900', fontSize: 11 },
  bulkItemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 58, paddingVertical: 10, paddingHorizontal: 8, borderWidth: 1, borderTopWidth: 0, borderColor: '#78909c' },
  excelRowAlt: { backgroundColor: '#eef7ee' },
  itemRowMobile: { alignItems: 'flex-start', gap: 7 },
  itemName: { fontSize: 14, color: '#263238', fontWeight: '800' }, bulkItemName: { fontSize: 19, lineHeight: 25, color: '#263238', fontWeight: '900' }, itemMeta: { fontSize: 12, color: '#78909c', marginTop: 4 }, note: { fontSize: 12, color: '#8d6e63', fontStyle: 'italic', marginTop: 4 }, itemPrice: { fontSize: 14, color: '#e65100', fontWeight: '900' },
  quantityBox: { minWidth: 92, backgroundColor: '#e8f5e9', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 9, alignItems: 'center' },
  quantityLabel: { fontSize: 9, color: '#558b2f', fontWeight: '900', letterSpacing: 0.7 },
  quantityValue: { fontSize: 27, lineHeight: 32, color: '#1b5e20', fontWeight: '900' },
  pricingBox: { width: 230, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  formulaKg: { color: '#1b5e20', fontSize: 13, fontWeight: '900' },
  priceInput: { width: 105, borderWidth: 1, borderColor: '#81c784', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7, textAlign: 'right', color: '#263238', outlineStyle: 'none' } as any,
  lineSubtotal: { width: '100%', textAlign: 'right', color: '#e65100', fontSize: 13, fontWeight: '900' },
  packingKg: { width: 110, textAlign: 'center', color: '#1b5e20', fontSize: 18, fontWeight: '900' },
  packingNote: { width: 180, color: '#6d4c41', fontSize: 12, paddingHorizontal: 8 },
  calculateBtn: { backgroundColor: '#2e7d32', borderRadius: 11, paddingVertical: 12, alignItems: 'center', marginBottom: 13 },
  calculateBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  printHint: { color: '#78909c', fontSize: 11, textAlign: 'right', marginTop: 8 },
  statusCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18 }, statusButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, statusBtn: { borderWidth: 1, borderColor: '#a5d6a7', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10 }, statusBtnText: { color: '#2e7d32', fontWeight: '800', fontSize: 12 }, inlineError: { color: '#c62828', marginBottom: 10 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18 }, summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 13 }, summaryLabel: { color: '#607d8b' }, summaryValue: { color: '#263238', fontWeight: '700' },
  summaryRowMobile: { gap: 12, flexWrap: 'wrap' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 2, borderTopColor: '#e8f5e9', paddingTop: 14 }, totalLabel: { fontSize: 15, fontWeight: '800', color: '#37474f' }, totalValue: { fontSize: 20, fontWeight: '900', color: '#e65100' },
  primaryBtn: { backgroundColor: '#2e7d32', borderRadius: 11, paddingHorizontal: 25, paddingVertical: 12 }, primaryText: { color: '#fff', fontWeight: '800' },
  secondaryBtn: { marginTop: 10, padding: 10 }, secondaryText: { color: '#2e7d32', fontWeight: '700' },
});
