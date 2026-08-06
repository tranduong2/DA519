import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Image, ActivityIndicator, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BASE_URL } from '@/services/api';
import { imageMap } from '../assets/imageMap';

interface Product {
  id: number;
  name: string;
  price: string;
  oldPrice?: string;
  salePrice?: string;
  imageUrl?: string;
  cat?: string;
}

// ✅ Dùng imageMap thay vì URL
function getImageSource(imageUrl?: string) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return { uri: imageUrl };
  const fileName = imageUrl.split('/').pop() || '';
  return imageMap[fileName] ?? null;
}

function useCountdown(targetHour = 23, targetMin = 59) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date();
      end.setHours(targetHour, targetMin, 59, 0);
      if (end < now) end.setDate(end.getDate() + 1);
      const diff = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
      setTimeLeft({ h: Math.floor(diff / 3600), m: Math.floor((diff % 3600) / 60), s: diff % 60 });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return timeLeft;
}

function pad(n: number) { return String(n).padStart(2, '0'); }

const CARD_WIDTH = 148;
const CARD_GAP   = 12;

export default function FlashSale() {
  const navigation = useNavigation<any>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const { h, m, s } = useCountdown();

  const scrollRef    = useRef<ScrollView>(null);
  const scrollX      = useRef(0);
  const isUserScroll = useRef(false);

  useEffect(() => {
    fetch(`${BASE_URL}/products/flashsale`)
      .then(r => r.json())
      .then(data => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setError('Không thể tải sản phẩm'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (products.length === 0) return;
    const totalWidth = products.length * (CARD_WIDTH + CARD_GAP);
    const id = setInterval(() => {
      if (isUserScroll.current) return;
      scrollX.current += CARD_WIDTH + CARD_GAP;
      if (scrollX.current >= totalWidth) scrollX.current = 0;
      scrollRef.current?.scrollTo({ x: scrollX.current, animated: true });
    }, 2200);
    return () => clearInterval(id);
  }, [products]);

  return (
    <View style={styles.section}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.flashBadge}>
            <Text style={styles.flashIcon}>⚡</Text>
            <Text style={styles.flashBadgeText}>FLASH SALE</Text>
          </View>
          <Text style={styles.headerSub}>Chỉ hôm nay · Giảm đến 30%</Text>
        </View>

        <View style={styles.countdown}>
          <Text style={styles.countLabel}>Kết thúc sau</Text>
          <View style={styles.countRow}>
            {[pad(h), pad(m), pad(s)].map((val, i) => (
              <React.Fragment key={i}>
                <View style={styles.countUnit}>
                  <Text style={styles.countNum}>{val}</Text>
                </View>
                {i < 2 && <Text style={styles.countSep}>:</Text>}
              </React.Fragment>
            ))}
          </View>
        </View>
      </View>

      {/* ── States ── */}
      {loading && (
        <View style={styles.stateBox}>
          <ActivityIndicator size="small" color="#E65100" />
          <Text style={styles.stateText}>Đang tải...</Text>
        </View>
      )}
      {!!error && !loading && (
        <View style={styles.stateBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {!loading && !error && products.length === 0 && (
        <View style={styles.stateBox}>
          <Text style={styles.emptyText}>Chưa có sản phẩm flash sale hôm nay 😊</Text>
        </View>
      )}

      {/* ── Products ── */}
      {!loading && !error && products.length > 0 && (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          onScrollBeginDrag={() => { isUserScroll.current = true; }}
          onMomentumScrollEnd={e => {
            scrollX.current = e.nativeEvent.contentOffset.x;
            isUserScroll.current = false;
          }}
          decelerationRate="fast"
        >
          {products.map(item => {
            // ✅ Dùng getImageSource thay vì getImageUri
            const imageSource  = getImageSource(item.imageUrl);
            const displayPrice = item.salePrice || item.price;
            const hasDiscount  = !!item.oldPrice && item.oldPrice !== displayPrice;

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => navigation.navigate('ProductDetail', { product: item })}
                activeOpacity={0.88}
              >
                <View style={styles.imageWrap}>
                  {/* ✅ source={imageSource} thay vì source={{ uri }} */}
                  {imageSource ? (
                    <Image source={imageSource} style={styles.image} resizeMode="cover" />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.placeholderIcon}>🥦</Text>
                    </View>
                  )}
                  {hasDiscount && (
                    <View style={styles.saleBadge}>
                      <Text style={styles.saleBadgeText}>SALE</Text>
                    </View>
                  )}
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.cardPrice}>{displayPrice}</Text>
                  {hasDiscount && (
                    <Text style={styles.cardOldPrice}>{item.oldPrice}</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.cardBtn}
                  onPress={() => navigation.navigate('ProductDetail', { product: item })}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cardBtnText}>Mua ngay</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ── View all ── */}
      {!loading && products.length > 0 && (
        <TouchableOpacity style={styles.viewAll} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.viewAllText}>Xem tất cả ưu đãi</Text>
          <Text style={styles.viewAllArrow}>→</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFE0B2',
    ...Platform.select({
      ios:     { shadowColor: '#E65100', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 6 }, shadowRadius: 16 },
      android: { elevation: 4 },
      web:     { boxShadow: '0 4px 24px rgba(230,81,0,0.10)' } as any,
    }),
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    backgroundColor: '#FFF8F0',
    borderBottomWidth: 1, borderBottomColor: '#FFE0B2',
  },
  headerLeft: { gap: 5 },
  flashBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: '#E65100', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5, gap: 4,
  },
  flashIcon: { fontSize: 12 },
  flashBadgeText: { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 1.2 },
  headerSub: { fontSize: 12, color: '#BF360C', fontWeight: '500' },
  countdown: { alignItems: 'flex-end', gap: 3 },
  countLabel: { fontSize: 10, color: '#BF360C', fontWeight: '600', letterSpacing: 0.3 },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  countUnit: {
    backgroundColor: '#E65100', borderRadius: 8,
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  countNum: { fontSize: 15, fontWeight: '900', color: '#fff', fontVariant: ['tabular-nums'] },
  countSep: { fontSize: 16, fontWeight: '900', color: '#E65100', marginBottom: 2 },
  stateBox: { paddingVertical: 32, alignItems: 'center', gap: 8 },
  stateText: { fontSize: 12, color: '#BBB' },
  errorText: { fontSize: 13, color: '#E53935' },
  emptyText: { fontSize: 13, color: '#BBB' },
  listContent: { paddingHorizontal: 16, paddingVertical: 16, gap: CARD_GAP },
  card: {
    width: CARD_WIDTH, backgroundColor: '#fff',
    borderRadius: 14, borderWidth: 1, borderColor: '#F5F5F5', overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6 },
      android: { elevation: 2 },
      web:     { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } as any,
    }),
  },
  imageWrap: { width: '100%', aspectRatio: 1, backgroundColor: '#FFF3E0' },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF3E0' },
  placeholderIcon: { fontSize: 36 },
  saleBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: '#E65100', borderRadius: 5,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  saleBadgeText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.8 },
  cardBody: { padding: 10, paddingBottom: 6 },
  cardName: { fontSize: 12, fontWeight: '700', color: '#111', lineHeight: 17, marginBottom: 4 },
  cardPrice: { fontSize: 15, fontWeight: '900', color: '#E65100' },
  cardOldPrice: { fontSize: 11, color: '#C0C0C0', textDecorationLine: 'line-through', marginTop: 1 },
  cardBtn: {
    margin: 10, marginTop: 6,
    backgroundColor: '#E65100', borderRadius: 9, paddingVertical: 9, alignItems: 'center',
  },
  cardBtnText: { fontSize: 12, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
  viewAll: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: '#FFF0E6',
  },
  viewAllText: { fontSize: 13, fontWeight: '700', color: '#E65100' },
  viewAllArrow: { fontSize: 14, fontWeight: '700', color: '#E65100' },
});