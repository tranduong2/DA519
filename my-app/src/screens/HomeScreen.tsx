import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Animated,
} from 'react-native';
import React, { useRef } from 'react';

import { useNavigation } from '@react-navigation/native';

import Hero from '../sections/Hero';
import CategoryGrid from '../sections/CategoryGrid';
import ProductSection from '../sections/ProductSection';
import FlashSale from '../sections/FlashSale';
import Footer from '../sections/Footer';

import { CategoryProvider, useCategory } from '@/context/CategoryContext';
import { useProducts } from '@/hooks/useProducts';
import { useUserStore } from '@/store/userStore';
import { useCartStore } from '@/store/cartStore';

function HomeProductCard({ item, cardWidth, onAdd }: { item: any; cardWidth: any; onAdd: () => void }) {
  const navigation = useNavigation<any>();
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (toValue: number) => Animated.spring(scale, { toValue, friction: 7, tension: 90, useNativeDriver: true }).start();
  const openDetail = () => navigation.navigate('ProductDetail', { product: item });

  return (
    <View style={[styles.card, { width: cardWidth }]}>
      <TouchableOpacity activeOpacity={0.92} onPress={openDetail} onPressIn={() => animate(1.08)} onPressOut={() => animate(1)} style={styles.imageWrapper}>
        <Animated.Image source={item.image} style={[styles.cardImage, { transform: [{ scale }] }]} resizeMode="cover" />
        {item.oldPrice && <View style={styles.saleBadge}><Text style={styles.saleBadgeText}>SALE</Text></View>}
        <View style={styles.imageDetailHint}><Text style={styles.imageDetailHintText}>Xem chi tiết</Text></View>
      </TouchableOpacity>
      <TouchableOpacity onPress={openDetail} activeOpacity={0.7}><Text style={styles.cardName} numberOfLines={2}>{item.name}</Text></TouchableOpacity>
      <View style={styles.priceRow}><Text style={styles.cardPrice}>{Number(item.price).toLocaleString('vi-VN')}đ</Text>{item.oldPrice ? <Text style={styles.cardOldPrice}>{Number(item.oldPrice).toLocaleString('vi-VN')}đ</Text> : null}</View>
      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.btnCart} onPress={onAdd}><Text style={styles.btnCartText}>🛒</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btnDetail} onPress={openDetail}><Text style={styles.btnDetailText}>Chi tiết</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function FeaturedGrid() {
  const navigation = useNavigation<any>();
  const { activeCategory } = useCategory();
  const { products, loading, error } = useProducts(activeCategory);
  const { width } = useWindowDimensions();
  const isWeb = width > 600;
  const addToCart = useCartStore((s) => s.addToCart);

  if (loading)
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={styles.loadingText}>Đang tải sản phẩm...</Text>
      </View>
    );

  if (error)
    return (
      <View style={styles.loadingBox}>
        <Text style={{ color: '#d32f2f' }}>❌ {error}</Text>
        <Text style={styles.errorSub}>Kiểm tra backend có đang chạy không</Text>
      </View>
    );

  const cardWidth = isWeb ? '22.5%' : '47%';

  return (
    <View style={styles.row}>
      {products.map((item) => <HomeProductCard key={item.id} item={item} cardWidth={cardWidth} onAdd={() => addToCart(item, 1)} />)}
    </View>
  );
}

export default function HomeScreen() {
  const user = useUserStore(state => state.user);
  const { width } = useWindowDimensions();
  const isWeb = width > 600;

  return (
    <CategoryProvider>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={[styles.userBox, user?.role === 'admin' && styles.adminBox]}>
          <Text style={[styles.helloText, user?.role === 'admin' && styles.adminText]}>Xin chào 👋</Text>
          <Text style={[styles.userName, user?.role === 'admin' && styles.adminText]}>
            {user?.name || user?.username || 'Khách'}
          </Text>
        </View>

        <Hero />
        <FlashSale />

        {isWeb ? (
          // ── WEB: sidebar trái + content phải ──
          <View style={styles.contentRow}>
            <View style={styles.leftSidebar}>
              <CategoryGrid />
            </View>
            <View style={styles.rightContent}>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionAccent} />
                  <View>
                    <Text style={styles.sectionTitle}>⭐ Sản Phẩm Nổi Bật</Text>
                    <Text style={styles.sectionSub}>Tươi ngon mỗi ngày từ nông trại</Text>
                  </View>
                </View>
                <FeaturedGrid />
              </View>
              <View style={styles.section}>
                <ProductSection />
              </View>
            </View>
          </View>
        ) : (
          // ── MOBILE: dọc ──
          <View style={styles.mobileContent}>
            <CategoryGrid />
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionAccent} />
                <View>
                  <Text style={styles.sectionTitle}>⭐ Sản Phẩm Nổi Bật</Text>
                  <Text style={styles.sectionSub}>Tươi ngon mỗi ngày từ nông trại</Text>
                </View>
              </View>
              <FeaturedGrid />
            </View>
            <View style={styles.section}>
              <ProductSection />
            </View>
          </View>
        )}

        <Footer />

      </ScrollView>
    </CategoryProvider>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: '#f9fbe7', width: '100%', maxWidth: '100%', overflow: 'hidden' },
  scrollContent: { width: '100%', maxWidth: '100%', overflow: 'hidden' },

  userBox:   { padding: 12 },
  adminBox:  { backgroundColor: '#d32f2f' },
  helloText: { fontSize: 13, color: '#66bb6a' },
  userName:  { fontSize: 18, fontWeight: 'bold', color: '#1b5e20' },
  adminText: { color: '#fff' },

  // Web layout
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    gap: 12,
    marginTop: 12,
  },
  leftSidebar:  { width: 220 },
  rightContent: { flex: 1, minWidth: 0 },

  // Mobile layout
  mobileContent: {
    paddingHorizontal: 10,
    marginTop: 8,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },

  section: { paddingBottom: 16 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    marginTop: 12,
  },
  sectionAccent: {
    width: 4,
    height: 36,
    backgroundColor: '#e65100',
    borderRadius: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1b5e20' },
  sectionSub:   { fontSize: 11, color: '#81c784', marginTop: 2 },

  // Grid
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 7,
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
    elevation: 1,
  },

  imageWrapper: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    marginBottom: 6,
    position: 'relative',
  },

  cardImage: { width: '100%', height: '100%' },
  imageDetailHint: { position: 'absolute', left: 6, right: 6, bottom: 6, backgroundColor: 'rgba(27,94,32,0.78)', borderRadius: 7, paddingVertical: 4, alignItems: 'center' },
  imageDetailHintText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  saleBadge: {
    position: 'absolute', top: 4, left: 4,
    backgroundColor: '#e65100',
    borderRadius: 4,
    paddingHorizontal: 4, paddingVertical: 2,
  },
  saleBadgeText: { fontSize: 8, fontWeight: '800', color: '#fff' },

  cardName: {
    fontSize: 11, fontWeight: '600',
    color: '#1b5e20', lineHeight: 15, marginBottom: 4,
  },

  priceRow: {
    flexDirection: 'row', alignItems: 'baseline',
    gap: 4, marginBottom: 6, flexWrap: 'wrap',
  },
  cardPrice:    { fontSize: 12, fontWeight: '800', color: '#e65100' },
  cardOldPrice: { fontSize: 9.5, color: '#bdbdbd', textDecorationLine: 'line-through' },

  btnRow: { flexDirection: 'row', gap: 4 },

  btnCart: {
    backgroundColor: '#2e7d32', borderRadius: 7,
    paddingHorizontal: 8, height: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  btnCartText: { fontSize: 13 },

  btnDetail: {
    flex: 1, borderWidth: 1, borderColor: '#2e7d32',
    borderRadius: 7, height: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  btnDetailText: { color: '#2e7d32', fontSize: 10, fontWeight: '700' },

  loadingBox:  { paddingVertical: 40, alignItems: 'center' },
  loadingText: { color: '#81c784', marginTop: 8 },
  errorSub:    { color: '#9e9e9e', fontSize: 12, marginTop: 4 },
});
