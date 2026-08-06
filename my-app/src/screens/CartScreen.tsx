import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useCartStore } from "@/store/cartStore";

export default function CartScreen() {
  const navigation = useNavigation<any>();
  const { items, increaseQty, decreaseQty } = useCartStore();
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  const renderItem = ({ item }: any) => (
    <View style={styles.row}>
      <Image source={item.image} style={styles.itemImage} />
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.price}>
          {(item.price * item.qty).toLocaleString("vi-VN")}đ
        </Text>
      </View>
      <View style={styles.qtyRow}>
        <TouchableOpacity
          style={styles.qtyBtnOutline}
          onPress={() => decreaseQty(item.id)}
        >
          <Text style={styles.qtyBtnOutlineText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.qty}>{item.qty}</Text>
        <TouchableOpacity
          style={styles.qtyBtnFill}
          onPress={() => increaseQty(item.id)}
        >
          <Text style={styles.qtyBtnFillText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Giỏ hàng</Text>
          <Text style={styles.headerSub}>{items.length} sản phẩm</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{items.length} món</Text>
        </View>
      </View>

      {/* SHIPPING NOTICE */}
      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          Giao hàng nhanh · Miễn phí từ 300.000đ
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>Giỏ hàng trống</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.emptyBtnText}>Mua sắm ngay</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={
          items.length > 0 ? (
            <View>
              {/* SUMMARY */}
              <View style={styles.summary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tạm tính</Text>
                  <Text style={styles.summaryValue}>
                    {total.toLocaleString("vi-VN")}đ
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Phí giao hàng</Text>
                  <Text style={[styles.summaryValue, { color: "#2e7d32" }]}>
                    Miễn phí
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.totalLabel}>Tổng cộng</Text>
                  <Text style={styles.totalValue}>
                    {total.toLocaleString("vi-VN")}đ
                  </Text>
                </View>
              </View>

              {/* BUTTONS */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.orderBtn}
                  onPress={() => navigation.navigate("Checkout")}
                >
                  <Text style={styles.orderBtnText}>Đặt hàng ngay →</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Text style={styles.continueText}>Tiếp tục mua sắm</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const GREEN = "#1b5e20";
const MID = "#388e3c";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f8e9" },

  header: {
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { color: "#fff", fontSize: 26, fontWeight: "300", lineHeight: 30 },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "600" },
  headerSub: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  badge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "500" },

  notice: {
    backgroundColor: "#fff",
    paddingVertical: 10, paddingHorizontal: 20,
    borderBottomWidth: 0.5, borderColor: "#e0e0e0",
  },
  noticeText: { fontSize: 12, color: "#757575" },

  row: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", padding: 14, gap: 12,
  },
  itemImage: {
    width: 56, height: 56, borderRadius: 12,
    backgroundColor: "#e8f5e9",
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: "600", color: "#212121" },
  price: { fontSize: 14, fontWeight: "700", color: "#2e7d32", marginTop: 4 },

  qtyRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  qtyBtnOutline: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1.5, borderColor: MID,
    alignItems: "center", justifyContent: "center",
  },
  qtyBtnOutlineText: { fontSize: 16, color: MID, fontWeight: "700" },
  qtyBtnFill: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: MID,
    alignItems: "center", justifyContent: "center",
  },
  qtyBtnFillText: { fontSize: 16, color: "#fff", fontWeight: "700" },
  qty: {
    fontSize: 14, fontWeight: "600",
    minWidth: 18, textAlign: "center", color: "#212121",
  },

  sep: { height: 0.5, backgroundColor: "#f1f8e9" },

  summary: {
    margin: 16, borderRadius: 12,
    backgroundColor: "#fff", padding: 14,
    borderWidth: 0.5, borderColor: "#e0e0e0",
  },
  summaryRow: {
    flexDirection: "row", justifyContent: "space-between", marginBottom: 8,
  },
  summaryLabel: { fontSize: 13, color: "#757575" },
  summaryValue: { fontSize: 13, color: "#212121" },
  divider: { height: 0.5, backgroundColor: "#e0e0e0", marginVertical: 10 },
  totalLabel: { fontSize: 15, fontWeight: "600", color: "#212121" },
  totalValue: { fontSize: 20, fontWeight: "700", color: GREEN },

  footer: { paddingHorizontal: 16, paddingBottom: 32 },
  orderBtn: {
    backgroundColor: GREEN, borderRadius: 12,
    paddingVertical: 15, alignItems: "center", marginBottom: 4,
  },
  orderBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  continueText: {
    textAlign: "center", color: MID,
    fontSize: 13, paddingVertical: 10,
  },

  emptyWrap: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: "#757575" },
  emptyBtn: {
    marginTop: 8, backgroundColor: GREEN,
    borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12,
  },
  emptyBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});