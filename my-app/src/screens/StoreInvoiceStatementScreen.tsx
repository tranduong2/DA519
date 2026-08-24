import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, SafeAreaView, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '@/navigation/types';
import { BASE_URL } from '@/services/api';
import { useUserStore } from '@/store/userStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'StoreInvoiceStatement'>;
type ScreenRoute = RouteProp<RootStackParamList, 'StoreInvoiceStatement'>;
const money = (value: unknown) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const storeKeyOf = (order: any) => order.userEmail || order.userName || `store-${order.userId}`;

export default function StoreInvoiceStatementScreen() {
  const navigation = useNavigation<Nav>();
  const { storeKey, storeName } = useRoute<ScreenRoute>().params;
  const token = useUserStore(state => state.token);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [periodOffset, setPeriodOffset] = useState(0);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${BASE_URL}/admin/bulk-orders`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Không thể tải hóa đơn.');
      setOrders((payload.orders ?? []).filter((order: any) => storeKeyOf(order) === storeKey));
    } catch (reason: any) { Alert.alert('Lỗi', reason?.message || 'Không thể tải hóa đơn.'); }
    finally { setLoading(false); }
  }, [storeKey, token]);
  useEffect(() => { load(); }, [load]);

  const latestDate = useMemo(() => orders.length ? new Date(Math.max(...orders.map(order => new Date(order.createdAt).getTime()))) : new Date(), [orders]);
  const periodEnd = new Date(latestDate); periodEnd.setHours(23, 59, 59, 999); periodEnd.setDate(periodEnd.getDate() - periodOffset * 20);
  const periodStart = new Date(periodEnd); periodStart.setHours(0, 0, 0, 0); periodStart.setDate(periodStart.getDate() - 19);
  const visibleOrders = orders.filter(order => { const date = new Date(order.createdAt); return date >= periodStart && date <= periodEnd; }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const grandTotal = visibleOrders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);

  const openInvoice = (order: any) => {
    setExpandedId(current => current === Number(order.id) ? null : Number(order.id));
    setPrices(current => ({ ...current, ...Object.fromEntries((order.items ?? []).map((item: any) => [`${order.id}-${item.id}`, Number(item.pricePerKg) > 0 ? String(Number(item.pricePerKg)) : '']) ) }));
  };
  const saveInvoice = async (order: any) => {
    const items = (order.items ?? []).map((item: any) => ({ id: item.id, pricePerKg: Number(prices[`${order.id}-${item.id}`] || 0) }));
    if (items.some((item: { id: number; pricePerKg: number }) => item.pricePerKg <= 0)) return Alert.alert('Thiếu đơn giá', 'Vui lòng nhập đủ đơn giá.');
    try {
      setSavingId(Number(order.id));
      const response = await fetch(`${BASE_URL}/admin/bulk-orders/${order.id}/pricing`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ items }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Không thể lưu hóa đơn.');
      setOrders(current => current.map(item => Number(item.id) === Number(order.id) ? payload.order : item));
      Alert.alert('Thành công', `Tổng hóa đơn mới: ${money(payload.order.totalPrice)}`);
    } catch (reason: any) { Alert.alert('Lỗi', reason?.message || 'Không thể lưu.'); }
    finally { setSavingId(null); }
  };

  const printStatement = async () => {
    const title = `Đối soát 20 ngày - ${storeName}`;
    const rows = visibleOrders.map((order, index) => `<tr><td>${index + 1}</td><td>${order.orderCode || `#${order.id}`}</td><td>${new Date(order.createdAt).toLocaleString('vi-VN')}</td><td>${money(order.totalPrice)}</td></tr>`).join('');
    if (Platform.OS === 'web') { const popup = window.open('', '_blank'); if (!popup) return; popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>@page{size:A4;margin:15mm}body{font-family:Arial}h1{color:#1b5e20}table{width:100%;border-collapse:collapse}th,td{border:1px solid #455a64;padding:9px}th{background:#1b5e20;color:#fff}td:last-child{text-align:right}.total{text-align:right;font-size:20px;font-weight:bold;margin-top:18px}</style></head><body><h1>${title}</h1><p>${periodStart.toLocaleDateString('vi-VN')} - ${periodEnd.toLocaleDateString('vi-VN')}</p><table><tr><th>STT</th><th>MÃ HÓA ĐƠN</th><th>NGÀY GIỜ</th><th>TỔNG TIỀN</th></tr>${rows}</table><div class="total">TỔNG CỘNG: ${money(grandTotal)}</div><script>window.onload=()=>window.print()<\/script></body></html>`); popup.document.close(); return; }
    await Share.share({ title, message: `${title}\n${visibleOrders.map(order => `${order.orderCode}: ${money(order.totalPrice)}`).join('\n')}\nTỔNG: ${money(grandTotal)}` });
  };

  if (loading) return <SafeAreaView style={s.page}><ActivityIndicator size="large" color="#2e7d32" style={{ marginTop: 60 }} /></SafeAreaView>;
  return <SafeAreaView style={s.page}>
    <View style={s.header}><TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>‹</Text></TouchableOpacity><View style={{ flex: 1 }}><Text style={s.title}>🏪 {storeName}</Text><Text style={s.sub}>Đối soát và sửa hóa đơn trực tiếp</Text></View><TouchableOpacity style={s.printBtn} onPress={printStatement}><Text style={s.printText}>🖨️ In 20 ngày</Text></TouchableOpacity></View>
    <View style={s.periodNav}><TouchableOpacity style={s.navBtn} onPress={() => setPeriodOffset(value => value + 1)}><Text style={s.navText}>‹ 20 ngày trước</Text></TouchableOpacity><Text style={s.period}>{periodStart.toLocaleDateString('vi-VN')} — {periodEnd.toLocaleDateString('vi-VN')}</Text><TouchableOpacity disabled={!periodOffset} style={[s.navBtn, !periodOffset && { opacity: .35 }]} onPress={() => setPeriodOffset(value => Math.max(0, value - 1))}><Text style={s.navText}>20 ngày sau ›</Text></TouchableOpacity></View>
    <ScrollView horizontal><ScrollView contentContainerStyle={s.body}><View style={s.table}>
      <View style={s.head}><Text style={[s.no,s.headText]}>STT</Text><Text style={[s.code,s.headText]}>MÃ HÓA ĐƠN</Text><Text style={[s.date,s.headText]}>NGÀY GIỜ</Text><Text style={s.amount}>TỔNG TIỀN</Text><Text style={s.action}>THAO TÁC</Text></View>
      {visibleOrders.map((order, index) => <React.Fragment key={order.id}><View style={s.row}><Text style={s.no}>{index + 1}</Text><Text style={s.code}>{order.orderCode || `#${order.id}`}</Text><Text style={s.date}>{new Date(order.createdAt).toLocaleString('vi-VN')}</Text><Text style={s.amountValue}>{money(order.totalPrice)}</Text><TouchableOpacity style={s.editBtn} onPress={() => openInvoice(order)}><Text style={s.editText}>{expandedId === Number(order.id) ? 'Đóng' : 'Sửa trực tiếp'}</Text></TouchableOpacity></View>
        {expandedId === Number(order.id) ? <View style={s.editor}><View style={s.itemHead}><Text style={[s.itemNo,s.headText]}>STT</Text><Text style={[s.itemName,s.headText]}>SẢN PHẨM</Text><Text style={[s.kg,s.headText]}>SỐ KG</Text><Text style={s.price}>ĐƠN GIÁ/KG</Text><Text style={s.subtotal}>THÀNH TIỀN</Text></View>{(order.items ?? []).map((item: any, itemIndex: number) => { const value = prices[`${order.id}-${item.id}`] || ''; return <View key={item.id} style={s.itemRow}><Text style={s.itemNo}>{itemIndex + 1}</Text><Text style={s.itemName}>{item.productName}</Text><Text style={s.kg}>{item.kg} kg</Text><TextInput value={value} onChangeText={text => setPrices(current => ({ ...current, [`${order.id}-${item.id}`]: text.replace(/[^\d]/g, '') }))} keyboardType="numeric" style={s.priceInput} /><Text style={s.subtotalValue}>{money(Number(item.kg) * Number(value || 0))}</Text></View>})}<TouchableOpacity disabled={savingId === Number(order.id)} style={s.saveBtn} onPress={() => saveInvoice(order)}><Text style={s.saveText}>{savingId === Number(order.id) ? 'Đang lưu...' : '💾 Lưu & tính lại hóa đơn'}</Text></TouchableOpacity></View> : null}
      </React.Fragment>)}
      <View style={s.totalRow}><Text style={s.totalLabel}>TỔNG CỘNG {visibleOrders.length} HÓA ĐƠN</Text><Text style={s.totalValue}>{money(grandTotal)}</Text></View>
    </View></ScrollView></ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({ page:{flex:1,backgroundColor:'#f4faf4'},header:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#1b5e20',padding:14},back:{color:'#fff',fontSize:34},title:{color:'#fff',fontSize:19,fontWeight:'900'},sub:{color:'#a5d6a7',fontSize:11,marginTop:2},printBtn:{backgroundColor:'#fff',borderRadius:9,padding:10},printText:{color:'#1b5e20',fontWeight:'900'},periodNav:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:12,gap:8},navBtn:{backgroundColor:'#e8f5e9',padding:9,borderRadius:8},navText:{color:'#1b5e20',fontWeight:'800',fontSize:12},period:{color:'#455a64',fontWeight:'800'},body:{padding:12,paddingBottom:40},table:{width:900,backgroundColor:'#fff'},head:{flexDirection:'row',backgroundColor:'#1b5e20',paddingVertical:10},headText:{color:'#fff',fontWeight:'900'},row:{flexDirection:'row',alignItems:'center',minHeight:48,borderWidth:1,borderTopWidth:0,borderColor:'#a5d6a7'},no:{width:55,textAlign:'center',fontWeight:'800'},code:{width:180,paddingHorizontal:9,fontWeight:'800'},date:{width:230,paddingHorizontal:9},amount:{width:180,textAlign:'right',paddingRight:10,color:'#fff',fontWeight:'900'},amountValue:{width:180,textAlign:'right',paddingRight:10,color:'#e65100',fontWeight:'900'},action:{width:180,textAlign:'center',color:'#fff',fontWeight:'900'},editBtn:{width:150,marginHorizontal:15,backgroundColor:'#e8f5e9',padding:8,borderRadius:7,alignItems:'center'},editText:{color:'#1b5e20',fontWeight:'900'},editor:{margin:10,borderWidth:2,borderColor:'#2e7d32',padding:10,backgroundColor:'#f8fff8'},itemHead:{flexDirection:'row',backgroundColor:'#388e3c',paddingVertical:8},itemRow:{flexDirection:'row',alignItems:'center',minHeight:45,borderWidth:1,borderTopWidth:0,borderColor:'#c8e6c9'},itemNo:{width:55,textAlign:'center'},itemName:{width:285,paddingHorizontal:8,fontWeight:'700'},kg:{width:100,textAlign:'center'},price:{width:160,textAlign:'center',color:'#fff',fontWeight:'900'},priceInput:{width:140,marginHorizontal:10,borderWidth:1,borderColor:'#66bb6a',padding:7,textAlign:'right',outlineStyle:'none'} as any,subtotal:{width:170,textAlign:'right',paddingRight:9,color:'#fff',fontWeight:'900'},subtotalValue:{width:170,textAlign:'right',paddingRight:9,color:'#e65100',fontWeight:'900'},saveBtn:{alignSelf:'flex-end',backgroundColor:'#2e7d32',padding:11,borderRadius:8,marginTop:10},saveText:{color:'#fff',fontWeight:'900'},totalRow:{flexDirection:'row',justifyContent:'flex-end',alignItems:'center',gap:30,backgroundColor:'#fff3e0',padding:16,borderWidth:1,borderColor:'#ffcc80'},totalLabel:{color:'#bf360c',fontWeight:'900'},totalValue:{color:'#e65100',fontSize:22,fontWeight:'900'} });
