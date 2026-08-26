import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Share, Modal, ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useCartStore } from '@/store/cartStore';
import { useUserStore } from '@/store/userStore';
import { createBulkOrder } from '../services/api';

type NavProp       = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'InvoiceScreen'>;

const getPrice = (price: string | number): number => {
  if (typeof price === 'number') return price;
  return parseFloat(String(price).replace(/[^\d]/g, '')) || 0;
};

export default function InvoiceScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const priceColumnWidth = isMobile ? 92 : 112;
  const navigation = useNavigation<NavProp>();
  const route      = useRoute<RoutePropType>();
  const addToCart  = useCartStore(state => state.addToCart);
  const user       = useUserStore(state => state.user);

  const { checkedItems, orderCode, orderDate } = route.params;

  const totalPrice = checkedItems.reduce(
    (sum, item) => sum + getPrice(item.product.price) * item.kg, 0
  );
  const [calculatedTotal, setCalculatedTotal] = React.useState<number | null>(null);
  const formatMoney = (value: number) => value.toLocaleString('vi-VN') + 'đ';

  // ─── Modal state ──────────────────────────────────────
  const [modal, setModal] = React.useState<{
    visible: boolean;
    success: boolean;
    title: string;
    message: string;
  }>({ visible: false, success: true, title: '', message: '' });

  const [submitting, setSubmitting] = React.useState(false);

  const showModal = (success: boolean, title: string, message: string) => {
    setModal({ visible: true, success, title, message });
  };

  const handleModalOK = () => {
    setModal(m => ({ ...m, visible: false }));
    if (modal.success) {
      navigation.reset({ index: 0, routes: [{ name: 'BulkOrderTracking' }] });
    }
  };

  // ─── Share ────────────────────────────────────────────
  const buildInvoiceText = () => {
    const lines = [
      '╔══════════════════════════════════╗',
      '        🥦 FRESHVEGGIES            ',
      '      ĐƠN HÀNG SỐ LƯỢNG LỚN       ',
      '╚══════════════════════════════════╝',
      '',
      `📋 Mã đơn   : ${orderCode}`,
      `📅 Ngày     : ${orderDate}`,
      `👤 Khách    : ${user?.username ?? 'Khách'}`,
      `📧 Email    : ${user?.email ?? ''}`,
      `📱 SĐT      : ${user?.phone ?? ''}`,
      '',
      '──────────────────────────────────',
      ' STT  SẢN PHẨM        KG x ĐƠN GIÁ = THÀNH TIỀN',
      '──────────────────────────────────',
      ...checkedItems.map((s, i) => {
        const stt      = String(i + 1).padStart(3, ' ');
        const name     = s.product.name.slice(0, 18).padEnd(18, ' ');
        const kg       = String(s.kg).padStart(4, ' ');
        const noteLine = s.note ? `       📝 ${s.note}` : '';
        const unitPrice = getPrice(s.product.price);
        return [`${stt}.  ${name} ${kg} kg x ${formatMoney(unitPrice)} = ${formatMoney(unitPrice * s.kg)}`, noteLine]
          .filter(Boolean).join('\n');
      }),
      '──────────────────────────────────',
      `TỔNG SỐ MẶT HÀNG : ${checkedItems.length} loại`,
      `TỔNG TIỀN         : ${formatMoney(totalPrice)}`,
      '──────────────────────────────────',
      '',
      '⚠️  Đơn hàng cần xác nhận từ Admin',
      '📞 Hotline: 0942 771 476',
      '🌐 FreshVeggies — Rau sạch · Sống khoẻ',
    ];
    return lines.join('\n');
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: buildInvoiceText(), title: `Đơn hàng ${orderCode}` });
    } catch {}
  };

  // ─── Confirm ──────────────────────────────────────────
  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      if (!user?.token) {
        showModal(false, '❌ Chưa đăng nhập', 'Vui lòng đăng xuất và đăng nhập lại.');
        return;
      }

      await createBulkOrder(user.token, {
        orderCode,
        orderDate,
        totalPrice,
        items: checkedItems.map(s => ({
          productId:   s.product.id,
          productName: s.product.name,
          kg:          s.kg,
          pricePerKg:  getPrice(s.product.price),
          subtotal:    getPrice(s.product.price) * s.kg,
          note:        s.note,
        })),
      });

      checkedItems.forEach(s => {
        addToCart({
          id:          String(s.product.id),
          name:        s.product.name,
          priceNumber: getPrice(s.product.price),
          image:       s.product.imageUrl ?? '',
        }, s.kg);
      });

      showModal(
        true,
        '✅ Đặt hàng thành công!',
        `Đơn sỉ đã gửi đến Admin.\nBấm OK để theo dõi trạng thái đơn.`,
      );

    } catch (err: any) {
      showModal(
        false,
        '❌ Gửi đơn thất bại',
        err?.message ?? 'Không thể kết nối server. Vui lòng thử lại.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>

      {/* ─── Custom Modal ─────────────────────────────── */}
      <Modal transparent visible={modal.visible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{modal.title}</Text>
            <Text style={styles.modalMsg}>{modal.message}</Text>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: modal.success ? '#2e7d32' : '#c62828' }]}
              onPress={handleModalOK}
            >
              <Text style={styles.modalBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Sửa đơn</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Hóa đơn xác nhận</Text>
        <TouchableOpacity onPress={handleShare}>
          <Text style={styles.shareBtn}>📤 Gửi</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, isMobile && styles.scrollMobile]}>

        {/* Header hóa đơn */}
        <View style={[styles.invoiceHeader, isMobile && styles.invoiceHeaderMobile]}>
          <Text style={[styles.brand, isMobile && styles.brandMobile]}>🥦 FreshVeggies</Text>
          <Text style={styles.invoiceTitle}>ĐƠN HÀNG SỐ LƯỢNG LỚN</Text>
          <View style={styles.codeRow}>
            <Text style={styles.code}>#{orderCode}</Text>
          </View>
          <Text style={styles.date}>📅 {orderDate}</Text>
        </View>

        {/* Thông tin khách */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 THÔNG TIN KHÁCH HÀNG</Text>
          <View style={styles.customerBox}>
            <Row label="Tên"   value={user?.username ?? 'Khách'} />
            <Row label="Email" value={user?.email ?? ''} />
            {user?.phone ? <Row label="SĐT" value={user.phone} /> : null}
          </View>
        </View>

        {/* Danh sách sản phẩm */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛒 DANH SÁCH SẢN PHẨM</Text>
          <View style={styles.tableHead}>
            <Text style={[styles.thText, { flex: 0.3 }]}>STT</Text>
            <Text style={[styles.thText, { flex: 1 }]}>Sản phẩm</Text>
            <Text style={[styles.thText, { width: priceColumnWidth, textAlign: 'right' }]}>KG × ĐƠN GIÁ</Text>
          </View>
          {checkedItems.map((s, i) => (
            <View key={String(s.product.id)} style={[styles.tableRow, i % 2 === 0 && styles.tableRowEven]}>
              <View style={styles.tableRowTop}>
                <Text style={styles.tdNo}>{i + 1}</Text>
                <Text style={styles.tdName} numberOfLines={2}>{s.product.name}</Text>
                <View style={{ width: priceColumnWidth, alignItems: 'flex-end' }}>
                  <Text style={styles.tdKg}>{s.kg} kg × {formatMoney(getPrice(s.product.price))}</Text>
                  <Text style={styles.tdPrice}>{formatMoney(s.kg * getPrice(s.product.price))}</Text>
                </View>
              </View>
              {s.note ? <Text style={styles.tdNote}>📝 {s.note}</Text> : null}
            </View>
          ))}
        </View>

        {/* Tổng tiền */}
        <View style={styles.section}>
          <View style={styles.totalBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Số mặt hàng</Text>
              <Text style={styles.totalVal}>{checkedItems.length} loại</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tổng kg</Text>
              <Text style={styles.totalVal}>{checkedItems.reduce((s, i) => s + i.kg, 0)} kg</Text>
            </View>
            <TouchableOpacity style={[styles.calculateBtn, isMobile && styles.calculateBtnMobile]} onPress={() => setCalculatedTotal(totalPrice)}>
              <Text style={styles.calculateBtnText}>🧮 Tính tổng tất cả tiền</Text>
            </TouchableOpacity>
            {calculatedTotal !== null && (
              <>
                <View style={styles.divider} />
                <View style={styles.totalRow}>
                  <Text style={[styles.grandLabel, isMobile && styles.grandLabelMobile]}>TỔNG THANH TOÁN</Text>
                  <Text style={[styles.grandPrice, isMobile && styles.grandPriceMobile]}>{formatMoney(calculatedTotal)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Ghi chú cuối */}
        <View style={styles.footNote}>
          <Text style={styles.footNoteText}>⚠️ Đơn hàng cần xác nhận từ Admin trước khi giao</Text>
          <Text style={styles.footNoteText}>📞 Hotline: 0942 771 476</Text>
          <Text style={styles.footNoteText}>🌐 FreshVeggies — Rau sạch · Sống khoẻ</Text>
        </View>

      </ScrollView>

      {/* Bottom buttons */}
      <View style={[styles.bottomBar, isMobile && styles.bottomBarMobile]}>
        <TouchableOpacity style={styles.btnShare} onPress={handleShare}>
          <Text style={styles.btnShareText}>📤 Gửi cho Admin</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnConfirm, submitting && { opacity: 0.6 }]}
          onPress={handleConfirm}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnConfirmText}>✅ Xác nhận đặt hàng</Text>
          }
        </TouchableOpacity>
      </View>

    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4faf4' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalBox: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24,
    width: '80%', alignItems: 'center', gap: 12,
  },
  modalTitle:   { fontSize: 18, fontWeight: '900', color: '#1b5e20', textAlign: 'center' },
  modalMsg:     { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 22 },
  modalBtn:     { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 40, marginTop: 4 },
  modalBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#2e7d32', paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn:  {},
  backText: { color: '#fff', fontSize: 14 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  shareBtn: { color: '#a5d6a7', fontSize: 14, fontWeight: '700' },

  scroll: { padding: 16, paddingBottom: 120 },
  scrollMobile: { padding: 12, paddingBottom: 116 },

  invoiceHeader: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 14, elevation: 2 },
  invoiceHeaderMobile: { padding: 14, borderRadius: 12, marginBottom: 12 },
  brand:         { fontSize: 26, fontWeight: '900', color: '#1b5e20' },
  brandMobile:   { fontSize: 21 },
  invoiceTitle:  { fontSize: 12, color: '#888', letterSpacing: 1.5, marginTop: 4 },
  codeRow:       { marginTop: 10, backgroundColor: '#e8f5e9', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 4 },
  code:          { fontSize: 15, fontWeight: '800', color: '#2e7d32' },
  date:          { fontSize: 12, color: '#aaa', marginTop: 6 },

  section:      { marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontWeight: '800', color: '#777', letterSpacing: 0.6, marginBottom: 6 },

  customerBox: { backgroundColor: '#fff', borderRadius: 12, padding: 12, elevation: 1 },
  infoRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  infoLabel:   { fontSize: 12, color: '#888' },
  infoValue:   { flex: 1, marginLeft: 12, textAlign: 'right', fontSize: 12, fontWeight: '700', color: '#1b5e20' },

  tableHead: {
    flexDirection: 'row', backgroundColor: '#2e7d32',
    paddingHorizontal: 8, paddingVertical: 7, borderRadius: 8, marginBottom: 2,
  },
  thText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  tableRow:     { paddingHorizontal: 8, paddingVertical: 7, backgroundColor: '#fff' },
  tableRowEven: { backgroundColor: '#f9fef9' },
  tableRowTop:  { flexDirection: 'row', alignItems: 'flex-start' },
  tdNo:    { fontSize: 10, color: '#999', width: 24 },
  tdName:  { flex: 1, fontSize: 11, lineHeight: 15, fontWeight: '700', color: '#1b5e20', paddingRight: 5 },
  tdKg:    { fontSize: 9, color: '#555', textAlign: 'right' },
  tdPrice: { fontSize: 11, fontWeight: '800', color: '#e65100', textAlign: 'right', marginTop: 2 },
  tdNote:  { fontSize: 9, lineHeight: 13, color: '#777', fontStyle: 'italic', marginTop: 3, marginLeft: 24 },

  totalBox:   { backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 1 },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalLabel: { fontSize: 12, color: '#888' },
  totalVal:   { fontSize: 12, fontWeight: '600', color: '#333' },
  divider:    { height: 1, backgroundColor: '#e8f5e9', marginVertical: 8 },
  grandLabel: { fontSize: 16, fontWeight: '900', color: '#1b5e20' },
  grandPrice: { fontSize: 22, fontWeight: '900', color: '#e65100' },
  grandLabelMobile: { fontSize: 12 },
  grandPriceMobile: { fontSize: 18 },
  calculateBtn: { backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#66bb6a', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 9 },
  calculateBtnMobile: { paddingVertical: 9 },
  calculateBtnText: { color: '#1b5e20', fontSize: 12, fontWeight: '800' },

  footNote:     { backgroundColor: '#fff3e0', borderRadius: 12, padding: 12, gap: 4 },
  footNoteText: { fontSize: 10, lineHeight: 14, color: '#e65100', textAlign: 'center' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', padding: 14, gap: 10,
    borderTopWidth: 1, borderTopColor: '#e8f5e9', elevation: 10,
  },
  bottomBarMobile: { padding: 10, gap: 7 },
  btnShare:       { borderWidth: 1.5, borderColor: '#2e7d32', borderRadius: 14, height: 46, alignItems: 'center', justifyContent: 'center' },
  btnShareText:   { color: '#2e7d32', fontWeight: '700', fontSize: 12 },
  btnConfirm:     { backgroundColor: '#2e7d32', borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center' },
  btnConfirmText: { color: '#fff', fontWeight: '900', fontSize: 13 },
});
