import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, SafeAreaView, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
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

export default function AdminOrderDetailScreen() {
  const navigation = useNavigation<DetailNav>();
  const { orderId, type } = useRoute<DetailRoute>().params;
  const token = useUserStore(state => state.token);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    } catch (reason: any) {
      setError(reason?.message || 'Không thể tải chi tiết đơn hàng.');
    } finally {
      setLoading(false);
    }
  }, [orderId, token, type]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

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
  const total = isNormal ? order.totalAmount : order.totalPrice;

  return (
    <SafeAreaView style={s.page}>
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}><Text style={s.backIcon}>‹</Text></TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={s.pageTitle}>Chi tiết đơn hàng</Text><Text style={s.orderCode}>{order.orderCode}</Text></View>
        <View style={[s.badge, { backgroundColor: STATUS_COLORS[order.status] ?? '#607d8b' }]}><Text style={s.badgeText}>{STATUS_LABELS[order.status] ?? order.status}</Text></View>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.customerCard}>
          <Text style={s.sectionTitle}>Thông tin khách hàng</Text>
          <Text style={s.customerName}>👤 {order.userName || 'Chưa có tên khách hàng'}</Text>
          <Text style={s.info}>📞 {order.userPhone || 'Chưa có số điện thoại'}</Text>
          <Text style={s.info}>📧 {order.userEmail || 'Chưa có email'}</Text>
          {order.shippingAddress ? <Text style={s.info}>📍 {order.shippingAddress}</Text> : null}
          <Text style={s.info}>📅 {new Date(order.createdAt).toLocaleString('vi-VN')}</Text>
        </View>

        <View style={s.itemsCard}>
          <Text style={s.sectionTitle}>Sản phẩm đã đặt ({order.items?.length ?? 0})</Text>
          {(order.items ?? []).map((item: any, index: number) => (
            <View key={item.id ?? index} style={s.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.itemName}>{item.productName}</Text>
                <Text style={s.itemMeta}>{isNormal ? `Số lượng: ${item.quantity}` : `Khối lượng: ${item.kg} kg`}</Text>
                {item.note ? <Text style={s.note}>Ghi chú: {item.note}</Text> : null}
              </View>
              <Text style={s.itemPrice}>{money(isNormal ? Number(item.price) * Number(item.quantity) : item.subtotal)}</Text>
            </View>
          ))}
        </View>

        <View style={s.summaryCard}>
          {isNormal ? <View style={s.summaryRow}><Text style={s.summaryLabel}>Thanh toán</Text><Text style={s.summaryValue}>{order.paymentMethod === 'cod' ? 'Khi nhận hàng (COD)' : 'Chuyển khoản'}</Text></View> : null}
          <View style={s.totalRow}><Text style={s.totalLabel}>Tổng thanh toán</Text><Text style={s.totalValue}>{money(total)}</Text></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f4faf4' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loading: { color: '#607d8b', marginTop: 12 }, error: { color: '#c62828', textAlign: 'center', marginBottom: 18 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e0eee0' },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#e8f5e9', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 31, lineHeight: 34, color: '#1b5e20', fontWeight: '500' },
  pageTitle: { fontSize: 19, fontWeight: '900', color: '#1b5e20' }, orderCode: { fontSize: 12, color: '#78909c', marginTop: 2 },
  badge: { borderRadius: 9, paddingHorizontal: 11, paddingVertical: 7 }, badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  content: { width: '100%', maxWidth: 900, alignSelf: 'center', padding: 18, paddingBottom: 42, gap: 16 },
  customerCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, borderLeftWidth: 5, borderLeftColor: '#2e7d32' },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: '#1b5e20', marginBottom: 12 },
  customerName: { fontSize: 15, fontWeight: '800', color: '#263238', marginBottom: 7 }, info: { fontSize: 13, color: '#546e7a', lineHeight: 22 },
  itemsCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18 }, itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#edf4ed' },
  itemName: { fontSize: 14, color: '#263238', fontWeight: '800' }, itemMeta: { fontSize: 12, color: '#78909c', marginTop: 4 }, note: { fontSize: 12, color: '#8d6e63', fontStyle: 'italic', marginTop: 4 }, itemPrice: { fontSize: 14, color: '#e65100', fontWeight: '900' },
  summaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18 }, summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 13 }, summaryLabel: { color: '#607d8b' }, summaryValue: { color: '#263238', fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 2, borderTopColor: '#e8f5e9', paddingTop: 14 }, totalLabel: { fontSize: 15, fontWeight: '800', color: '#37474f' }, totalValue: { fontSize: 20, fontWeight: '900', color: '#e65100' },
  primaryBtn: { backgroundColor: '#2e7d32', borderRadius: 11, paddingHorizontal: 25, paddingVertical: 12 }, primaryText: { color: '#fff', fontWeight: '800' },
  secondaryBtn: { marginTop: 10, padding: 10 }, secondaryText: { color: '#2e7d32', fontWeight: '700' },
});
