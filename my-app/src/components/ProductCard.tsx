import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useCategory } from "@/context/CategoryContext";

type Product = {
  id: string;
  name: string;
  price: string;
  oldPrice?: string;
  cat: string;
  image: any;
};

type Props = {
  title?: string;
  subtitle?: string;
  data: Product[];
  showHeader?: boolean;
};

// 🔥 CARD
function AnimatedCard({ item, index }: { item: Product; index: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation<any>();

  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 400,
      delay: index * 60,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      {/* badge */}
      <View style={styles.badgeWrap}>
        <Text style={styles.badgeText}>🔥</Text>
      </View>

      <View style={styles.imageWrapper}>
        <Image source={item.image} style={styles.image} />
      </View>

      <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.price}>{item.price}</Text>
      {item.oldPrice && <Text style={styles.oldPrice}>{item.oldPrice}</Text>}

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.btnCart}>
          <Text style={styles.btnCartText}>🛒</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnDetail}
          onPress={() =>
            navigation.navigate("ProductDetail", { product: item })
          }
        >
          <Text style={styles.btnDetailText}>Chi tiết</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// 🔥 GRID CHÍNH
export default function ProductGrid({
  title,
  subtitle,
  data,
  showHeader = true,
}: Props) {
  const { activeCategory } = useCategory();

  const filtered =
    activeCategory === "all"
      ? data
      : data.filter((p) => p.cat === activeCategory);

  return (
    <View>
      {showHeader && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle && <Text style={styles.headerSub}>{subtitle}</Text>}
        </View>
      )}

      <View style={styles.grid}>
        {filtered.map((item, index) => (
          <AnimatedCard key={item.id} item={item} index={index} />
        ))}
      </View>
    </View>
  );
}

// 🔥 STYLE CHUNG
const styles = StyleSheet.create({
  header: {
    backgroundColor: "#2e7d32",
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 12,
    marginBottom: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  headerSub: { fontSize: 12, color: "#a5d6a7", marginTop: 3 },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    backgroundColor: "#f1f8e9",
    borderRadius: 12,
    padding: 6,
  },

  card: {
    width: "24%",
    backgroundColor: "#fff",
    marginBottom: 10,
    borderRadius: 12,
    padding: 6,
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#c8e6c9",
    elevation: 2,
  },

  imageWrapper: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
    marginBottom: 4,
  },

  image: { width: "100%", height: "100%" },

  badgeWrap: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: "#e53935",
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 1,
    zIndex: 1,
  },

  badgeText: { color: "#fff", fontSize: 8 },

  name: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1b5e20",
    textAlign: "center",
  },

  price: { fontSize: 11, fontWeight: "bold", color: "#d32f2f" },

  oldPrice: {
    fontSize: 9,
    color: "#bdbdbd",
    textDecorationLine: "line-through",
  },

  btnRow: {
    flexDirection: "row",
    width: "100%",
    gap: 2,
    marginTop: 4,
  },

  btnCart: {
    backgroundColor: "#2e7d32",
    borderRadius: 6,
    paddingHorizontal: 6,
    minHeight: 26,
    justifyContent: "center",
    alignItems: "center",
  },

  btnCartText: { fontSize: 10 },

  btnDetail: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#2e7d32",
    borderRadius: 6,
    minHeight: 26,
    justifyContent: "center",
    alignItems: "center",
  },

  btnDetailText: {
    color: "#2e7d32",
    fontSize: 8,
    fontWeight: "bold",
  },
});