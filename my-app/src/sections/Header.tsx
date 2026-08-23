import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  ScrollView, StyleSheet, Modal, Pressable, Platform
} from 'react-native';
import { RootStackParamList } from '../navigation/types';
import { navigationRef } from '../navigation/navigationRef';
import { useUserStore } from '@/store/userStore';
import { useCartStore } from '@/store/cartStore';

const navItems: { id: keyof RootStackParamList; label: string; icon: string }[] = [
  { id: 'Home',          label: 'Trang chủ',     icon: '🏠' },
  { id: 'Cart',          label: 'Giỏ hàng',      icon: '🛒' },
  { id: 'BulkOrder',     label: 'Ghi bông hàng', icon: '💳' },
  { id: 'OrderTracking', label: 'Theo dõi đơn',  icon: '📦' },
];

const menuItems = [
  { icon: '📦', label: 'Đơn hàng của tôi',   action: 'orders'    },
  { icon: '🎁', label: 'Khuyến mãi của tôi', action: 'promo'     },
  { icon: '⭐', label: 'Điểm thưởng VIP',     action: 'vip'       },
  { icon: '🔐', label: 'Tài khoản của tôi',  action: 'taikhoan'  },
  { icon: '🚪', label: 'Đăng xuất',          action: 'logout'    },
];

export default function Header() {
  const [activeNav, setActiveNav] = useState<keyof RootStackParamList>('Home');
  const [showMenu, setShowMenu]   = useState(false);

  const user      = useUserStore(state => state.user);
  const clearUser = useUserStore(state => state.clearUser);
  const cartCount = useCartStore(state => state.getTotalItems());

  const isAdmin = user?.role === 'admin';

  const handleNav = (id: keyof RootStackParamList) => {
    setActiveNav(id);
    if (id === 'OrderTracking') {
      navigationRef.navigate('OrderList');
    } else {
      navigationRef.navigate(id as never);
    }
  };

  const handleMenuAction = (action: string) => {
    setShowMenu(false);
    switch (action) {
      case 'taikhoan':         navigationRef.navigate('TaiKhoan');          break;
      case 'orders':           navigationRef.navigate('OrderList');         break;
      case 'admin':            navigationRef.navigate('Admin');             break;
      case 'manageUsers':      navigationRef.navigate('ManageProfile');     break;
      case 'manageProducts':   navigationRef.navigate('ManageProducts');    break;
      case 'manageCategories': navigationRef.navigate('ManageCategories');  break;
      case 'managePromotions': navigationRef.navigate('ManagePromotions');  break;
      case 'manageFlashSale':  navigationRef.navigate('FlashSaleAdmin');    break;
      case 'inventory':        navigationRef.navigate('Inventory');         break;
      case 'promo': {
        const now = new Date();
        navigationRef.navigate('Promotion', { month: now.getMonth() + 1, year: now.getFullYear() });
        break;
      }
      case 'vip':    navigationRef.navigate('VIPMembership'); break;
      case 'logout':
        clearUser();
        navigationRef.navigate('Login');
        break;
      default: break;
    }
  };

  const handlePromo = () => {
    setActiveNav('Promotion' as keyof RootStackParamList);
    const now = new Date();
    navigationRef.navigate('Promotion', { month: now.getMonth() + 1, year: now.getFullYear() });
  };

  const handleVIP = () => {
    setActiveNav('VIPMembership' as keyof RootStackParamList);
    navigationRef.navigate('VIPMembership');
  };

  const handleAdminDashboard = () => {
    setActiveNav('Admin' as keyof RootStackParamList);
    navigationRef.navigate('Admin');
  };

  return (
    <View style={styles.wrapper}>

      {/* ── ROW 1: Logo + Actions ── */}
      <View style={styles.topRow}>

        <TouchableOpacity onPress={() => handleNav('Home')} style={styles.logoWrap}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoIconText}>🥦</Text>
          </View>
          <View>
            <Text style={styles.logoName}>FreshVeggies</Text>
            <Text style={styles.logoTagline}>Nông trại sạch · Đà Lạt</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => handleNav('Cart')}>
            <Text style={styles.iconBtnEmoji}>🛒</Text>
            {cartCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount > 99 ? '99+' : String(cartCount)}</Text>
              </View>
            ) : null}
          </TouchableOpacity>

          {user ? (
            <TouchableOpacity
              style={[styles.userBtn, isAdmin && styles.userBtnAdmin]}
              onPress={() => setShowMenu(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.avatar, isAdmin && styles.avatarAdmin]}>
                <Text style={styles.avatarText}>
                  {user.username?.[0]?.toUpperCase() ?? 'U'}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, isAdmin && styles.userNameAdmin]} numberOfLines={1}>
                  {user.username}
                </Text>
                {isAdmin ? <Text style={styles.adminLabel}>ADMIN</Text> : null}
              </View>
              <Text style={[styles.chevron, isAdmin && styles.chevronAdmin]}>▾</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.authRow}>
              <TouchableOpacity style={styles.loginBtn} onPress={() => navigationRef.navigate('Login')}>
                <Text style={styles.loginText}>Đăng nhập</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.registerBtn} onPress={() => navigationRef.navigate('Register')}>
                <Text style={styles.registerText}>Đăng ký</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <View style={styles.dividerLine} />

      {/* ── ROW 2: Nav tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.navScroll}
        contentContainerStyle={styles.navContent}
      >
        {navItems.map(item => {
          const active = activeNav === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.navTab, active && styles.navTabActive]}
              onPress={() => handleNav(item.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.navIcon}>{item.icon}</Text>
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {item.label}
              </Text>
              {active ? <View style={styles.navUnderline} /> : null}
            </TouchableOpacity>
          );
        })}

        {/* Khuyến mãi */}
        <TouchableOpacity
          style={[styles.navTab, styles.promoTab, activeNav === 'Promotion' && styles.promoTabActive]}
          onPress={handlePromo}
          activeOpacity={0.7}
        >
          <Text style={styles.navIcon}>🎁</Text>
          <Text style={styles.promoLabel}>Khuyến mãi</Text>
          <View style={styles.hotPill}>
            <Text style={styles.hotText}>HOT</Text>
          </View>
        </TouchableOpacity>

        {/* Thành viên VIP */}
        <TouchableOpacity
          style={[styles.navTab, styles.vipTab, activeNav === 'VIPMembership' && styles.vipTabActive]}
          onPress={handleVIP}
          activeOpacity={0.7}
        >
          <Text style={styles.navIcon}>⭐</Text>
          <Text style={styles.vipLabel}>Thành viên VIP</Text>
        </TouchableOpacity>

        {/* Admin Dashboard — chỉ hiện khi role = admin */}
        {isAdmin ? (
          <TouchableOpacity
            style={[
              styles.navTab,
              styles.adminTab,
              activeNav === ('Admin' as keyof RootStackParamList) && styles.adminTabActive,
            ]}
            onPress={handleAdminDashboard}
            activeOpacity={0.7}
          >
            <Text style={styles.navIcon}>🛠️</Text>
            <Text style={styles.adminTabLabel}>Admin Dashboard</Text>
            <View style={styles.adminPillNav}>
              <Text style={styles.adminPillNavText}>ADMIN</Text>
            </View>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {/* ── Dropdown Menu ── */}
      <Modal visible={showMenu} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowMenu(false)}>
          <Pressable style={styles.dropdown}>

            <View style={[styles.menuHeader, isAdmin && styles.menuHeaderAdmin]}>
              <View style={[styles.menuAvatar, isAdmin && styles.menuAvatarAdmin]}>
                <Text style={styles.menuAvatarText}>
                  {user?.username?.[0]?.toUpperCase() ?? 'U'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuName, isAdmin && styles.menuNameAdmin]} numberOfLines={1}>
                  {user?.username}
                </Text>
                <Text style={styles.menuEmail} numberOfLines={1}>{user?.email}</Text>
                {isAdmin ? (
                  <View style={styles.adminPill}>
                    <Text style={styles.adminPillText}>⚙️ Quản trị viên</Text>
                  </View>
                ) : (
                  <View style={styles.vipPill}>
                    <Text style={styles.vipPillText}>⭐ Thành viên VIP</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.menuDivider} />

            {/* Admin-only items */}
            {isAdmin ? (
              <>
                {[
                  { action: 'admin',            icon: '🛠️', label: 'Quản lý hệ thống'    },
                  { action: 'manageUsers',       icon: '👥', label: 'Quản lý người dùng'  },
                  { action: 'manageProducts',    icon: '🥬', label: 'Quản lý sản phẩm'    },
                  { action: 'manageCategories',  icon: '📂', label: 'Quản lý danh mục'    },
                  { action: 'managePromotions',  icon: '🎁', label: 'Quản lý khuyến mãi'  },
                  { action: 'manageFlashSale',   icon: '⚡', label: 'Quản lý Flash Sale'  },
                  { action: 'inventory',         icon: '🏪', label: 'Kho hàng & Thống kê' },
                ].map(item => (
                  <TouchableOpacity
                    key={item.action}
                    style={styles.menuItem}
                    onPress={() => handleMenuAction(item.action)}
                  >
                    <Text style={styles.menuItemIcon}>{item.icon}</Text>
                    <Text style={styles.menuItemText}>{item.label}</Text>
                    <Text style={styles.menuItemArrow}>›</Text>
                  </TouchableOpacity>
                ))}
                <View style={styles.menuDivider} />
                <TouchableOpacity
                  style={[styles.menuItem, styles.menuItemLogout]}
                  onPress={() => handleMenuAction('logout')}
                >
                  <Text style={styles.menuItemIcon}>🚪</Text>
                  <Text style={[styles.menuItemText, styles.menuItemTextLogout]}>Đăng xuất</Text>
                </TouchableOpacity>
              </>
            ) : null}

            {/* Customer-only items: admin menu chỉ giữ các chức năng quản trị ở trên */}
            {!isAdmin && menuItems.map(item => (
              <TouchableOpacity
                key={item.action}
                style={[styles.menuItem, item.action === 'logout' && styles.menuItemLogout]}
                onPress={() => handleMenuAction(item.action)}
              >
                <Text style={styles.menuItemIcon}>{item.icon}</Text>
                <Text style={[
                  styles.menuItemText,
                  item.action === 'logout' && styles.menuItemTextLogout,
                ]}>
                  {item.label}
                </Text>
                {item.action !== 'logout' ? (
                  <Text style={styles.menuItemArrow}>›</Text>
                ) : null}
              </TouchableOpacity>
            ))}

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
    borderBottomColor: '#EBEBEB',
    paddingTop: Platform.OS === 'ios' ? 48 : 10,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8 },
      android: { elevation: 4 },
      web:     { boxShadow: '0 2px 12px rgba(0,0,0,0.07)' } as any,
    }),
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#F0FAF0', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#D4EDDA',
  },
  logoIconText: { fontSize: 20 },
  logoName:    { fontSize: 17, fontWeight: '900', color: '#111', letterSpacing: -0.4 },
  logoTagline: { fontSize: 10, color: '#999', marginTop: 1, letterSpacing: 0.2 },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    position: 'relative', width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center',
  },
  iconBtnEmoji: { fontSize: 18 },
  badge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#E53935', borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  userBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F5F5F5', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 6, maxWidth: 160,
  },
  userBtnAdmin: { backgroundColor: '#111' },
  avatar:      { width: 26, height: 26, borderRadius: 8, backgroundColor: '#2e7d32', alignItems: 'center', justifyContent: 'center' },
  avatarAdmin: { backgroundColor: '#fff' },
  avatarText:  { color: '#fff', fontWeight: '800', fontSize: 12 },
  userInfo:    { flex: 1 },
  userName:    { fontSize: 13, fontWeight: '700', color: '#111', letterSpacing: -0.2 },
  userNameAdmin: { color: '#fff' },
  adminLabel:  { fontSize: 9, fontWeight: '800', color: '#aaa', letterSpacing: 1, marginTop: 1 },
  chevron:      { fontSize: 11, color: '#999' },
  chevronAdmin: { color: '#666' },

  authRow:      { flexDirection: 'row', gap: 6 },
  loginBtn:     { borderWidth: 1.5, borderColor: '#111', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  loginText:    { color: '#111', fontSize: 12, fontWeight: '700' },
  registerBtn:  { backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  registerText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  dividerLine: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 16 },

  navScroll:  {},
  navContent: { paddingHorizontal: 16, paddingVertical: 2, gap: 4 },
  navTab:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, position: 'relative' },
  navTabActive:  { backgroundColor: '#F5F5F5' },
  navIcon:       { fontSize: 13 },
  navLabel:      { fontSize: 13, color: '#888', fontWeight: '500' },
  navLabelActive:{ color: '#111', fontWeight: '700' },
  navUnderline:  { position: 'absolute', bottom: 4, left: 14, right: 14, height: 2, backgroundColor: '#111', borderRadius: 1 },

  promoTab:      { backgroundColor: '#FFF3E0' },
  promoTabActive:{ backgroundColor: '#FFE0B2' },
  promoLabel:    { fontSize: 13, color: '#E65100', fontWeight: '700' },
  hotPill:       { backgroundColor: '#E53935', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1, marginLeft: 2 },
  hotText:       { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  vipTab:      { backgroundColor: '#FFFDE7' },
  vipTabActive:{ backgroundColor: '#FFF9C4' },
  vipLabel:    { fontSize: 13, color: '#F57F17', fontWeight: '700' },

  adminTab: { backgroundColor: '#F3F0FF', borderWidth: 1, borderColor: '#D4C5FF' },
  adminTabActive: { backgroundColor: '#EAE0FF', borderColor: '#9C72FF' },
  adminTabLabel: { fontSize: 13, color: '#5B21B6', fontWeight: '700' },
  adminPillNav: { backgroundColor: '#5B21B6', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1, marginLeft: 2 },
  adminPillNavText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  dropdown: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 108 : 70,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 18,
    width: 260,
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20 },
      android: { elevation: 12 },
      web:     { boxShadow: '0 8px 32px rgba(0,0,0,0.14)' } as any,
    }),
  },
  menuHeader:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: '#FAFAFA' },
  menuHeaderAdmin: { backgroundColor: '#111' },
  menuAvatar:      { width: 46, height: 46, borderRadius: 14, backgroundColor: '#2e7d32', alignItems: 'center', justifyContent: 'center' },
  menuAvatarAdmin: { backgroundColor: '#fff' },
  menuAvatarText:  { color: '#fff', fontSize: 20, fontWeight: '900' },
  menuName:        { fontSize: 15, fontWeight: '800', color: '#111', letterSpacing: -0.2 },
  menuNameAdmin:   { color: '#fff' },
  menuEmail:       { fontSize: 11, color: '#999', marginTop: 2 },
  adminPill:     { marginTop: 5, alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  adminPillText: { fontSize: 10, color: '#111', fontWeight: '800', letterSpacing: 0.5 },
  vipPill:       { marginTop: 5, alignSelf: 'flex-start', backgroundColor: '#FFF9C4', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  vipPillText:   { fontSize: 10, color: '#F57F17', fontWeight: '700' },

  menuDivider:        { height: 1, backgroundColor: '#F0F0F0' },
  menuItem:           { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 14 },
  menuItemLogout:     { borderTopWidth: 1, borderTopColor: '#FEE2E2' },
  menuItemIcon:       { fontSize: 17, width: 22, textAlign: 'center' },
  menuItemText:       { flex: 1, fontSize: 14, color: '#222', fontWeight: '500' },
  menuItemTextLogout: { color: '#E53935', fontWeight: '600' },
  menuItemArrow:      { fontSize: 18, color: '#CCC', fontWeight: '300' },
});
