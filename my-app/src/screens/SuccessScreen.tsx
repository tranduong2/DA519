
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function SuccessScreen() {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();

  const isWeb = width > 768;

  return (
    <View style={styles.container}>
      <View style={[styles.card, isWeb && styles.cardWeb]}>

        {/* ICON */}
        <Text style={styles.icon}>🎉</Text>

        {/* TITLE */}
        <Text style={styles.title}>Đặt hàng thành công!</Text>

        {/* SUB */}
        <Text style={styles.sub}>
          Cảm ơn bạn đã mua hàng 🌱{"\n"}
          Đơn hàng của bạn đang được xử lý.
        </Text>

        {/* BUTTONS */}
        <View style={[styles.btnRow, isWeb && styles.btnRowWeb]}>
          
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate("Home")}
          >
            <Text style={styles.primaryText}>Về trang chủ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => navigation.navigate("Cart")}
          >
            <Text style={styles.outlineText}>Xem giỏ hàng</Text>
          </TouchableOpacity>

        </View>

      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f8e9",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },

  card: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    width: "100%",
  },

  cardWeb: {
    width: 400, // 🔥 web nhìn gọn đẹp
  },

  icon: {
    fontSize: 60,
    marginBottom: 10,
  },

  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1b5e20",
    marginBottom: 6,
  },

  sub: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },

  btnRow: {
    width: "100%",
    gap: 10,
  },

  btnRowWeb: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  primaryBtn: {
    backgroundColor: "#2e7d32",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
  },

  primaryText: {
    color: "#fff",
    fontWeight: "bold",
  },

  outlineBtn: {
    borderWidth: 1,
    borderColor: "#2e7d32",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
  },

  outlineText: {
    color: "#2e7d32",
    fontWeight: "bold",
  },
});