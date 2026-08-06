import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Modal, Pressable
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useUserStore } from '@/store/userStore';
import { useCartStore } from '@/store/cartStore';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const navItems: { id: keyof RootStackParamList; label: string; icon: string }[] = [
  { id: 'Home',          label: 'Trang chủ',    icon: '🏠' },
  { id: 'Cart',          label: 'Giỏ hàng',     icon: '🛒' },
  { id: 'BulkOrder',     label: 'Ghi bông hàng', icon: '💳' },
  { id: 'OrderTracking', label: 'Theo dõi đơn', icon: '📦' },
];

const menuItems = [
  { icon: '📦', label: 'Đơn hàng của tôi',   action: 'orders'    },
  { icon: '🎁', label: 'Khuyến mãi của tôi', action: 'promo'     },
  { icon: '⭐', label: 'Điểm thưởng VIP',     action: 'vip'       },
  { icon: '🔐', label: 'Tài khoản của tôi',  action: 'taikhoan'  },
  { icon: '🚪', label: 'Đăng xuất',          action: 'logout'    },
 
];

export default function Header() {
  const navigation = useNavigation<NavProp>();
  const [search, setSearch]       = useState('');
  const [activeNav, setActiveNav] = useState<keyof RootStackParamList>('Home');
  const [showMenu, setShowMenu]   = useState(false);

  const user      = useUserStore(state => state.user);
  const clearUser = useUserStore(state => state.clearUser);
  const cartCount = useCartStore(state => state.getTotalItems());

  const handleNav = (id: keyof RootStackParamList) => {
    setActiveNav(id);
    if (id === 'OrderTracking') {
      navigation.navigate('OrderList');
    } else {
      navigation.navigate(id as never);
    }
  };

  const handleMenuAction = (action: string) => {
    setShowMenu(false);
    switch (action) {
      case 'orders':      navigation.navigate('OrderList'); break;
      case 'admin':       navigation.navigate('Admin'); break;
      case 'vip':         navigation.navigate('VIPMembership'); break;
      case 'taikhoan':    navigation.navigate('TaiKhoan'); break;
      case 'logout':      clearUser(); navigation.navigate('Login'); break;
      
      default: break;
    }
  };

  return (
    <View style={styles.wrapper}>

      {/* ROW 1 */}
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => handleNav('Home')}>
          <Text style={styles.logoText}>🥦 FreshVeggies</Text>
        </TouchableOpacity>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.input}
            placeholder="Tìm rau củ quả..."
            placeholderTextColor="#aaa"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <TouchableOpacity style={styles.cartBtn} onPress={() => handleNav('Cart')}>
          <Text style={styles.cartIcon}>🛒</Text>
          {cartCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {user ? (
          <TouchableOpacity style={styles.userBtn} onPress={() => setShowMenu(true)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.username?.[0]?.toUpperCase() ?? 'U'}</Text>
            </View>
            <Text style={styles.userName} numberOfLines={1}>{user.username}</Text>
            <Text style={styles.chevron}>▾</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.authRow}>
            <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginText}>Đăng nhập</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.registerBtn} onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerText}>Đăng ký</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ROW 2: Nav */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.navRow}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}
      >
        {navItems.map(item => (
          <TouchableOpacity
            key={item.id}
            style={[styles.navItem, activeNav === item.id && styles.navItemActive]}
            onPress={() => handleNav(item.id)}
          >
            <Text style={styles.navIcon}>{item.icon}</Text>
            <Text style={[styles.navText, activeNav === item.id && styles.navTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.promoItem}>
          <Text style={styles.navIcon}>🎁</Text>
          <Text style={styles.promoText}>Khuyến mãi</Text>
          <View style={styles.hotBadge}><Text style={styles.hotText}>HOT</Text></View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.vipItem}>
          <Text style={styles.navIcon}>⭐</Text>
          <Text style={styles.vipText}>Thành viên VIP</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* DROPDOWN MENU */}
      <Modal visible={showMenu} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowMenu(false)}>
          {/* dùng Pressable con để chặn sự kiện đóng menu khi bấm vào dropdown */}
          <Pressable style={styles.dropdown}>
            <View style={styles.menuHeader}>
              <View style={styles.menuAvatar}>
                <Text style={styles.menuAvatarText}>{user?.username?.[0]?.toUpperCase() ?? 'U'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuName} numberOfLines={1}>{user?.username}</Text>
                <Text style={styles.menuEmail} numberOfLines={1}>{user?.email}</Text>
                <View style={styles.vipTag}>
                  <Text style={styles.vipTagText}>⭐ Thành viên VIP</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <ScrollView
              style={styles.menuScroll}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {user?.role === 'admin' && (
                <>
                  <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuAction('admin')}>
                    <Text style={styles.menuItemIcon}>🛠️</Text>
                    <Text style={styles.menuItemText}>Quản lý hệ thống</Text>
                  </TouchableOpacity>
                  <View style={styles.divider} />
                </>
              )}

              {menuItems.map(item => (
                <TouchableOpacity
                  key={item.action}
                  style={[styles.menuItem, item.action === 'logout' && styles.menuItemLogout]}
                  onPress={() => handleMenuAction(item.action)}
                >
                  <Text style={styles.menuItemIcon}>{item.icon}</Text>
                  <Text style={[styles.menuItemText, item.action === 'logout' && styles.menuItemTextLogout]}>
                    {item.label}
                  </Text>
                  {item.action !== 'logout' && (
                    <Text style={styles.menuItemChevron}>›</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8f5e9',
    elevation: 4,
    paddingTop: 10,
  },
  topRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingBottom: 8, gap: 8,
  },
  logoText: { fontWeight: '900', color: '#1b5e20', fontSize: 18 },
  searchBox: {
    flex: 1, flexDirection: 'row', backgroundColor: '#f1f8e9',
    borderRadius: 20, paddingHorizontal: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#c8e6c9', height: 38,
  },
  searchIcon: { fontSize: 14, marginRight: 4 },
  input: { flex: 1, fontSize: 13, color: '#333', paddingVertical: 0 },
  cartBtn: { position: 'relative', padding: 4 },
  cartIcon: { fontSize: 24 },
  badge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: '#e53935', borderRadius: 10,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  userBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2e7d32', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  userName: { fontSize: 13, color: '#1b5e20', fontWeight: '700', maxWidth: 70 },
  chevron: { fontSize: 12, color: '#888' },
  authRow: { flexDirection: 'row', gap: 6 },
  loginBtn: { borderWidth: 1, borderColor: '#388e3c', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  loginText: { color: '#388e3c', fontSize: 12, fontWeight: '600' },
  registerBtn: { backgroundColor: '#2e7d32', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  registerText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  navRow: { paddingBottom: 10 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f9f9f9' },
  navItemActive: { backgroundColor: '#e8f5e9' },
  navIcon: { fontSize: 14 },
  navText: { fontSize: 13, color: '#555' },
  navTextActive: { color: '#2e7d32', fontWeight: '700' },
  promoItem: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff3e0', position: 'relative' },
  promoText: { fontSize: 13, color: '#e65100', fontWeight: '700' },
  hotBadge: { backgroundColor: '#e53935', borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1, marginLeft: 2 },
  hotText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  vipItem: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fffde7' },
  vipText: { fontSize: 13, color: '#f57f17', fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: '#00000033' },
  dropdown: {
    position: 'absolute', top: 60, right: 12,
    backgroundColor: '#fff', borderRadius: 16,
    width: 240, elevation: 10,
    shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
    maxHeight: 480, // ← quan trọng: đủ chỗ cho tất cả items
  },
  menuScroll: {
    flexGrow: 0, // ← không chiếm hết không gian
  },
  menuHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: '#f1f8e9' },
  menuAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2e7d32', alignItems: 'center', justifyContent: 'center' },
  menuAvatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  menuName: { fontSize: 15, fontWeight: '800', color: '#1b5e20' },
  menuEmail: { fontSize: 11, color: '#888', marginTop: 1 },
  vipTag: { marginTop: 4, backgroundColor: '#fff9c4', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  vipTagText: { fontSize: 10, color: '#f57f17', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#e8f5e9' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  menuItemLogout: { borderTopWidth: 1, borderTopColor: '#fce4e4' },
  menuItemIcon: { fontSize: 18 },
  menuItemText: { fontSize: 14, color: '#333', flex: 1 },
  menuItemTextLogout: { color: '#e53935', fontWeight: '600' },
  menuItemChevron: { fontSize: 18, color: '#ccc' },
});