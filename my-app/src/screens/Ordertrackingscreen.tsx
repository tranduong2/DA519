// OrderTrackingScreen.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Easing,
  StatusBar,
  Platform,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/types";
import { useUserStore } from "@/store/userStore";

const API_URL = "http://10.106.44.114:3000";

type OrderTrackingNavProp = NativeStackNavigationProp<RootStackParamList, "OrderTracking">;
type OrderTrackingRouteProp = RouteProp<RootStackParamList, "OrderTracking">;

// ─── Types ───────────────────────────────────────────────────────
type TrackingStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "on_the_way"
  | "delivered"
  | "cancelled";

interface TrackingStep {
  key: TrackingStatus;
  label: string;
  sublabel: string;
  icon: string;
}

// ─── Data ────────────────────────────────────────────────────────
const TRACKING_STEPS: TrackingStep[] = [
  { key: "pending",    label: "Chờ xác nhận",        sublabel: "Đơn hàng đang chờ cửa hàng xác nhận",  icon: "🕐" },
  { key: "confirmed",  label: "Đã xác nhận",          sublabel: "Cửa hàng đã nhận đơn của bạn",          icon: "✅" },
  { key: "preparing",  label: "Đang chuẩn bị hàng",   sublabel: "Nhân viên đang đóng gói sản phẩm",      icon: "📦" },
  { key: "on_the_way", label: "Đang trên đường giao",  sublabel: "Đơn hàng đang di chuyển đến bạn",       icon: "🛵" },
  { key: "delivered",  label: "Giao hàng thành công",  sublabel: "Cảm ơn bạn đã mua hàng!",              icon: "🎉" },
];

const STATUS_INDEX: Record<TrackingStatus, number> = {
  pending: 0, confirmed: 1, preparing: 2, on_the_way: 3, delivered: 4, cancelled: -1,
};

const STATUS_COLORS: Record<TrackingStatus, string> = {
  pending: "#ff9800", confirmed: "#2196f3", preparing: "#9c27b0",
  on_the_way: "#00bcd4", delivered: "#4caf50", cancelled: "#f44336",
};

// ─── Main Component ──────────────────────────────────────────────
export default function OrderTrackingScreen() {
  const navigation = useNavigation<OrderTrackingNavProp>();
  const route = useRoute<OrderTrackingRouteProp>();
  const { orderId, payMethod, totalAmount } = route.params;
 const user = useUserStore((state) => state.user);
const token = useUserStore((state) => state.token); // ← lấy token từ store, không phải từ user.token

  const isCOD = payMethod !== "bank" 

  // ─── State ───────────────────────────────────────────────────
  const [currentStatus, setCurrentStatus] = useState<TrackingStatus>("pending");
  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentIndex = STATUS_INDEX[currentStatus] ?? 0;

  // ─── Animations ──────────────────────────────────────────────
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotAnims  = useRef(TRACKING_STEPS.map(() => new Animated.Value(0))).current;
  const lineAnims = useRef(TRACKING_STEPS.slice(0, -1).map(() => new Animated.Value(0))).current;
  const truckAnim = useRef(new Animated.Value(0)).current;

  const runAnimations = useCallback((index: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
    ]).start();

    const stepAnims = TRACKING_STEPS.map((_, i) => {
      const anims: Animated.CompositeAnimation[] = [
        Animated.timing(dotAnims[i], { toValue: 1, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.back(1.4)), delay: i * 120 }),
      ];
      if (i < TRACKING_STEPS.length - 1 && i <= index) {
        anims.push(Animated.timing(lineAnims[i], { toValue: 1, duration: 400, useNativeDriver: false, delay: i * 120 + 200 }));
      }
      return anims;
    }).flat();

    Animated.stagger(60, stepAnims).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(truckAnim, { toValue: -4, duration: 300, useNativeDriver: true }),
        Animated.timing(truckAnim, { toValue: 0,  duration: 300, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.22, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // ─── Fetch order từ API ───────────────────────────────────────
  const fetchOrder = useCallback(async (isRefresh = false) => {
    
   try {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);

    const res = await fetch(`${API_URL}/orders/${orderId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
      if (!res.ok) throw new Error(`Lỗi server: ${res.status}`);

      const data = await res.json();
      const order = data.order || data;

      setOrderData(order);
      const status = (order.status as TrackingStatus) ?? "pending";
      setCurrentStatus(status);
      runAnimations(STATUS_INDEX[status] ?? 0);
    } catch (err: any) {
      setError(err.message || "Không thể tải trạng thái đơn hàng");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, orderId]);

  useEffect(() => {
    fetchOrder();
    // Auto refresh mỗi 30 giây
    const interval = setInterval(() => fetchOrder(true), 30000);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  // ─── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={GREEN_DARK} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Theo dõi đơn hàng</Text>
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.loadingText}>Đang tải trạng thái...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error ────────────────────────────────────────────────────
  if (error && !orderData) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={GREEN_DARK} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Theo dõi đơn hàng</Text>
        </View>
        <View style={styles.centerBox}>
          <Text style={styles.errorEmoji}>😕</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchOrder()}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Cancelled ───────────────────────────────────────────────
  if (currentStatus === "cancelled") {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={GREEN_DARK} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Theo dõi đơn hàng</Text>
        </View>
        <View style={styles.centerBox}>
          <Text style={styles.errorEmoji}>❌</Text>
          <Text style={styles.cancelledTitle}>Đơn hàng đã bị hủy</Text>
          <Text style={styles.cancelledSub}>
            #{typeof orderId === "string" ? orderId.slice(-10) : orderId}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.navigate("Home")}>
            <Text style={styles.retryText}>Về trang chủ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const activeStep = TRACKING_STEPS[currentIndex] ?? TRACKING_STEPS[0];
  const progressPct = Math.round(((currentIndex + 1) / TRACKING_STEPS.length) * 100);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN_DARK} />

      {/* ── HEADER ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Theo dõi đơn hàng</Text>
          <Text style={styles.headerSub}>
            #{typeof orderId === "string" ? orderId.slice(-10) : orderId}
          </Text>
        </View>
        <TouchableOpacity style={styles.helpBtn} onPress={() => fetchOrder(true)}>
          <Text style={styles.helpText}>🔄 Làm mới</Text>
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchOrder(true)} colors={[GREEN]} />
        }
      >
        {/* ── HERO STATUS CARD ─────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Animated.Text style={[styles.heroIcon, { transform: [{ translateY: truckAnim }] }]}>
              {activeStep.icon}
            </Animated.Text>
            <View style={styles.heroTextCol}>
              <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[currentStatus] }]}>
                <Text style={styles.statusPillText}>{activeStep.label}</Text>
              </View>
              <Text style={styles.heroSub}>{activeStep.sublabel}</Text>
            </View>
          </View>

          <View style={styles.etaRow}>
            <View style={styles.etaBadge}>
              <Text style={styles.etaIcon}>📋</Text>
              <Text style={styles.etaText}>
                Mã đơn: <Text style={styles.etaHighlight}>
                  {orderData?.orderCode ?? `#${orderId}`}
                </Text>
              </Text>
            </View>
            <View style={styles.etaBadge}>
              <Text style={styles.etaIcon}>{isCOD ? "💵" : "📱"}</Text>
              <Text style={styles.etaText}>{isCOD ? "COD" : "Momo"}</Text>
            </View>
          </View>

          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            Bước {currentIndex + 1} / {TRACKING_STEPS.length} • {progressPct}% hoàn thành
          </Text>
        </View>

        {/* ── TRACKING TIMELINE ────────────────────────────── */}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>Lịch sử vận chuyển</Text>

          {TRACKING_STEPS.map((step, i) => {
            const isDone    = i < currentIndex;
            const isActive  = i === currentIndex;
            const isPending = i > currentIndex;

            return (
              <View key={step.key} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  {i > 0 && (
                    <Animated.View
                      style={[
                        styles.lineSegment,
                        {
                          backgroundColor: lineAnims[i - 1].interpolate({
                            inputRange: [0, 1],
                            outputRange: ["#e0e0e0", GREEN],
                          }),
                        },
                        isPending && { backgroundColor: "#e8e8e8" },
                      ]}
                    />
                  )}

                  <Animated.View
                    style={[
                      styles.dot,
                      isDone    && styles.dotDone,
                      isActive  && styles.dotActive,
                      isPending && styles.dotPending,
                      {
                        transform: [{
                          scale: dotAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
                        }],
                      },
                    ]}
                  >
                    {isDone ? (
                      <Text style={styles.dotCheck}>✓</Text>
                    ) : isActive ? (
                      <Animated.View style={[styles.dotInner, { transform: [{ scale: pulseAnim }] }]} />
                    ) : null}
                  </Animated.View>

                  {i < TRACKING_STEPS.length - 1 && (
                    <Animated.View
                      style={[styles.lineSegment, { backgroundColor: i < currentIndex ? GREEN : "#e8e8e8" }]}
                    />
                  )}
                </View>

                <View style={[styles.timelineContent, i === TRACKING_STEPS.length - 1 && { paddingBottom: 0 }]}>
                  <View style={styles.timelineTextRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        styles.stepLabel,
                        isDone    && styles.stepLabelDone,
                        isActive  && styles.stepLabelActive,
                        isPending && styles.stepLabelPending,
                      ]}>
                        {step.icon} {step.label}
                      </Text>
                      <Text style={[styles.stepSublabel, isPending && { color: "#ccc" }]}>
                        {step.sublabel}
                      </Text>
                    </View>
                    {isActive && (
                      <View style={styles.liveBadge}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── THÔNG TIN ĐƠN HÀNG ──────────────────────────── */}
        <View style={styles.infoCard}>
          {orderData?.shippingAddress && (
            <>
              <View style={styles.infoRow}>
                <View style={[styles.infoIconBox, { backgroundColor: "#e8f5e9" }]}>
                  <Text>📍</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Địa chỉ giao hàng</Text>
                  <Text style={styles.infoValue}>{orderData.shippingAddress}</Text>
                </View>
              </View>
              <View style={styles.infoDivider} />
            </>
          )}

          <View style={styles.infoRow}>
            <View style={[styles.infoIconBox, { backgroundColor: isCOD ? "#fff3e0" : "#fce4ec" }]}>
              <Text>{isCOD ? "💵" : "📱"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Thanh toán</Text>
              <Text style={styles.infoValue}>
                {isCOD ? "Tiền mặt khi nhận hàng (COD)" : "Ví MoMo / Chuyển khoản"}
              </Text>
              <Text style={[styles.infoSub, isCOD && { color: "#e65100" }]}>
                {isCOD
                  ? `Chuẩn bị ${(orderData?.totalAmount ?? totalAmount ?? 0).toLocaleString("vi-VN")}đ khi nhận`
                  : "Đã thanh toán"}
              </Text>
            </View>
          </View>

          {orderData?.estimatedDelivery && (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <View style={[styles.infoIconBox, { backgroundColor: "#e3f2fd" }]}>
                  <Text>📅</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Dự kiến giao</Text>
                  <Text style={styles.infoValue}>{orderData.estimatedDelivery}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Auto-refresh note */}
        <Text style={styles.autoRefreshNote}>🔄 Tự động cập nhật mỗi 30 giây</Text>
      </Animated.ScrollView>

      {/* ── STICKY BOTTOM ─────────────────────────────────────── */}
      <View style={styles.stickyBottom}>
        <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate("Home")}>
          <Text style={styles.homeBtnText}>🏠 Về trang chủ</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ordersBtn} onPress={() => navigation.navigate("OrderList")}>
          <Text style={styles.ordersBtnText}>📋 Đơn của tôi</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const GREEN_DARK = "#1b5e20";
const GREEN      = "#2e7d32";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f3f4f6" },

  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, color: "#888" },
  errorEmoji: { fontSize: 48 },
  errorText: { fontSize: 14, color: "#f44336", textAlign: "center", paddingHorizontal: 32 },
  cancelledTitle: { fontSize: 18, fontWeight: "700", color: "#f44336" },
  cancelledSub: { fontSize: 13, color: "#999" },
  retryBtn: { backgroundColor: GREEN, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  header: {
    backgroundColor: GREEN_DARK, flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  backIcon: { color: "#fff", fontSize: 26, lineHeight: 30 },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 1 },
  helpBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20,
  },
  helpText: { color: "#fff", fontSize: 11, fontWeight: "600" },

  heroCard: {
    backgroundColor: GREEN_DARK, paddingHorizontal: 16, paddingBottom: 20,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14, paddingTop: 8 },
  heroIcon: { fontSize: 44 },
  heroTextCol: { flex: 1 },
  statusPill: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 6 },
  statusPillText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  heroSub: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  etaRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  etaBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  etaIcon: { fontSize: 13 },
  etaText: { color: "rgba(255,255,255,0.8)", fontSize: 12 },
  etaHighlight: { color: "#a5d6a7", fontWeight: "700" },
  progressBg: { height: 6, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#69f0ae", borderRadius: 3 },
  progressLabel: { color: "rgba(255,255,255,0.5)", fontSize: 11, textAlign: "right", marginTop: 5 },

  timelineCard: {
    backgroundColor: "#fff", marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  timelineTitle: { fontSize: 14, fontWeight: "700", color: "#1a1a1a", marginBottom: 16 },
  timelineRow: { flexDirection: "row" },
  timelineLeft: { width: 28, alignItems: "center" },
  lineSegment: { width: 2, flex: 1, minHeight: 12, borderRadius: 1 },
  dot: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: "#e8e8e8",
    alignItems: "center", justifyContent: "center", zIndex: 1,
  },
  dotDone:    { backgroundColor: GREEN },
  dotActive:  { backgroundColor: GREEN, borderWidth: 2.5, borderColor: "#a5d6a7" },
  dotPending: { backgroundColor: "#ebebeb" },
  dotCheck:   { color: "#fff", fontSize: 11, fontWeight: "800" },
  dotInner:   { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  timelineContent: { flex: 1, paddingLeft: 12, paddingBottom: 20 },
  timelineTextRow: { flexDirection: "row", alignItems: "flex-start" },
  stepLabel:        { fontSize: 13, fontWeight: "600", color: "#1a1a1a", lineHeight: 18 },
  stepLabelDone:    { color: GREEN },
  stepLabelActive:  { color: GREEN_DARK, fontWeight: "700" },
  stepLabelPending: { color: "#bbb" },
  stepSublabel: { fontSize: 11, color: "#888", marginTop: 2, lineHeight: 16 },
  liveBadge: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#ffebee", paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 10, gap: 4, marginLeft: 8, marginTop: 2,
  },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#e53935" },
  liveText: { fontSize: 9, color: "#e53935", fontWeight: "800" },

  infoCard: {
    backgroundColor: "#fff", marginHorizontal: 16, marginTop: 14,
    borderRadius: 16, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  infoRow: { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 12 },
  infoIconBox: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoLabel: { fontSize: 11, color: "#aaa", marginBottom: 3 },
  infoValue: { fontSize: 13, fontWeight: "600", color: "#1a1a1a" },
  infoSub: { fontSize: 11, color: "#888", marginTop: 2 },
  infoDivider: { height: 0.5, backgroundColor: "#f5f5f5", marginHorizontal: 14 },

  autoRefreshNote: { textAlign: "center", fontSize: 11, color: "#bbb", marginTop: 16, marginBottom: 8 },

  stickyBottom: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff", flexDirection: "row", gap: 10,
    paddingHorizontal: 16, paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 30 : 16,
    borderTopWidth: 0.5, borderColor: "#eee",
    shadowColor: "#000", shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 8,
  },
  homeBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    borderWidth: 1.5, borderColor: "#e0e0e0", alignItems: "center",
  },
  homeBtnText: { fontSize: 13, color: "#555", fontWeight: "600" },
  ordersBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    backgroundColor: GREEN_DARK, alignItems: "center",
  },
  ordersBtnText: { fontSize: 13, color: "#fff", fontWeight: "600" },
});