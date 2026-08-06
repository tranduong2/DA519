import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, Image, StatusBar,
  TextInput, ScrollView,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const slides = [
  { image: require('../assets/hero1.jpg'), tag: '🌱 Tươi mỗi ngày', title: 'Rau Củ Quả\nTươi Mỗi Ngày', desc: 'Giao tận nhà trong 2 giờ. Cam kết tươi ngon, an toàn cho cả gia đình.' },
  { image: require('../assets/hero2.jpg'), tag: '🏡 Nông trại sạch', title: 'Thẳng Từ\nNông Trại Sạch', desc: 'Không thuốc trừ sâu, không chất bảo quản. Tươi 100% mỗi sáng.' },
  { image: require('../assets/hero3.jpg'), tag: '🥦 100+ loại rau', title: 'Đa Dạng\nRau Củ Quả', desc: 'Hơn 100 loại rau củ quả tươi ngon, đầy đủ dinh dưỡng cho gia đình.' },
  { image: require('../assets/hero4.jpg'), tag: '⏰ Thu hoạch sáng', title: 'Thu Hoạch\nMỗi Buổi Sáng', desc: 'Đội ngũ nông dân tận tâm, thu hoạch và giao hàng ngay trong ngày.' },
];

const SUGGESTIONS = ['Cải xanh', 'Cà rốt', 'Nấm rơm', 'Dâu tây', 'Bơ', 'Rau muống'];

export default function Hero() {
  const [current, setCurrent]       = useState(0);
  const [search, setSearch]         = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const fadeText   = useRef(new Animated.Value(1)).current;
  const searchScale = useRef(new Animated.Value(1)).current;

  // Auto-slide
  useEffect(() => {
    const interval = setInterval(() => slideTo((current + 1) % slides.length, 'next'), 3500);
    return () => clearInterval(interval);
  }, [current]);

  const slideTo = (index: number, dir: 'next' | 'prev' | 'auto' = 'auto') => {
    if (index === current) return;
    const direction = dir === 'next' || index > current ? -width : width;
    Animated.timing(fadeText, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    Animated.timing(translateX, { toValue: direction, duration: 480, useNativeDriver: true })
      .start(() => {
        setCurrent(index);
        translateX.setValue(-direction);
        Animated.parallel([
          Animated.timing(translateX, { toValue: 0, duration: 480, useNativeDriver: true }),
          Animated.timing(fadeText,   { toValue: 1, duration: 380, useNativeDriver: true }),
        ]).start();
      });
  };

  const onSearchFocus = () => {
    setSearchFocused(true);
    Animated.spring(searchScale, { toValue: 1.02, useNativeDriver: true }).start();
  };
  const onSearchBlur = () => {
    setSearchFocused(false);
    Animated.spring(searchScale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── BACKGROUND SLIDE ── */}
      <Animated.View style={[styles.imageWrap, { transform: [{ translateX }] }]}>
        <Image source={slides[current].image} style={styles.image} resizeMode="cover" />
        <View style={styles.overlay} />
      </Animated.View>

  

   
   

      {/* SEARCH SUGGESTIONS — hiện khi focus */}
      {searchFocused && (
        <View style={styles.suggestions}>
          <Text style={styles.suggestLabel}>Gợi ý tìm kiếm</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestRow}>
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity key={s} style={styles.suggestChip} onPress={() => setSearch(s)}>
                <Text style={styles.suggestChipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── SLIDE CONTENT ── */}
      <Animated.View style={[styles.content, { opacity: fadeText }]}>

        {/* TAG */}
        <View style={styles.pill}>
          <Text style={styles.pillText}>{slides[current].tag}</Text>
        </View>

        {/* TITLE */}
        <Text style={styles.title}>{slides[current].title}</Text>

        {/* DESC */}
        <Text style={styles.desc}>{slides[current].desc}</Text>

        {/* BUTTONS */}
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>🛒 Mua Ngay</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} activeOpacity={0.85}>
            <Text style={styles.btnSecondaryText}>Xem thêm →</Text>
          </TouchableOpacity>
        </View>

        {/* STATS ROW */}
        <View style={styles.statsRow}>
          {[
            { num: '500+', label: 'Khách hàng' },
            { num: '100+', label: 'Sản phẩm' },
            { num: '4.9★', label: 'Đánh giá' },
          ].map((s, i) => (
            <View key={i} style={styles.statItem}>
              <Text style={styles.statNum}>{s.num}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* ── SLIDE DOTS ── */}
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => slideTo(i)}>
            <View style={[styles.dot, i === current && styles.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* ── BOTTOM BADGES ── */}
      <View style={styles.badges}>
        {[
          { icon: '🚚', text: 'Miễn phí từ 200K' },
          { icon: '⚡', text: 'Giao trong 2 giờ' },
          { icon: '✅', text: 'Rau sạch 100%' },
          { icon: '🔒', text: 'Thanh toán an toàn' },
        ].map((b, i) => (
          <View key={i} style={styles.badge}>
            <Text style={styles.badgeIcon}>{b.icon}</Text>
            <Text style={styles.badgeText}>{b.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    height,
    backgroundColor: '#1b5e20',
    overflow: 'hidden',
  },

  // BACKGROUND
  imageWrap: { position: 'absolute', top: 0, left: 0, width, height },
  image: { width, height },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(10,40,10,0.52)',
  },

  // TOP BAR
  topBar: {
    position: 'absolute',
    top: 48, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoIcon: { fontSize: 22 },
  logoText: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  topIcons: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  cartBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 18 },
  cartBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#e53935',
    alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeText: { fontSize: 9, color: '#fff', fontWeight: '700' },

  // SEARCH
  searchWrap: {
    position: 'absolute',
    top: 102, left: 20, right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  clearBtn: { fontSize: 14, color: 'rgba(255,255,255,0.7)', paddingHorizontal: 4 },

  // SUGGESTIONS
  suggestions: {
    position: 'absolute',
    top: 155, left: 20, right: 20,
    backgroundColor: 'rgba(15,50,15,0.92)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    zIndex: 99,
  },
  suggestLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 8, fontWeight: '600' },
  suggestRow: { gap: 8 },
  suggestChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  suggestChipText: { color: '#fff', fontSize: 12, fontWeight: '500' },

  // SLIDE CONTENT
  content: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    bottom: 110,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  pillText: { color: '#e8f5e9', fontSize: 12, fontWeight: '600' },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 48,
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  desc: { fontSize: 14, color: '#c8e6c9', lineHeight: 22, marginBottom: 24, maxWidth: '85%' },

  btnRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  btnPrimary: {
    backgroundColor: '#fff', borderRadius: 12,
    paddingVertical: 13, paddingHorizontal: 22,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  btnPrimaryText: { color: '#2e7d32', fontWeight: '800', fontSize: 14 },
  btnSecondary: {
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 12, paddingVertical: 13, paddingHorizontal: 22,
  },
  btnSecondaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // STATS
  statsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '500', marginTop: 2 },

  // DOTS
  dots: {
    position: 'absolute',
    bottom: 118,
    left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { backgroundColor: '#fff', width: 22, borderRadius: 4 },

  // BOTTOM BADGES
  badges: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingVertical: 13,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badge: { alignItems: 'center', gap: 3 },
  badgeIcon: { fontSize: 18 },
  badgeText: { fontSize: 10, color: '#e8f5e9', fontWeight: '500' },
});