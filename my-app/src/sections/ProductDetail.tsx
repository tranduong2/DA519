import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Image, TouchableOpacity, Animated,
  ScrollView, SafeAreaView, useWindowDimensions, Platform,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useProducts } from "@/hooks/useProducts";
import { useCartStore } from "@/store/cartStore";
import { useCategory } from "@/context/CategoryContext";
import { BASE_URL } from "@/services/api";
import { imageMap } from "../assets/imageMap";

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

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

// ── RATING STARS ─────────────────────────────────────────────────────────────
function StarRating({ value = 4.8, count = 0 }: { value?: number; count?: number }) {
  const full  = Math.floor(value);
  const hasHalf = value - full >= 0.5;
  return (
    <View style={styles.ratingRow}>
      {[1,2,3,4,5].map(i => (
        <Text key={i} style={[styles.star, i <= full ? styles.starFull : hasHalf && i === full + 1 ? styles.starHalf : styles.starEmpty]}>
          {i <= full ? "★" : hasHalf && i === full + 1 ? "⯨" : "☆"}
        </Text>
      ))}
      <Text style={styles.ratingVal}>{value.toFixed(1)}</Text>
      {count > 0 && <Text style={styles.ratingCnt}>· {count} đánh giá</Text>}
    </View>
  );
}

// ── RELATED CARD (compact, 4-col) ─────────────────────────────────────────────
function RelatedCard({
  item, onAdd, isAdded, onPress,
}: {
  item: any;
  onAdd: () => void;
  isAdded: boolean;
  onPress: () => void;
}) {
  const src = getImageSourceByFileName(item.imageUrl) ?? getImageSource(item.image);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {/* Image */}
      <View style={styles.cardImgWrap}>
        {src ? (
          <Image source={src} style={styles.cardImg} resizeMode="cover" />
        ) : (
          <View style={styles.cardImgPlaceholder}>
            <Text style={{ fontSize: 26 }}>🥦</Text>
          </View>
        )}
        {item.oldPrice && (
          <View style={styles.cardBadge}>
            <Text style={styles.cardBadgeText}>SALE</Text>
          </View>
        )}
        {/* Favourite button */}
        <View style={styles.cardFavBtn}>
          <Text style={styles.cardFavIcon}>♡</Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>

        {/* Price */}
        <View style={styles.cardPriceRow}>
          <Text style={styles.cardPrice}>{item.salePrice || item.price}</Text>
          {item.oldPrice && (
            <Text style={styles.cardOldPrice}>{item.oldPrice}</Text>
          )}
        </View>

        {/* Stars */}
        <View style={styles.cardRatingRow}>
          {[1,2,3,4,5].map(i => (
            <Text key={i} style={[styles.cardStar, i <= Math.round(item.rating ?? 4.5) ? styles.cardStarFull : styles.cardStarEmpty]}>
              {i <= Math.round(item.rating ?? 4.5) ? "★" : "☆"}
            </Text>
          ))}
          {item.reviewCount != null && (
            <Text style={styles.cardReviewCnt}>({item.reviewCount})</Text>
          )}
        </View>

        {/* Add-to-cart button */}
        <TouchableOpacity
          style={[styles.cardAddBtn, isAdded && styles.cardAddBtnDone]}
          onPress={(e) => { e.stopPropagation?.(); onAdd(); }}
          activeOpacity={0.8}
        >
          <Text style={styles.cardAddBtnText}>
            {isAdded ? "✓ Đã thêm" : "🛒 Thêm"}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── SCREEN ────────────────────────────────────────────────────────────────────
export default function ProductDetailScreen() {
  const { width } = useWindowDimensions();
  const isWeb = width > 768;
  const routeParams = useRoute<any>();
  const navigation  = useNavigation<any>();
  const { product } = routeParams.params;

  const addToCart = useCartStore((s) => s.addToCart);
  const { activeCategory, setActiveCategory } = useCategory();

  const [quantity, setQuantity]   = useState(1);
  const [liked, setLiked]         = useState(false);
  const [addedAnim, setAddedAnim] = useState(false);
  const [addedRelId, setAddedRelId] = useState<number | null>(null);

  const { products } = useProducts(
    activeCategory === "all" ? product.cat : activeCategory
  );
  const relatedProducts = products.filter((p) => p.id !== product.id).slice(0, 8);

  const mainSource = getImageSourceByFileName(product.imageUrl) ?? getImageSource(product.image);
  const [selectedSource, setSelectedSource] = useState(mainSource);
  const [imageZoomed, setImageZoomed] = useState(false);
  const imageScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setSelectedSource(mainSource);
    setImageZoomed(false);
    imageScale.setValue(1);
  }, [product.id]);

  const toggleImageZoom = () => {
    const next = !imageZoomed;
    setImageZoomed(next);
    Animated.spring(imageScale, {
      toValue: next ? 1.75 : 1,
      friction: 8,
      tension: 70,
      useNativeDriver: true,
    }).start();
  };

  const handleQuickAdd = () => {
    addToCart(product, quantity);
    setAddedAnim(true);
    setTimeout(() => setAddedAnim(false), 1400);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity);
    navigation.navigate("Checkout");
  };

  const handleRelatedAdd = (item: any) => {
    addToCart(item, 1);
    setAddedRelId(item.id);
    setTimeout(() => setAddedRelId(null), 1200);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.centerWrap, isWeb && { maxWidth: 960, alignSelf: "center" }]}>

          {/* ── TOP: IMAGE + INFO ── */}
          <View style={[styles.topSection, isWeb && styles.topSectionWeb]}>

            {/* Image column */}
            <View style={[styles.imageCol, isWeb && styles.imageColWeb]}>
              <View style={styles.imageWrap}>
                {selectedSource ? (
                  <TouchableOpacity style={styles.zoomTouch} onPress={toggleImageZoom} activeOpacity={0.96}>
                    <Animated.Image source={selectedSource} style={[styles.mainImage, { transform: [{ scale: imageScale }] }]} resizeMode="contain" />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.mainImagePlaceholder}>
                    <Text style={{ fontSize: 52 }}>🥦</Text>
                  </View>
                )}
                <View pointerEvents="none" style={styles.zoomHint}>
                  <Text style={styles.zoomHintText}>{imageZoomed ? "Chạm để thu nhỏ" : "🔍 Chạm để phóng to"}</Text>
                </View>

                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                  <Text style={styles.backArrow}>‹</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.likeBtn} onPress={() => setLiked(!liked)}>
                  <Text style={[styles.likeIcon, liked && styles.likeIconActive]}>♥</Text>
                </TouchableOpacity>

                {product.oldPrice && (
                  <View style={styles.saleBadge}>
                    <Text style={styles.saleBadgeText}>SALE</Text>
                  </View>
                )}
              </View>

              {/* Thumbnails */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={styles.thumbStrip} contentContainerStyle={styles.thumbStripContent}>
                {[mainSource, mainSource, mainSource].map((src, i) => (
                  <TouchableOpacity key={i}
                    style={[styles.thumbWrap, selectedSource === src && styles.thumbWrapActive]}
                    onPress={() => { setSelectedSource(src); setImageZoomed(false); Animated.spring(imageScale, { toValue: 1, useNativeDriver: true }).start(); }}>
                    {src ? (
                      <Image source={src} style={styles.thumb} resizeMode="cover" />
                    ) : (
                      <View style={[styles.thumb, { alignItems: "center", justifyContent: "center" }]}>
                        <Text>🥦</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Info column */}
            <View style={[styles.infoCol, isWeb && styles.infoColWeb]}>

              {/* Tags */}
              <View style={styles.tagRow}>
                {product.cat && (
                  <TouchableOpacity onPress={() => setActiveCategory(product.cat)}>
                    <View style={[styles.tag, activeCategory === product.cat && styles.tagActive]}>
                      <Text style={[styles.tagText, activeCategory === product.cat && styles.tagTextActive]}>
                        {product.cat}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                <View style={styles.tagHot}>
                  <Text style={styles.tagHotText}>🔥 Bán chạy</Text>
                </View>
              </View>

              {/* Name */}
              <Text style={[styles.name, isWeb && styles.nameWeb]}>{product.name}</Text>

              {/* Rating */}
              <StarRating value={product.rating ?? 4.8} count={product.reviewCount ?? 128} />

              {/* Price */}
              <View style={styles.priceBlock}>
                <Text style={[styles.price, isWeb && styles.priceWeb]}>
                  {product.salePrice || product.price}
                </Text>
                {product.oldPrice && (
                  <Text style={styles.oldPrice}>{product.oldPrice}</Text>
                )}
              </View>

              <View style={styles.divider} />

              {/* Info rows */}
              <View style={styles.infoBox}>
                <InfoRow icon="🌱" text="Tươi sạch từ nông trại Đà Lạt" />
                <InfoRow icon="✔️" text="Không hóa chất · Thu hoạch mỗi sáng" />
                <InfoRow icon="🚀" text="Giao trong 2–4 giờ tận nhà" />
              </View>

              {/* Deal */}
              <View style={styles.dealBox}>
                <Text style={styles.dealEmoji}>🎁</Text>
                <View>
                  <Text style={styles.dealTitle}>Ưu đãi hôm nay</Text>
                  <Text style={styles.dealDesc}>Mua 2 tặng 1 · Freeship đơn từ 150k</Text>
                </View>
              </View>

              {/* Quantity */}
              <View style={styles.qtyRow}>
                <Text style={styles.qtyLabel}>Số lượng</Text>
                <View style={styles.qtyControl}>
                  <TouchableOpacity style={styles.qtyBtn}
                    onPress={() => setQuantity(Math.max(1, quantity - 1))}>
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyNum}>{quantity}</Text>
                  <TouchableOpacity style={[styles.qtyBtn, styles.qtyBtnFill]}
                    onPress={() => setQuantity(quantity + 1)}>
                    <Text style={[styles.qtyBtnText, { color: "#fff" }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* CTA Buttons */}
              <View style={styles.btnGroup}>
                <TouchableOpacity
                  style={[styles.cartBtn, addedAnim && styles.cartBtnAdded]}
                  onPress={handleQuickAdd} activeOpacity={0.85}>
                  <Text style={styles.cartBtnText}>
                    {addedAnim ? "✓ Đã thêm vào giỏ!" : "🛒 Thêm vào giỏ"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.buyBtn} onPress={handleBuyNow} activeOpacity={0.85}>
                  <Text style={styles.buyBtnText}>Mua ngay →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── RELATED PRODUCTS ── */}
          <View style={styles.related}>
            <View style={styles.relatedHeader}>
              <View style={styles.relatedAccent} />
              <Text style={styles.relatedTitle}>
                {activeCategory === "all" ? "Sản phẩm liên quan" : `Sản phẩm · ${activeCategory}`}
              </Text>
            </View>

            {relatedProducts.length === 0 ? (
              <Text style={styles.emptyText}>Không có sản phẩm nào trong danh mục này.</Text>
            ) : (
              <View style={styles.grid}>
                {relatedProducts.map((item) => (
                  <RelatedCard
                    key={item.id}
                    item={item}
                    isAdded={String(addedRelId) === String(item.id)}
                    onAdd={() => handleRelatedAdd(item)}
                    onPress={() => navigation.push("ProductDetail", { product: item })}
                  />
                ))}
              </View>
            )}
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: "#FAFAFA" },
  scrollContent: { paddingBottom: 40 },
  centerWrap:    { width: "100%" },

  // Top section
  topSection:    { backgroundColor: "#fff" },
  topSectionWeb: { flexDirection: "row", alignItems: "flex-start", padding: 32, gap: 40, borderBottomWidth: 1, borderColor: "#F0F0F0" },

  // Image column
  imageCol:    { backgroundColor: "#fff" },
  imageColWeb: { flex: 1, maxWidth: 440 },
  imageWrap:   { position: "relative", backgroundColor: "#FAFAFA", overflow: "hidden" },
  zoomTouch:   { width: "100%", aspectRatio: 1, overflow: "hidden" },
  mainImage:   { width: "100%", aspectRatio: 1 },
  zoomHint: { position: "absolute", bottom: 12, alignSelf: "center", backgroundColor: "rgba(0,0,0,0.62)", borderRadius: 18, paddingHorizontal: 11, paddingVertical: 6 },
  zoomHintText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  mainImagePlaceholder: { width: "100%", aspectRatio: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F5F5F5" },

  backBtn: {
    position: "absolute", top: 12, left: 12, zIndex: 10,
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#E8E8E8",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  backArrow: { fontSize: 22, color: "#111", lineHeight: 26, marginLeft: -2 },

  likeBtn: {
    position: "absolute", top: 12, right: 12, zIndex: 10,
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#E8E8E8",
  },
  likeIcon:       { fontSize: 16, color: "#DDD" },
  likeIconActive: { color: "#E53935" },

  saleBadge: {
    position: "absolute", bottom: 12, left: 12,
    backgroundColor: "#E65100", borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  saleBadgeText: { fontSize: 10, fontWeight: "900", color: "#fff" },

  thumbStrip:        { borderTopWidth: 1, borderColor: "#F0F0F0", backgroundColor: "#fff" },
  thumbStripContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  thumbWrap:         { borderRadius: 8, borderWidth: 2, borderColor: "transparent" },
  thumbWrapActive:   { borderColor: "#E65100" },
  thumb:             { width: 50, height: 50, borderRadius: 7, backgroundColor: "#F5F5F5" },

  // Info column
  infoCol:    { padding: 18, backgroundColor: "#fff" },
  infoColWeb: { flex: 1, padding: 0, backgroundColor: "#fff" },

  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  tag:           { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: "#F5F5F5", borderWidth: 1, borderColor: "#E0E0E0" },
  tagActive:     { backgroundColor: "#E65100", borderColor: "#E65100" },
  tagText:       { fontSize: 11, fontWeight: "600", color: "#555" },
  tagTextActive: { color: "#fff" },
  tagHot:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: "#FFF3E0", borderWidth: 1, borderColor: "#FFE0B2" },
  tagHotText:    { fontSize: 11, fontWeight: "600", color: "#E65100" },

  name:    { fontSize: 18, fontWeight: "800", color: "#111", lineHeight: 25, marginBottom: 8, letterSpacing: -0.3 },
  nameWeb: { fontSize: 24 },

  // Rating (detail page)
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 2, marginBottom: 12 },
  star:      { fontSize: 13 },
  starFull:  { color: "#F57C00" },
  starHalf:  { color: "#F57C00" },
  starEmpty: { color: "#DDD" },
  ratingVal: { fontSize: 12, fontWeight: "700", color: "#111", marginLeft: 4 },
  ratingCnt: { fontSize: 11, color: "#AAA" },

  priceBlock: { flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 14 },
  price:      { fontSize: 24, fontWeight: "900", color: "#E65100" },
  priceWeb:   { fontSize: 30 },
  oldPrice:   { fontSize: 14, color: "#C0C0C0", textDecorationLine: "line-through" },

  divider: { height: 1, backgroundColor: "#F5F5F5", marginBottom: 14 },

  infoBox: { backgroundColor: "#FAFAFA", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#F0F0F0", marginBottom: 10, gap: 7 },
  infoRow:  { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  infoIcon: { fontSize: 12, marginTop: 1 },
  infoText: { fontSize: 12, color: "#555", flex: 1, lineHeight: 17 },

  dealBox:   { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFF8F0", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#FFE0B2", marginBottom: 14 },
  dealEmoji: { fontSize: 20 },
  dealTitle: { fontSize: 12, fontWeight: "700", color: "#E65100" },
  dealDesc:  { fontSize: 11, color: "#BF360C", marginTop: 2 },

  qtyRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  qtyLabel:   { fontSize: 13, fontWeight: "700", color: "#111" },
  qtyControl: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn:     { width: 32, height: 32, borderRadius: 8, borderWidth: 1.5, borderColor: "#E0E0E0", alignItems: "center", justifyContent: "center" },
  qtyBtnFill: { backgroundColor: "#E65100", borderColor: "#E65100" },
  qtyBtnText: { fontSize: 16, color: "#111", fontWeight: "600", lineHeight: 20 },
  qtyNum:     { fontSize: 15, fontWeight: "800", minWidth: 22, textAlign: "center", color: "#111" },

  btnGroup:     { gap: 8 },
  cartBtn:      { backgroundColor: "#E65100", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  cartBtnAdded: { backgroundColor: "#2e7d32" },
  cartBtnText:  { color: "#fff", fontSize: 14, fontWeight: "800" },
  buyBtn:     { backgroundColor: "#fff", borderRadius: 12, paddingVertical: 13, alignItems: "center", borderWidth: 1.5, borderColor: "#E65100" },
  buyBtnText: { color: "#E65100", fontSize: 13, fontWeight: "700" },

  // Related section
  related:       { padding: 12, paddingTop: 20 },
  relatedHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  relatedAccent: { width: 4, height: 18, backgroundColor: "#E65100", borderRadius: 2 },
  relatedTitle:  { fontSize: 14, fontWeight: "800", color: "#111" },
  emptyText:     { fontSize: 13, color: "#BBB", textAlign: "center", paddingVertical: 20 },

  // Grid — 4 columns, tight gap
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  // ── REDESIGNED CARD ──────────────────────────────────────────────────────
  card: {
    width: "22%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "#EBEBEB",
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },

  cardImgWrap: { width: "100%", aspectRatio: 1, backgroundColor: "#F5F5F5", overflow: "hidden" },
  cardImg:            { width: "100%", height: "100%" },
  cardImgPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },

  cardBadge:     { position: "absolute", top: 5, left: 5, backgroundColor: "#E65100", borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  cardBadgeText: { fontSize: 8, fontWeight: "800", color: "#fff", letterSpacing: 0.3 },

  cardFavBtn:  { position: "absolute", top: 5, right: 5, width: 24, height: 24, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.90)", alignItems: "center", justifyContent: "center", borderWidth: 0.5, borderColor: "#E0E0E0" },
  cardFavIcon: { fontSize: 12, color: "#CCC" },

  cardBody: { padding: 8 },

  cardName: { fontSize: 11, fontWeight: "600", color: "#111", lineHeight: 15, marginBottom: 4 },

  cardPriceRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginBottom: 4 },
  cardPrice:    { fontSize: 12, fontWeight: "800", color: "#E65100" },
  cardOldPrice: { fontSize: 9.5, color: "#BDBDBD", textDecorationLine: "line-through" },

  // Stars on card
  cardRatingRow: { flexDirection: "row", alignItems: "center", gap: 1, marginBottom: 6 },
  cardStar:      { fontSize: 9 },
  cardStarFull:  { color: "#F57C00" },
  cardStarEmpty: { color: "#DDD" },
  cardReviewCnt: { fontSize: 9, color: "#AAA", marginLeft: 2 },

  cardAddBtn:     { backgroundColor: "#E65100", borderRadius: 7, paddingVertical: 6, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 4 },
  cardAddBtnDone: { backgroundColor: "#2e7d32" },
  cardAddBtnText: { fontSize: 9.5, fontWeight: "700", color: "#fff" },
});
