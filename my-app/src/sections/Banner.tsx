import React, { useRef, useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Image,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

const { width } = Dimensions.get('window');

const SLIDE_WIDTH = width - 32;
const SLIDE_MARGIN = 16;
const SNAP_INTERVAL = SLIDE_WIDTH + SLIDE_MARGIN;

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const BANNERS = [
  {
    id: '1',
    image: 'https://picsum.photos/800/300?random=1',
    tag: 'Mua sắm',
    title: 'Rau sạch\ngiao tận nhà',
    subtitle: 'Tươi từ nông trại đến bàn ăn mỗi ngày',
    btnText: 'Mua ngay',
    route: 'Home' as keyof RootStackParamList,
    accent: '#1b5e20',
  },
  {
    id: '2',
    image: 'https://picsum.photos/800/300?random=2',
    tag: 'Khuyến mãi',
    title: 'Giảm đến\n30% hôm nay',
    subtitle: 'Ưu đãi đặc biệt cho đơn hàng đầu tiên',
    btnText: 'Xem ưu đãi',
    route: 'Promotion' as keyof RootStackParamList,
    accent: '#b71c1c',
  },
  {
    id: '3',
    image: 'https://picsum.photos/800/300?random=3',
    tag: 'Thành viên VIP',
    title: 'Mua nhiều\ntích điểm nhận quà',
    subtitle: 'Chương trình khách hàng thân thiết',
    btnText: 'Tham gia ngay',
    route: 'VIPMembership' as keyof RootStackParamList,
    accent: '#e65100',
  },
  {
    id: '4',
    image: 'https://picsum.photos/800/300?random=4',
    tag: 'Đơn hàng',
    title: 'Theo dõi\nđơn hàng realtime',
    subtitle: 'Biết ngay đơn hàng đang ở đâu',
    btnText: 'Xem đơn hàng',
    route: 'OrderTracking' as keyof RootStackParamList,
    accent: '#1565c0',
  },
];

export default function Banner() {
  const navigation = useNavigation<NavProp>();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Auto-play
  useEffect(() => {
    const timer = setInterval(() => {
      const next = (activeIndex + 1) % BANNERS.length;
      scrollRef.current?.scrollTo({ x: next * SNAP_INTERVAL, animated: true });
      setActiveIndex(next);
    }, 4000);
    return () => clearInterval(timer);
  }, [activeIndex]);

  const handleScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SNAP_INTERVAL);
    setActiveIndex(index);
  };

  const handlePress = (banner: (typeof BANNERS)[number]) => {
    switch (banner.route) {
      case 'Promotion': {
        const now = new Date();
        navigation.navigate('Promotion', {
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        });
        break;
      }
      case 'VIPMembership':
        navigation.navigate('VIPMembership');
        break;
      case 'OrderTracking':
        navigation.navigate('OrderTracking', {
          orderId: '',
          payMethod: 'cod',
          totalAmount: 0,
        });
        break;
      default:
        navigation.navigate(banner.route as any);
        break;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={{ paddingLeft: SLIDE_MARGIN }}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
      >
        {BANNERS.map((banner, idx) => (
          <View key={banner.id} style={styles.slide}>
            {/* Ảnh nền */}
            <Image source={{ uri: banner.image }} style={styles.image} />

            {/* Overlay gradient tối dần từ dưới */}
            <View style={styles.gradientOverlay} />

            {/* Nội dung */}
            <View style={styles.content}>
              {/* Tag pill */}
              <View style={[styles.tagPill, { backgroundColor: banner.accent }]}>
                <Text style={styles.tagText}>{banner.tag}</Text>
              </View>

              {/* Tiêu đề lớn */}
              <Text style={styles.title}>{banner.title}</Text>

              {/* Subtitle */}
              <Text style={styles.subtitle}>{banner.subtitle}</Text>

              {/* CTA */}
              <TouchableOpacity
                style={styles.btn}
                onPress={() => handlePress(banner)}
                activeOpacity={0.85}
              >
                <Text style={styles.btnText}>{banner.btnText}</Text>
                <Text style={styles.btnArrow}>→</Text>
              </TouchableOpacity>
            </View>

            {/* Số thứ tự slide */}
            <View style={styles.slideCounter}>
              <Text style={styles.slideCounterText}>
                {String(idx + 1).padStart(2, '0')}/{String(BANNERS.length).padStart(2, '0')}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {BANNERS.map((banner, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => {
              scrollRef.current?.scrollTo({ x: i * SNAP_INTERVAL, animated: true });
              setActiveIndex(i);
            }}
          >
            <View
              style={[
                styles.dot,
                i === activeIndex && styles.dotActive,
                i === activeIndex && { backgroundColor: BANNERS[activeIndex].accent },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    marginBottom: 4,
  },

  slide: {
    width: SLIDE_WIDTH,
    height: 200,
    marginRight: SLIDE_MARGIN,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#111',
    // shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 16,
      },
      android: { elevation: 6 },
      web: { boxShadow: '0 6px 24px rgba(0,0,0,0.15)' } as any,
    }),
  },

  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.55,
  },

  // gradient giả bằng View nửa trong suốt
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    // tối ở đáy, trong ở trên — dùng màu nền đen mờ dần
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-end',
  },

  tagPill: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 28,
    letterSpacing: -0.5,
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 14,
    lineHeight: 17,
  },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    gap: 6,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111',
    letterSpacing: 0.2,
  },
  btnArrow: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111',
  },

  // Số slide góc trên phải
  slideCounter: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  slideCounterText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },

  // Dots
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DDD',
  },
  dotActive: {
    width: 22,
    height: 6,
    borderRadius: 3,
  },
});
