import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useCartStore } from "@/store/cartStore";
import { useUserStore } from "@/store/userStore";
import { BASE_URL } from "@/services/api";

type PayMethod = "cod" | "bank";

interface Address {
  name: string;
  street: string;
  phone: string;
}

interface PromoResult {
  code: string;
  discount: number;
  description: string;
}

const VIP_TIERS = [
  { key: 'silver', label: 'Silver', minSpending: 5_000_000, discountPercent: 5 },
  { key: 'gold', label: 'Gold', minSpending: 10_000_000, discountPercent: 10 },
  { key: 'platinum', label: 'Platinum', minSpending: 20_000_000, discountPercent: 15 },
] as const;

export default function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const { items, clearCart } = useCartStore();
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const token = useUserStore((state) => state.token); // ← dùng token này

  const [payMethod, setPayMethod] = useState<PayMethod>("cod");
  const [loading, setLoading] = useState(false);

  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');

  const [address, setAddress] = useState<Address>(() => ({
    name: (user?.name ?? user?.username) ?? "",
    street: user?.address ?? "",
    phone: user?.phone ?? "",
  }));
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [draftAddress, setDraftAddress] = useState<Address>(address);
  const [showMomoModal, setShowMomoModal] = useState(false);

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const vipTierConfig = VIP_TIERS.find((tier) => tier.key === user?.vipTier) ?? null;
  const vipDiscount = vipTierConfig ? Math.round((subtotal * vipTierConfig.discountPercent) / 100) : 0;
  const promoBaseTotal = Math.max(0, subtotal - vipDiscount);
  const discount = promoResult?.discount ?? 0;
  const total = Math.max(0, promoBaseTotal - discount);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoError('');
    setPromoLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/promotions/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: promoCode.trim().toUpperCase(), orderTotal: promoBaseTotal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoError(data.message || 'Mã không hợp lệ');
        setPromoResult(null);
      } else {
        setPromoResult({
          code: promoCode.trim().toUpperCase(),
          discount: data.discount,
          description: data.promo?.description || '',
        });
        setPromoError('');
      }
    } catch {
      setPromoError('Không thể kiểm tra mã');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoCode('');
    setPromoResult(null);
    setPromoError('');
  };

  const recordPromoUsage = async () => {
    if (!promoResult) return;
    try {
      await fetch(`${BASE_URL}/promotions/use`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: promoResult.code }),
      });
    } catch {}
  };

  // ── Tạo đơn hàng ── dùng token từ store, không phải user.token ──
  const createOrder = async (): Promise<string | null> => {
    
  const { token: storeToken, user: storeUser } = useUserStore.getState();
  console.log("=== DEBUG TOKEN ===");
  console.log("storeToken:", storeToken);
  console.log("storeUser.token:", storeUser?.token);
  console.log("storeUser.email:", storeUser?.email);
  console.log("==================");

    const orderCode = "DH" + Date.now().toString().slice(-6);

    const payload = {
      orderCode,
      totalAmount: total,
      paymentMethod: payMethod === "cod" ? "Tiền mặt (COD)" : "Chuyển khoản / Momo",
      shippingAddress: `${address.name} - ${address.phone} - ${address.street}`,
      promoCode: promoResult?.code ?? null,
      vipTier: user?.vipTier ?? null,
      vipDiscountAmount: vipDiscount,
      discountAmount: discount,
      items: items.map((item) => ({
        productId: item.id,
        productName: item.name,
        price: item.price,
        quantity: item.qty,
        note: null,
      })),
    };

    const res = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // ← fix 401: dùng token từ store
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "Không thể tạo đơn hàng");

    if (data.vip) {
      setUser({
        ...user,
        ...data.vip,
        token: user?.token ?? token,
      });
    }

    await recordPromoUsage();
    return data.order?.id?.toString() ?? orderCode;
  };

  const handleConfirmPayment = async () => {
    if (!address.street.trim()) {
      Alert.alert("Thiếu địa chỉ", "Vui lòng thêm địa chỉ giao hàng trước khi thanh toán.");
      setDraftAddress(address);
      setShowAddressModal(true);
      return;
    }

    if (payMethod === "bank") {
      setShowMomoModal(true);
      return;
    }

    try {
      setLoading(true);
      const orderId = await createOrder();
      if (!orderId) return;
      clearCart();
      navigation.navigate("Payment", { orderId, payMethod, totalAmount: total });
    } catch (err: any) {
      Alert.alert("Lỗi", err.message ?? "Đặt hàng thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleMomoDone = async () => {
    try {
      setLoading(true);
      setShowMomoModal(false);
      const orderId = await createOrder();
      if (!orderId) return;
      clearCart();
      navigation.navigate("Payment", { orderId, payMethod, totalAmount: total });
    } catch (err: any) {
      Alert.alert("Lỗi", err.message ?? "Đặt hàng thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const saveAddress = () => {
    if (!draftAddress.name.trim() || !draftAddress.street.trim() || !draftAddress.phone.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng điền đầy đủ thông tin địa chỉ.");
      return;
    }
    setAddress(draftAddress);
    setUser({
      ...(user ?? {}),
      email: user?.email ?? "",
      id: user?.id,
      name: draftAddress.name,
      username: user?.username ?? draftAddress.name,
      phone: draftAddress.phone,
      address: draftAddress.street.trim(),
      role: user?.role ?? "user",
      vipTier: user?.vipTier ?? null,
      quarterlySpending: user?.quarterlySpending ?? 0,
      rewardPoints: user?.rewardPoints ?? 0,
      vipQuarterKey: user?.vipQuarterKey ?? null,
      vipTierUpdatedAt: user?.vipTierUpdatedAt ?? null,
      token: user?.token ?? null,
    });
    setShowAddressModal(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Xác nhận đơn hàng</Text>
          <Text style={styles.headerSub}>Kiểm tra trước khi thanh toán</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        <Section label="Sản phẩm đã chọn">
          <View style={styles.card}>
            {items.map((item, index) => (
              <View key={item.id} style={[styles.itemRow, index < items.length - 1 && styles.itemRowBorder]}>
                <Image source={item.image} style={styles.itemImage} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQty}>x{item.qty}</Text>
                </View>
                <Text style={styles.itemPrice}>{(item.price * item.qty).toLocaleString("vi-VN")}đ</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section label="Địa chỉ giao hàng">
          <View style={styles.card}>
            <View style={styles.addressRow}>
              <View style={{ flex: 1 }}>
                {address.street.trim() ? (
                  <>
                    <Text style={styles.addressName}>{address.name} · {address.phone}</Text>
                    <Text style={styles.addressText}>{address.street}</Text>
                  </>
                ) : (
                  <Text style={styles.addressEmpty}>Bạn chưa có địa chỉ giao hàng. Thêm địa chỉ</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => { setDraftAddress(address); setShowAddressModal(true); }}>
                <Text style={styles.changeBtn}>Thay đổi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Section>

        <Section label="Mã khuyến mãi">
          <View style={styles.card}>
            {promoResult ? (
              <View style={styles.promoApplied}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.promoAppliedCode}>🎁 {promoResult.code}</Text>
                  <Text style={styles.promoAppliedDesc}>
                    Giảm {promoResult.discount.toLocaleString('vi-VN')}đ
                    {promoResult.description ? ` · ${promoResult.description}` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleRemovePromo}>
                  <Text style={styles.promoRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.promoRow}>
                <TextInput
                  style={styles.promoInput}
                  placeholder="Nhập mã khuyến mãi..."
                  placeholderTextColor="#bbb"
                  value={promoCode}
                  onChangeText={(v) => { setPromoCode(v); setPromoError(''); }}
                  autoCapitalize="characters"
                />
                <TouchableOpacity style={[styles.promoBtn, promoLoading && { opacity: 0.6 }]} onPress={handleApplyPromo} disabled={promoLoading}>
                  {promoLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.promoBtnText}>Áp dụng</Text>}
                </TouchableOpacity>
              </View>
            )}
            {!!promoError && <Text style={styles.promoError}>{promoError}</Text>}
          </View>
        </Section>

        <Section label="Phương thức thanh toán">
          <View style={styles.payGrid}>
            <TouchableOpacity style={[styles.payCard, payMethod === "cod" && styles.payCardActive]} onPress={() => setPayMethod("cod")}>
              <Text style={[styles.payCardTitle, payMethod === "cod" && styles.payCardTitleActive]}>Tiền mặt (COD)</Text>
              <Text style={[styles.payCardSub, payMethod === "cod" && styles.payCardSubActive]}>Trả khi nhận hàng</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.payCard, payMethod === "bank" && styles.payCardActive]} onPress={() => setPayMethod("bank")}>
              <Text style={[styles.payCardTitle, payMethod === "bank" && styles.payCardTitleActive]}>Chuyển khoản</Text>
              <Text style={[styles.payCardSub, payMethod === "bank" && styles.payCardSubActive]}>QR / Momo</Text>
            </TouchableOpacity>
          </View>
        </Section>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tạm tính</Text>
            <Text style={styles.summaryValue}>{subtotal.toLocaleString("vi-VN")}đ</Text>
          </View>
          {vipDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>VIP {vipTierConfig?.label}</Text>
              <Text style={[styles.summaryValue, { color: '#2e7d32' }]}>-{vipDiscount.toLocaleString('vi-VN')}đ</Text>
            </View>
          )}
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Giảm giá ({promoResult?.code})</Text>
              <Text style={[styles.summaryValue, { color: '#e53935' }]}>-{discount.toLocaleString('vi-VN')}đ</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Phí giao hàng</Text>
            <Text style={[styles.summaryValue, { color: "#2e7d32" }]}>Miễn phí</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <Text style={styles.totalValue}>{total.toLocaleString("vi-VN")}đ</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.payBtn, (!address.street.trim() || loading) && styles.payBtnDisabled]}
            onPress={handleConfirmPayment}
            disabled={!address.street.trim() || loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.payBtnText}>Xác nhận thanh toán →</Text>}
          </TouchableOpacity>
          <Text style={styles.terms}>Bằng cách đặt hàng, bạn đồng ý với điều khoản dịch vụ</Text>
        </View>

      </ScrollView>

      {/* MODAL: ĐỊA CHỈ */}
      <Modal visible={showAddressModal} animationType="slide" transparent onRequestClose={() => setShowAddressModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thay đổi địa chỉ</Text>
              <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalDivider} />
            <Text style={styles.fieldLabel}>Họ và tên</Text>
            <TextInput style={styles.fieldInput} value={draftAddress.name} onChangeText={(v) => setDraftAddress((d) => ({ ...d, name: v }))} placeholder="Nguyễn Văn A" placeholderTextColor="#bdbdbd" />
            <Text style={styles.fieldLabel}>Địa chỉ</Text>
            <TextInput style={[styles.fieldInput, { height: 72, textAlignVertical: "top" }]} value={draftAddress.street} onChangeText={(v) => setDraftAddress((d) => ({ ...d, street: v }))} placeholder="Số nhà, đường, phường/xã, thành phố" placeholderTextColor="#bdbdbd" multiline />
            <Text style={styles.fieldLabel}>Số điện thoại</Text>
            <TextInput style={styles.fieldInput} value={draftAddress.phone} onChangeText={(v) => setDraftAddress((d) => ({ ...d, phone: v }))} placeholder="09xx xxx xxx" placeholderTextColor="#bdbdbd" keyboardType="phone-pad" />
            <TouchableOpacity style={styles.saveBtn} onPress={saveAddress}>
              <Text style={styles.saveBtnText}>Lưu địa chỉ</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: MOMO */}
      <Modal visible={showMomoModal} animationType="slide" transparent onRequestClose={() => setShowMomoModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thanh toán Momo</Text>
              <TouchableOpacity onPress={() => setShowMomoModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalDivider} />
            <View style={styles.momoContainer}>
              <View style={styles.momoLogoRow}>
                <View style={styles.momoLogoBubble}>
                  <Text style={styles.momoLogoText}>M</Text>
                </View>
                <Text style={styles.momoLabel}>Ví Momo</Text>
              </View>

              {/* ── QR ảnh thật ── */}
              <View style={styles.qrBox}>
                <Image
                  source={require("../assets/momo.jpg")}
                  style={{ width: 196, height: 196, borderRadius: 10 }}
                  resizeMode="contain"
                />
              </View>

              <Text style={styles.momoAmount}>{total.toLocaleString("vi-VN")}đ</Text>
              <Text style={styles.momoHint}>Mở app Momo → Quét mã → Xác nhận chuyển khoản</Text>
              <View style={styles.momoInfoRow}>
                <Text style={styles.momoInfoLabel}>Số tài khoản</Text>
                <Text style={styles.momoInfoValue}>0942 771 476</Text>
              </View>
              <View style={styles.momoInfoRow}>
                <Text style={styles.momoInfoLabel}>Tên TK</Text>
                <Text style={styles.momoInfoValue}>Rau sạch Đà Lạt</Text>
              </View>
              <View style={styles.momoInfoRow}>
                <Text style={styles.momoInfoLabel}>Nội dung CK</Text>
                <Text style={[styles.momoInfoValue, { color: "#e91e63" }]}>
                  DH{Date.now().toString().slice(-6)}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.momoDoneBtn, loading && { opacity: 0.6 }]} onPress={handleMomoDone} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.momoDoneBtnText}>Đã chuyển khoản xong</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.dotIcon} />
        <Text style={styles.sectionLabel}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

const GREEN = "#1b5e20";
const MID = "#2e7d32";
const MOMO = "#ae2070";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f8e9" },
  header: { backgroundColor: GREEN, flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  backArrow: { color: "#fff", fontSize: 26, fontWeight: "300", lineHeight: 30 },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "600" },
  headerSub: { color: "rgba(255,255,255,0.65)", fontSize: 12 },
  section: { paddingHorizontal: 16, paddingTop: 14 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  dotIcon: { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: GREEN },
  card: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 0.5, borderColor: "#e0e0e0", overflow: "hidden" },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  itemRowBorder: { borderBottomWidth: 0.5, borderColor: "#f1f8e9" },
  itemImage: { width: 48, height: 48, borderRadius: 10, backgroundColor: "#e8f5e9" },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: "600", color: "#212121" },
  itemQty: { fontSize: 12, color: "#9e9e9e", marginTop: 2 },
  itemPrice: { fontSize: 13, fontWeight: "700", color: MID },
  addressRow: { flexDirection: "row", padding: 12, gap: 8 },
  addressName: { fontSize: 13, fontWeight: "600", color: "#212121" },
  addressText: { fontSize: 12, color: "#757575", marginTop: 2 },
  addressEmpty: { fontSize: 12, color: "#9e9e9e", fontStyle: "italic" },
  changeBtn: { fontSize: 12, color: MID, fontWeight: "600" },
  promoRow: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8 },
  promoInput: { flex: 1, fontSize: 13, color: '#333', paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: '#c8e6c9', borderRadius: 8 },
  promoBtn: { backgroundColor: MID, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  promoBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  promoError: { fontSize: 11, color: '#e53935', paddingHorizontal: 12, paddingBottom: 8 },
  promoApplied: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  promoAppliedCode: { fontSize: 13, fontWeight: '800', color: MID },
  promoAppliedDesc: { fontSize: 11, color: '#666', marginTop: 2 },
  promoRemove: { fontSize: 16, color: '#e53935', fontWeight: '700' },
  payGrid: { flexDirection: "row", gap: 8 },
  payCard: { flex: 1, borderRadius: 10, padding: 10, borderWidth: 0.5, borderColor: "#e0e0e0", backgroundColor: "#fafafa" },
  payCardActive: { borderWidth: 2, borderColor: MID, backgroundColor: "#f1f8f1" },
  payCardTitle: { fontSize: 12, fontWeight: "600", color: "#424242" },
  payCardTitleActive: { color: GREEN },
  payCardSub: { fontSize: 11, color: "#9e9e9e", marginTop: 2 },
  payCardSubActive: { color: "#388e3c" },
  summaryCard: { margin: 16, borderRadius: 12, backgroundColor: "#fff", padding: 14, borderWidth: 0.5, borderColor: "#e0e0e0" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  summaryLabel: { fontSize: 12, color: "#757575" },
  summaryValue: { fontSize: 12, color: "#212121" },
  divider: { height: 0.5, backgroundColor: "#e0e0e0", marginVertical: 10 },
  totalLabel: { fontSize: 14, fontWeight: "600", color: "#212121" },
  totalValue: { fontSize: 22, fontWeight: "700", color: GREEN },
  footer: { paddingHorizontal: 16, paddingBottom: 32 },
  payBtn: { backgroundColor: GREEN, borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  terms: { textAlign: "center", fontSize: 11, color: "#9e9e9e", marginTop: 10 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#212121" },
  modalClose: { fontSize: 18, color: "#9e9e9e" },
  modalDivider: { height: 0.5, backgroundColor: "#e0e0e0", marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: "#757575", marginBottom: 6 },
  fieldInput: { borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: "#212121", backgroundColor: "#fafafa", marginBottom: 14 },
  saveBtn: { backgroundColor: GREEN, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  momoContainer: { alignItems: "center", marginBottom: 16 },
  momoLogoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  momoLogoBubble: { width: 36, height: 36, borderRadius: 18, backgroundColor: MOMO, alignItems: "center", justifyContent: "center" },
  momoLogoText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  momoLabel: { fontSize: 16, fontWeight: "700", color: MOMO },
  qrBox: { width: 200, height: 200, borderRadius: 12, overflow: "hidden", marginBottom: 14, borderWidth: 1, borderColor: "#e0e0e0" },
  momoAmount: { fontSize: 22, fontWeight: "700", color: MOMO, marginBottom: 6 },
  momoHint: { fontSize: 12, color: "#757575", textAlign: "center", marginBottom: 16, lineHeight: 18 },
  momoInfoRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", paddingVertical: 6, borderBottomWidth: 0.5, borderColor: "#f1f1f1" },
  momoInfoLabel: { fontSize: 12, color: "#9e9e9e" },
  momoInfoValue: { fontSize: 12, fontWeight: "600", color: "#212121" },
  momoDoneBtn: { backgroundColor: MOMO, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  momoDoneBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});