import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  ActivityIndicator, Platform, UIManager,
} from 'react-native';
import { useCategory } from '@/context/CategoryContext';
import { BASE_URL } from '@/services/api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type CategoryItem = {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string | null;
  children?: CategoryItem[];
};

const DEFAULT_CHILDREN: Record<string, string[]> = {
  'rau-la':   ['Rau muống', 'Cải thảo', 'Cải xanh', 'Xà lách', 'Rau dền'],
  'cu':       ['Cà rốt', 'Củ cải', 'Khoai tây', 'Hành tây', 'Gừng'],
  'qua':      ['Cà chua', 'Dưa leo', 'Khổ qua', 'Bí đỏ', 'Ớt'],
  'nam':      ['Nấm rơm', 'Nấm đông cô', 'Nấm bào ngư', 'Nấm kim châm'],
  'rau-thom': ['Húng quế', 'Ngò rí', 'Tía tô', 'Lá lốt', 'Sả'],
  'trai-cay': ['Chuối', 'Xoài', 'Dưa hấu', 'Cam', 'Bơ'],
  'dac-san':  ['Đặc sản Đà Lạt', 'Đặc sản miền Tây', 'Đặc sản miền Bắc'],
};

const EMOJI_MAP: Record<string, string> = {
  'all':      '🛒',
  'rau-la':   '🥬',
  'cu':       '🥕',
  'qua':      '🍅',
  'nam':      '🍄',
  'rau-thom': '🌱',
  'hoa-tuoi': '🌸',
  'dac-san':  '🎁',
  'trai-cay': '🍓',
};

const ALL_ITEM = { id: 0, slug: 'all', name: 'Tất cả sản phẩm' };
const GREEN      = '#2e7d32';
const DARK_GREEN = '#1b5e20';

// ── Animated chevron ──────────────────────────────────────────────────────────
function Chevron({ open }: { open: boolean }) {
  const rot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(rot, {
      toValue: open ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [open]);

  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });

  return (
    <Animated.Text style={[styles.arrow, { transform: [{ rotate }], color: open ? GREEN : '#9E9E9E' }]}>
      ›
    </Animated.Text>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CategoryGrid() {
  const { activeCategory, setActiveCategory } = useCategory();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE_URL}/categories`)
      .then(r => r.json())
      .then(data => setCategories(data.categories ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (slug: string) => {
    setExpanded(prev => (prev === slug ? null : slug));
  };

  const handleSelect = (slug: string) => {
    setActiveCategory(slug);
    setExpanded(null);
  };

  const allItems = [ALL_ITEM, ...categories];

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>☰</Text>
        <Text style={styles.headerTitle}>DANH MỤC SẢN PHẨM</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={GREEN} style={{ marginVertical: 16 }} />
      ) : (
        <View>
          {allItems.map((cat, index) => {
            const isActive    = activeCategory === cat.slug;
            const isExpanded  = expanded === cat.slug;
            const children    = (cat as any).children ?? DEFAULT_CHILDREN[cat.slug];
            const hasChildren = !!children && children.length > 0;
            const emoji       = EMOJI_MAP[cat.slug];

            return (
              <View key={cat.slug}>
                {/* Main row */}
                <TouchableOpacity
                  style={[
                    styles.row,
                    isActive    && styles.rowActive,
                    index === 0 && styles.rowFirst,
                  ]}
                  onPress={() => hasChildren ? toggleExpand(cat.slug) : handleSelect(cat.slug)}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowLeft}>
                    {emoji && <Text style={styles.rowEmoji}>{emoji}</Text>}
                    <Text
                      style={[styles.rowText, isActive && styles.rowTextActive]}
                      numberOfLines={1}
                    >
                      {cat.name.toUpperCase()}
                    </Text>
                  </View>

                  {hasChildren ? (
                    <Chevron open={isExpanded} />
                  ) : isActive ? (
                    <View style={styles.activeDot} />
                  ) : null}
                </TouchableOpacity>

                {/* Sub-items */}
                {hasChildren && isExpanded && (
                  <View style={styles.subList}>
                    {/* "View all" option */}
                    <TouchableOpacity
                      style={[styles.subRow, activeCategory === cat.slug && styles.subRowActive]}
                      onPress={() => handleSelect(cat.slug)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.subBullet, activeCategory === cat.slug && styles.subBulletActive]} />
                      <Text style={[styles.subText, activeCategory === cat.slug && styles.subTextActive]}>
                        Tất cả {cat.name.toLowerCase()}
                      </Text>
                    </TouchableOpacity>

                    {children.map((child: any, i: number) => {
                      const childSlug = typeof child === 'string'
                        ? `${cat.slug}__${child}`
                        : child.slug;
                      const childName   = typeof child === 'string' ? child : child.name;
                      const childActive = activeCategory === childSlug;

                      return (
                        <TouchableOpacity
                          key={i}
                          style={[styles.subRow, childActive && styles.subRowActive]}
                          onPress={() => handleSelect(childSlug)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.subBullet, childActive && styles.subBulletActive]} />
                          <Text style={[styles.subText, childActive && styles.subTextActive]}>
                            {childName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <View style={styles.divider} />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    overflow: 'hidden',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK_GREEN,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  headerIcon: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '900',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.8,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  rowFirst: {
    backgroundColor: '#FFFDE7',
  },
  rowActive: {
    backgroundColor: '#F1F8E9',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
  },
  rowEmoji: { fontSize: 15 },
  rowText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#212121',
    letterSpacing: 0.2,
    flex: 1,
  },
  rowTextActive: { color: GREEN },

  arrow: {
    fontSize: 20,
    fontWeight: '300',
    lineHeight: 22,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: GREEN,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#EEEEEE',
    marginLeft: 14,
  },

  // Sub-items
  subList: {
    backgroundColor: '#FAFAFA',
    borderLeftWidth: 3,
    borderLeftColor: GREEN,
    marginLeft: 14,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 10,
  },
  subRowActive: {
    backgroundColor: '#E8F5E9',
  },
  subBullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#BDBDBD',
  },
  subBulletActive: {
    backgroundColor: GREEN,
  },
  subText: {
    fontSize: 12,
    color: '#616161',
    fontWeight: '500',
  },
  subTextActive: {
    color: GREEN,
    fontWeight: '700',
  },
});