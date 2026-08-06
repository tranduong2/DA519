// PaymentScreen.tsx — Hỗ trợ COD + MoMo tĩnh
import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  Animated, Easing, SafeAreaView, StatusBar, Modal,
  Image, ActivityIndicator, Linking,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { useCartStore } from "@/store/cartStore";
import { RootStackParamList } from "@/types";
import { imageMap } from "@/assets/imageMap"; // ← import imageMap

type PaymentNavProp   = NativeStackNavigationProp<RootStackParamList, "Payment">;
type PaymentRouteProp = RouteProp<RootStackParamList, "Payment">;

const STEPS = ["Giỏ hàng", "Xác nhận", "Thanh toán", "Hoàn tất"];

// ─── Momo config ──────────────────────────────────────────────────────────────
const MOMO_PHONE = "0942771476";
const MOMO_NAME  = "Rau sạch Đà Lạt";
const MOMO_QR    = { uri: "http://localhost:8081/momo.jpg" }; // ← lấy từ imageMap

function openMomoApp(amount: number, orderId: string) {
  Linking.openURL(`momo://transfer?phone=${MOMO_PHONE}&amount=${amount}&note=${orderId}`)
    .catch(() => Linking.openURL(
      Platform.OS === "ios"
        ? "https://apps.apple.com/vn/app/momo/id918751511"
        : "https://play.google.com/store/apps/details?id=com.mservice.momotransfer"
    ));
}

// ─── Momo Modal ───────────────────────────────────────────────────────────────
function MomoModal({ visible, amount, orderId, onClose, onConfirm }: {
  visible: boolean; amount: number; orderId: string;
  onClose: () => void; onConfirm: () => void;
}) {
  const [qrLoading, setQrLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (visible) { setQrLoading(true); setConfirmed(false); }
  }, [visible]);

  const formatted = amount.toLocaleString("vi-VN") + "đ";

  function handleConfirm() {
    setConfirmed(true);
    setTimeout(() => { onConfirm(); onClose(); }, 1000);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={ms.overlay}>
        <View style={ms.sheet}>

          {/* Header */}
          <View style={ms.header}>
            <Text style={ms.headerTitle}>Thanh toán Momo</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Text style={ms.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Logo */}
          <View style={ms.logoRow}>
            <View style={ms.logoCircle}><Text style={ms.logoText}>M</Text></View>
            <Text style={ms.logoLabel}>Ví Momo</Text>
          </View>

          {/* QR — dùng ảnh local momo.jpg */}
          <View style={ms.qrWrap}>
            {qrLoading && (
              <View style={ms.qrPlaceholder}>
                <ActivityIndicator color={MOMO_COLOR} />
              </View>
            )}
           <Image
  source={MOMO_QR}
  style={ms.qrImg}
  resizeMode="contain"
  onLoadEnd={() => setQrLoading(false)}
  onError={() => setQrLoading(false)}
/>
          </View>

          <Text style={ms.amount}>{formatted}</Text>
          <Text style={ms.hint}>Mở app Momo → Quét mã → Xác nhận chuyển khoản</Text>

          {/* Open app */}
          <TouchableOpacity style={ms.openAppBtn} onPress={() => openMomoApp(amount, orderId)}>
            <Text style={ms.openAppText}>📱 Mở app Momo</Text>
          </TouchableOpacity>

          {/* Info */}
          <View style={ms.infoBox}>
            {[
              { label: "Số tài khoản", value: MOMO_PHONE },
              { label: "Tên TK",        value: MOMO_NAME },
              { label: "Số tiền",        value: formatted,  highlight: true },
              { label: "Nội dung CK",    value: orderId,    highlight: true },
            ].map(r => (
              <View key={r.label} style={ms.infoRow}>
                <Text style={ms.infoLabel}>{r.label}</Text>
                <Text style={[ms.infoValue, r.highlight && ms.infoHighlight]}>{r.value}</Text>
              </View>
            ))}
          </View>

          {/* Confirm */}
          <TouchableOpacity
            style={[ms.confirmBtn, confirmed && ms.confirmBtnDone]}
            onPress={handleConfirm}
            disabled={confirmed}
            activeOpacity={0.85}
          >
            {confirmed
              ? <ActivityIndicator color="#fff" />
              : <Text style={ms.confirmText}>Đã chuyển khoản xong</Text>
            }
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PaymentScreen() {
  const navigation  = useNavigation<PaymentNavProp>();
  const route       = useRoute<PaymentRouteProp>();

  const orderId     = route.params?.orderId;
  const payMethod   = route.params?.payMethod ?? "cod";
  const totalAmount = route.params?.totalAmount ?? 0;
  const isCOD       = payMethod === "cod";

  const { items } = useCartStore();

  const [momoVisible, setMomoVisible] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const accentColor = isCOD ? GREEN : MOMO_COLOR;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
    ]).start();
  }, []);

  const pressAnim = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start();
  };

  const handlePayPress = () => {
    pressAnim();
    if (isCOD) {
      goToTracking();
    } else {
      setMomoVisible(true);
    }
  };

  const goToTracking = () => {
    navigation.navigate("OrderTracking", {
      orderId: orderId ?? "",
      payMethod,
      totalAmount,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <MomoModal
        visible={momoVisible}
        amount={totalAmount}
        orderId={orderId ? String(orderId).slice(-10) : "DH000000"}
        onClose={() => setMomoVisible(false)}
        onConfirm={goToTracking}
      />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác nhận thanh toán</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* STEP INDICATOR */}
      <View style={styles.stepRow}>
        {STEPS.map((s, i) => {
          const active = i === 2;
          const done   = i < 2;
          return (
            <React.Fragment key={s}>
              <View style={styles.stepItem}>
                <View style={[
                  styles.stepDot,
                  done   && styles.stepDotDone,
                  active && { backgroundColor: accentColor, borderColor: accentColor },
                ]}>
                  {done
                    ? <Text style={styles.stepCheck}>✓</Text>
                    : <Text style={[styles.stepNum, active && styles.stepNumActive]}>{i + 1}</Text>
                  }
                </View>
                <Text style={[
                  styles.stepLabel,
                  done   && styles.stepLabelDone,
                  active && { color: accentColor, fontWeight: "600" },
                ]}>
                  {s}
                </Text>
              </View>
              {i < STEPS.length - 1 && (
                <View style={[styles.stepLine, done && styles.stepLineDone]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Mã đơn */}
        <View style={styles.orderIdRow}>
          <View style={styles.orderIdBadge}>
            <Text>🧾</Text>
            <Text style={styles.orderIdText}>
              Mã đơn: <Text style={styles.orderIdVal}>{orderId ? String(orderId).slice(-10) : "---"}</Text>
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Chờ xác nhận</Text>
          </View>
        </View>

        {/* Sản phẩm */}
        <SectionCard title="Sản phẩm" icon="🛍️">
          {items.map((item, idx) => (
            <View key={item.id} style={[styles.productRow, idx < items.length - 1 && styles.productBorder]}>
              <View style={styles.productThumb}><Text style={{ fontSize: 22 }}>🥬</Text></View>
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.productQty}>x{item.qty}</Text>
              </View>
              <Text style={styles.productPrice}>{(item.price * item.qty).toLocaleString("vi-VN")}đ</Text>
            </View>
          ))}
        </SectionCard>

        {/* Phương thức */}
        <SectionCard title="Phương thức thanh toán" icon="💳">
          <View style={styles.payMethodRow}>
            <View style={[styles.methodIconBox, { backgroundColor: isCOD ? "#e8f5e9" : "#fce4f3" }]}>
              {isCOD
                ? <Text style={{ fontSize: 22 }}>💵</Text>
                : <Text style={{ fontSize: 16, color: MOMO_COLOR, fontWeight: "700" }}>M</Text>
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.payMethodTitle}>{isCOD ? "Tiền mặt (COD)" : "Ví MoMo"}</Text>
              <Text style={styles.payMethodSub}>
                {isCOD ? "Thanh toán khi nhận hàng" : "Quét QR hoặc mở app Momo"}
              </Text>
            </View>
            <View style={[styles.payMethodCheck, { backgroundColor: accentColor }]}>
              <Text style={styles.payMethodCheckText}>✓</Text>
            </View>
          </View>

          {!isCOD && (
            <TouchableOpacity
              style={styles.momoPreview}
              onPress={() => setMomoVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.momoPreviewText}>📲 Xem QR thanh toán Momo</Text>
              <Text style={styles.momoPreviewArrow}>›</Text>
            </TouchableOpacity>
          )}
        </SectionCard>

        {/* Chi tiết thanh toán */}
        <SectionCard title="Chi tiết thanh toán" icon="📊">
          <PriceRow label="Tạm tính"       value={`${totalAmount.toLocaleString("vi-VN")}đ`} />
          <PriceRow label="Phí vận chuyển" value="Miễn phí" valueColor={GREEN} />
          <View style={styles.priceDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <View>
              <Text style={[styles.totalAmount, { color: accentColor }]}>
                {totalAmount.toLocaleString("vi-VN")}đ
              </Text>
              <Text style={styles.totalVat}>Đã bao gồm VAT</Text>
            </View>
          </View>
        </SectionCard>

        {/* Lưu ý */}
        <SectionCard title={isCOD ? "Lưu ý khi nhận hàng" : "Lưu ý"} icon={isCOD ? "📦" : "💬"}>
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              {isCOD
                ? "• Vui lòng chuẩn bị đúng số tiền khi nhận hàng\n• Kiểm tra hàng trước khi thanh toán cho shipper\n• Giao hàng dự kiến trong 3–4 ngày làm việc"
                : "• Quét QR hoặc bấm nút Momo ở trên để chuyển khoản\n• Ghi đúng nội dung chuyển khoản là mã đơn hàng\n• Đơn được xác nhận sau khi admin kiểm tra"
              }
            </Text>
          </View>
        </SectionCard>
      </Animated.ScrollView>

      {/* STICKY FOOTER */}
      <View style={styles.stickyFooter}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Tổng thanh toán</Text>
          <Text style={[styles.footerTotalValue, { color: accentColor }]}>
            {totalAmount.toLocaleString("vi-VN")}đ
          </Text>
        </View>

        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[styles.payBtn, { backgroundColor: accentColor }]}
            onPress={handlePayPress}
            activeOpacity={0.88}
          >
            <Text style={styles.payBtnEmoji}>{isCOD ? "💵" : "📲"}</Text>
            <Text style={styles.payBtnText}>
              {isCOD ? "Xác nhận đặt hàng (COD)" : "Thanh toán qua Momo"}
            </Text>
            <Text style={styles.payBtnArrow}>→</Text>
          </TouchableOpacity>
        </Animated.View>

        {isCOD && (
          <View style={styles.codHintRow}>
            <Text style={styles.codHint}>🔒 Bạn chỉ trả tiền khi nhận được hàng</Text>
          </View>
        )}

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>← Quay lại</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionCardHeader}>
        <Text style={styles.sectionCardIcon}>{icon}</Text>
        <Text style={styles.sectionCardTitle}>{title}</Text>
      </View>
      <View style={styles.sectionCardBody}>{children}</View>
    </View>
  );
}

function PriceRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.priceRow}>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={[styles.priceValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MOMO_COLOR = "#a50064";
const GREEN      = "#2e7d32";

// ─── Main styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f5f7" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderColor: "#e8e8e8" },
  backBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f5f5", borderRadius: 19 },
  backIcon: { fontSize: 26, color: "#333", lineHeight: 30 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#1a1a1a" },
  stepRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5, borderColor: "#f0f0f0" },
  stepItem: { alignItems: "center", gap: 4 },
  stepDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#e0e0e0" },
  stepDotDone: { backgroundColor: GREEN, borderColor: GREEN },
  stepCheck: { color: "#fff", fontSize: 12, fontWeight: "700" },
  stepNum: { fontSize: 11, color: "#aaa", fontWeight: "600" },
  stepNumActive: { color: "#fff" },
  stepLabel: { fontSize: 10, color: "#bbb", marginTop: 2 },
  stepLabelDone: { color: GREEN },
  stepLine: { flex: 1, height: 2, backgroundColor: "#e8e8e8", marginBottom: 14 },
  stepLineDone: { backgroundColor: GREEN },
  orderIdRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  orderIdBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  orderIdText: { fontSize: 12, color: "#888" },
  orderIdVal: { color: "#333", fontWeight: "600" },
  statusBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff8e1", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 5, borderWidth: 1, borderColor: "#ffe082" },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#f9a825" },
  statusText: { fontSize: 11, color: "#f57f17", fontWeight: "600" },
  sectionCard: { backgroundColor: "#fff", marginHorizontal: 16, marginTop: 12, borderRadius: 14, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  sectionCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 0.5, borderColor: "#f5f5f5" },
  sectionCardIcon: { fontSize: 15 },
  sectionCardTitle: { fontSize: 13, fontWeight: "700", color: "#1a1a1a" },
  sectionCardBody: { paddingHorizontal: 14, paddingVertical: 12 },
  productRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  productBorder: { borderBottomWidth: 0.5, borderColor: "#f5f5f5" },
  productThumb: { width: 52, height: 52, borderRadius: 10, backgroundColor: "#f1f8e9", alignItems: "center", justifyContent: "center" },
  productInfo: { flex: 1 },
  productName: { fontSize: 13, fontWeight: "600", color: "#1a1a1a", lineHeight: 18 },
  productQty: { fontSize: 12, color: "#aaa", marginTop: 3 },
  productPrice: { fontSize: 13, fontWeight: "700", color: "#1a1a1a" },
  payMethodRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  methodIconBox: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  payMethodTitle: { fontSize: 13, fontWeight: "700", color: "#1a1a1a" },
  payMethodSub: { fontSize: 11, color: "#aaa", marginTop: 2 },
  payMethodCheck: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", marginLeft: "auto" },
  payMethodCheckText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  momoPreview: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, backgroundColor: "#fce4f3", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "#f8bbd0" },
  momoPreviewText: { fontSize: 13, color: MOMO_COLOR, fontWeight: "600" },
  momoPreviewArrow: { fontSize: 20, color: MOMO_COLOR },
  priceRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  priceLabel: { fontSize: 13, color: "#888" },
  priceValue: { fontSize: 13, color: "#1a1a1a", fontWeight: "500" },
  priceDivider: { height: 0.5, backgroundColor: "#f0f0f0", marginVertical: 10 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  totalLabel: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  totalAmount: { fontSize: 22, fontWeight: "800", textAlign: "right" },
  totalVat: { fontSize: 10, color: "#bbb", textAlign: "right", marginTop: 2 },
  noteBox: { backgroundColor: "#fffde7", borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: "#fff9c4" },
  noteText: { fontSize: 12, color: "#827717", lineHeight: 20 },
  stickyFooter: { backgroundColor: "#fff", paddingHorizontal: 16, paddingTop: 14, paddingBottom: Platform.OS === "ios" ? 28 : 16, borderTopWidth: 0.5, borderColor: "#eee", shadowColor: "#000", shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 8 },
  footerTotal: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  footerTotalLabel: { fontSize: 13, color: "#888" },
  footerTotalValue: { fontSize: 18, fontWeight: "800" },
  payBtn: { borderRadius: 14, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 10 },
  payBtnEmoji: { fontSize: 18 },
  payBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  payBtnArrow: { color: "rgba(255,255,255,0.7)", fontSize: 18 },
  codHintRow: { alignItems: "center", marginBottom: 8 },
  codHint: { fontSize: 12, color: GREEN, fontWeight: "500" },
  cancelBtn: { alignItems: "center", paddingVertical: 6 },
  cancelText: { fontSize: 13, color: "#aaa" },
});

// ─── Momo Modal styles ────────────────────────────────────────────────────────
const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  sheet: { width: 340, backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", elevation: 12, shadowColor: "#000", shadowOpacity: 0.2, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  closeBtn: { fontSize: 18, color: "#888" },
  logoRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 18 },
  logoCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: MOMO_COLOR, alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 17, fontWeight: "800", color: "#fff" },
  logoLabel: { fontSize: 15, fontWeight: "600", color: "#222" },
  qrWrap: { alignSelf: "center", marginTop: 14, width: 200, height: 200, borderRadius: 12, borderWidth: 1, borderColor: "#eee", overflow: "hidden", backgroundColor: "#f8f8f8", alignItems: "center", justifyContent: "center" },
  qrPlaceholder: { position: "absolute", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" },
  qrImg: { width: 200, height: 200 },
  amount: { textAlign: "center", fontSize: 22, fontWeight: "800", color: MOMO_COLOR, marginTop: 12 },
  hint: { textAlign: "center", fontSize: 12, color: "#888", marginTop: 4, paddingHorizontal: 24 },
  openAppBtn: { alignSelf: "center", marginTop: 10, paddingHorizontal: 18, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: MOMO_COLOR },
  openAppText: { fontSize: 13, color: MOMO_COLOR, fontWeight: "600" },
  infoBox: { marginHorizontal: 16, marginTop: 14, borderRadius: 10, borderWidth: 1, borderColor: "#f0f0f0", overflow: "hidden" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  infoLabel: { fontSize: 12, color: "#777" },
  infoValue: { fontSize: 12, fontWeight: "600", color: "#222" },
  infoHighlight: { color: MOMO_COLOR },
  confirmBtn: { margin: 16, height: 48, borderRadius: 12, backgroundColor: MOMO_COLOR, alignItems: "center", justifyContent: "center" },
  confirmBtnDone: { backgroundColor: "#7b004a" },
  confirmText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});