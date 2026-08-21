import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ActivityIndicator, useWindowDimensions, DimensionValue,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { BASE_URL } from "@/services/api";
import { staticProducts } from "@/data/products";
import { imageMap } from "../assets/imageMap";
import { useCartStore } from "@/store/cartStore";
import { useCategory } from "@/context/CategoryContext";

const CAT_MAP: Record<string, string> = {
  "rau-la":   "leaf",
  "cu":       "root",
  "qua":      "fruit",
  "rau-thom": "herb",
  "nam":      "mushroom",
};

function getImageSource(img: any) {
  if (!img) return null;
  if (typeof img === "string") {
    if (img.startsWith("http")) return { uri: img };
    const base = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
    return { uri: base + (img.startsWith("/") ? img : "/" + img) };
  }
  return img;
}

function getImageSourceByFileName(imageUrl?: string) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http")) return { uri: imageUrl };
  const fileName = imageUrl.split("/").pop() || "";
  return imageMap[fileName] ?? null;
}

const PER_PAGE = 12;

function ProductCard({ item, isAdded, onAdd, cardWidth }: {
  item: any;
  isAdded: boolean;
  onAdd: () => void;
  cardWidth: DimensionValue;
}) {
  const navigation = useNavigation<any>();
  const src = getImageSourceByFileName(item.imageUrl) ?? getImageSource(item.image);
  const price    = Number(item.salePrice ?? item.price ?? 0);
  const oldPrice = item.oldPrice ? Number(item.oldPrice) : null;

  return (
    <View style={[styles.card, { width: cardWidth }]}>
      <View style={styles.imageWrapper}>
        {src ? (
          <Image source={src} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardImgPlaceholder}>
            <Text style={{ fontSize: 28 }}>🥦</Text>
          </View>
        )}
        {(item.oldPrice || item.isFeatured) && (
          <View style={styles.saleBadge}>
            <Text style={styles.saleBadgeText}>SALE</Text>
          </View>
        )}
      </View>

      <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>

      <View style={styles.priceRow}>
        <Text style={styles.cardPrice}>
          {price.toLocaleString("vi-VN")}đ
        </Text>
        {oldPrice && (
          <Text style={styles.cardOldPrice}>
            {oldPrice.toLocaleString("vi-VN")}đ
          </Text>
        )}
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.btnCart, isAdded && styles.btnCartDone]}
          onPress={onAdd}
          activeOpacity={0.8}
        >
          <Text style={styles.btnCartText}>{isAdded ? "✓" : "🛒"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnDetail}
          onPress={() => navigation.navigate("ProductDetail", { product: item })}
          activeOpacity={0.85}
        >
          <Text style={styles.btnDetailText}>Chi tiết</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Pagination({ page, total, perPage, onChange }: {
  page: number; total: number; perPage: number; onChange: (p: number) => void;
}) {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;
  return (
    <View style={styles.pagerRow}>
      <TouchableOpacity
        style={[styles.pagerBtn, page === 1 && styles.pagerBtnDisabled]}
        onPress={() => onChange(page - 1)} disabled={page === 1}>
        <Text style={styles.pagerArrow}>‹</Text>
      </TouchableOpacity>
      {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
        <TouchableOpacity key={n}
          style={[styles.pagerBtn, n === page && styles.pagerBtnActive]}
          onPress={() => onChange(n)}>
          <Text style={[styles.pagerNum, n === page && styles.pagerNumActive]}>{n}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={[styles.pagerBtn, page === pages && styles.pagerBtnDisabled]}
        onPress={() => onChange(page + 1)} disabled={page === pages}>
        <Text style={styles.pagerArrow}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ProductSection() {
  const addToCart = useCartStore(s => s.addToCart);
  const { activeCategory } = useCategory();
  const { width } = useWindowDimensions();
  const isWeb = width > 600;
  const cardWidth: DimensionValue = isWeb ? "22.5%" : "47%";

  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [page, setPage]               = useState(1);
  const [addedId, setAddedId]         = useState<string | null>(null);

  useEffect(() => {
    setAllProducts(staticProducts);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => { setPage(1); }, [activeCategory]);

  const handleAdd = useCallback((item: any) => {
    addToCart(item, 1);
    setAddedId(String(item.id));
    setTimeout(() => setAddedId(null), 1200);
  }, [addToCart]);

  const filtered = activeCategory === "all"
    ? allProducts
    : allProducts.filter(p => p.cat === (CAT_MAP[activeCategory] ?? activeCategory));

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <View style={styles.wrap}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionAccent} />
        <View>
          <Text style={styles.sectionTitle}> Sản Phẩm Giảm Giá</Text>
          <Text style={styles.sectionSub}>Tươi ngon mỗi ngày từ nông trại</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2e7d32" />
          <Text style={styles.loadingText}>Đang tải sản phẩm...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: "#d32f2f" }}>❌ {error}</Text>
        </View>
      ) : paginated.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Không có sản phẩm trong danh mục này.</Text>
        </View>
      ) : (
        <>
          <View style={styles.row}>
            {paginated.map(item => (
              <ProductCard
                key={item.id}
                item={item}
                isAdded={addedId === String(item.id)}
                onAdd={() => handleAdd(item)}
                cardWidth={cardWidth}
              />
            ))}
          </View>
          <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},

  sectionHeader: {
    flexDirection: "row", alignItems: "center",
    gap: 10, marginBottom: 12,
  },
  sectionAccent: {
    width: 4, height: 36,
    backgroundColor: "#e65100", borderRadius: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1b5e20" },
  sectionSub:   { fontSize: 11, color: "#81c784", marginTop: 2 },

  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 7,
    borderWidth: 0.5,
    borderColor: "#e0e0e0",
    elevation: 1,
  },

  imageWrapper: {
    width: "100%", aspectRatio: 1,
    borderRadius: 8, overflow: "hidden",
    backgroundColor: "#f5f5f5",
    marginBottom: 6, position: "relative",
  },
  cardImage:          { width: "100%", height: "100%" },
  cardImgPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },

  saleBadge: {
    position: "absolute", top: 4, left: 4,
    backgroundColor: "#e65100", borderRadius: 4,
    paddingHorizontal: 4, paddingVertical: 2,
  },
  saleBadgeText: { fontSize: 8, fontWeight: "800", color: "#fff" },

  cardName: {
    fontSize: 11, fontWeight: "600",
    color: "#1b5e20", lineHeight: 15, marginBottom: 4,
  },

  priceRow: {
    flexDirection: "row", alignItems: "baseline",
    gap: 4, marginBottom: 6, flexWrap: "wrap",
  },
  cardPrice:    { fontSize: 12, fontWeight: "800", color: "#e65100" },
  cardOldPrice: { fontSize: 9.5, color: "#bdbdbd", textDecorationLine: "line-through" },

  btnRow: { flexDirection: "row", gap: 4 },

  btnCart: {
    backgroundColor: "#2e7d32", borderRadius: 7,
    paddingHorizontal: 8, height: 30,
    alignItems: "center", justifyContent: "center",
  },
  btnCartDone: { backgroundColor: "#1b5e20" },
  btnCartText: { fontSize: 13 },

  btnDetail: {
    flex: 1, borderWidth: 1, borderColor: "#2e7d32",
    borderRadius: 7, height: 30,
    alignItems: "center", justifyContent: "center",
  },
  btnDetailText: { color: "#2e7d32", fontSize: 10, fontWeight: "700" },

  pagerRow: {
    flexDirection: "row", justifyContent: "center",
    alignItems: "center", gap: 5,
    marginTop: 16, flexWrap: "wrap",
  },
  pagerBtn: {
    width: 32, height: 32, borderRadius: 6,
    borderWidth: 1, borderColor: "#ddd",
    backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  pagerBtnActive:   { backgroundColor: "#2e7d32", borderColor: "#2e7d32" },
  pagerBtnDisabled: { opacity: 0.35 },
  pagerNum:         { fontSize: 12, color: "#555" },
  pagerNumActive:   { color: "#fff", fontWeight: "700" },
  pagerArrow:       { fontSize: 16, color: "#2e7d32", lineHeight: 20 },

  center:      { paddingVertical: 36, alignItems: "center", gap: 8 },
  loadingText: { fontSize: 13, color: "#81c784" },
  emptyText:   { fontSize: 13, color: "#BBB", textAlign: "center" },
});
