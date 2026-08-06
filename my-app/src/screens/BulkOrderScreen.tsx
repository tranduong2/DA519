import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { getProducts } from '../services/api';
import { useCartStore } from '@/store/cartStore';
import { useUserStore } from '@/store/userStore'; // ✅ thêm
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

type Product = {
  id: string;
  name: string;
  price: number;
  cat: string;
  imageUrl?: string;
};

type SelectedItem = {
  product: Product;
  kg: number;
  checked: boolean;
  note: string;
};

export default function BulkOrderScreen() {
  const navigation = useNavigation<NavProp>();
  const addToCart  = useCartStore(state => state.addToCart);
  const user       = useUserStore(state => state.user); // ✅ thêm

  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Record<string, SelectedItem>>({});
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    getProducts()
      .then(data => {
        const normalized = data.slice(0, 30).map((p: any) => ({
          ...p,
          price: p.priceValue ?? parseFloat(String(p.price).replace(/[^\d]/g, '')) ?? 0,
        }));
        setProducts(normalized);
      })
      .catch(() => Alert.alert('Lỗi', 'Không tải được sản phẩm'))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (product: Product) => {
    setSelected(prev => {
      const exist = prev[product.id];
      if (exist) {
        return { ...prev, [product.id]: { ...exist, checked: !exist.checked } };
      }
      return { ...prev, [product.id]: { product, kg: 1, checked: true, note: '' } };
    });
  };

  const setKg = (id: string, val: string, product: Product) => {
    const num = parseFloat(val);
    if (val === '' || isNaN(num)) {
      setSelected(prev => ({ ...prev, [id]: { ...prev[id], kg: 0 } }));
      return;
    }
    if (num < 0) {
      setSelected(prev => ({ ...prev, [id]: { ...prev[id], kg: 0 } }));
      return;
    }
    if (num > 50) {
      Alert.alert(
        '⚠️ Số lượng lớn',
        `Bạn có chắc muốn đặt ${num} kg ${product.name} không?`,
        [
          {
            text: 'Huỷ', style: 'cancel',
            onPress: () => setSelected(prev => ({ ...prev, [id]: { ...prev[id], kg: 50 } })),
          },
          {
            text: 'Xác nhận',
            onPress: () => setSelected(prev => ({ ...prev, [id]: { ...prev[id], kg: num } })),
          },
        ]
      );
      return;
    }
    setSelected(prev => ({ ...prev, [id]: { ...prev[id], kg: num } }));
  };

  const setNote = (id: string, note: string) => {
    setSelected(prev => ({ ...prev, [id]: { ...prev[id], note } }));
  };

  const adjustKg = (item: Product, delta: number) => {
    if (!selected[item.id]?.checked) toggle(item);
    const cur  = selected[item.id]?.kg ?? 1;
    const next = Math.round((cur + delta) * 10) / 10;
    setKg(item.id, String(Math.max(0, next)), item);
  };

  const checkedItems = Object.values(selected).filter(s => s.checked);
  const totalPrice   = checkedItems.reduce((sum, s) => sum + s.product.price * s.kg, 0);

  const handleAddToCart = () => {
    // ✅ Kiểm tra đăng nhập trước
    if (!user) {
      Alert.alert(
        '🔒 Chưa đăng nhập',
        'Vui lòng đăng nhập để đặt hàng số lượng lớn',
        [
          { text: 'Huỷ', style: 'cancel' },
          { text: 'Đăng nhập', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }

    // ✅ Tính trực tiếp từ selected để tránh stale state
    const items = Object.values(selected).filter(s => s.checked);

    if (items.length === 0) {
      Alert.alert('Chưa chọn sản phẩm', 'Vui lòng tích chọn ít nhất 1 sản phẩm');
      return;
    }
    if (items.some(s => s.kg === 0)) {
      Alert.alert('Lỗi', 'Có sản phẩm đang có số kg = 0, vui lòng kiểm tra lại');
      return;
    }

    navigation.navigate('InvoiceScreen', {
      checkedItems: items.map(s => ({
        product: s.product,
        kg: s.kg,
        note: s.note,
      })),
      orderCode: `DH${Date.now().toString().slice(-8)}`,
      orderDate: new Date().toLocaleString('vi-VN'),
    });
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: Product }) => {
    const sel       = selected[item.id];
    const isChecked = sel?.checked ?? false;
    const kgVal     = sel?.kg ?? 1;

    return (
      <View style={[styles.row, isChecked && styles.rowActive]}>

        {/* Checkbox */}
        <TouchableOpacity style={styles.checkWrap} onPress={() => toggle(item)}>
          <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
            {isChecked && <Text style={styles.checkMark}>✓</Text>}
          </View>
        </TouchableOpacity>

        {/* Info + Note */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cat}>{item.cat}</Text>
          <Text style={styles.price}>{item.price.toLocaleString()}đ / kg</Text>

          {isChecked && (
            <View style={styles.noteWrap}>
              <Text style={styles.noteLabel}>📝 Ghi chú:</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="VD: loại to, còn tươi, không dập..."
                placeholderTextColor="#bbb"
                value={sel?.note ?? ''}
                onChangeText={val => setNote(item.id, val)}
                maxLength={100}
                multiline
              />
            </View>
          )}
        </View>

        {/* Kg controls */}
        <View style={styles.kgCol}>
          <View style={styles.kgWrap}>
            <TouchableOpacity style={styles.kgBtn} onPress={() => adjustKg(item, -0.5)}>
              <Text style={styles.kgBtnText}>−</Text>
            </TouchableOpacity>

            <TextInput
              style={[styles.kgInput, kgVal === 0 && styles.kgInputZero]}
              keyboardType="decimal-pad"
              value={sel ? String(sel.kg) : '1'}
              onFocus={() => { if (!isChecked) toggle(item); }}
              onChangeText={val => {
                if (!isChecked) toggle(item);
                setKg(item.id, val, item);
              }}
              onBlur={() => {
                if (sel?.kg === 0) {
                  setSelected(prev => ({
                    ...prev,
                    [item.id]: { ...prev[item.id], checked: false },
                  }));
                }
              }}
            />

            <TouchableOpacity style={styles.kgBtn} onPress={() => adjustKg(item, 0.5)}>
              <Text style={styles.kgBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.kgLabel}>kg</Text>

          {isChecked && kgVal > 0 && (
            <Text style={styles.subtotal}>
              {(item.price * kgVal).toLocaleString()}đ
            </Text>
          )}
        </View>

      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={{ marginTop: 10, color: '#888' }}>Đang tải sản phẩm...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.title}>🛒 Đặt hàng số lượng lớn</Text>
        <Text style={styles.subtitle}>Tích chọn · Nhập kg · Ghi chú từng sản phẩm</Text>
      </View>

      <View style={styles.searchBox}>
        <Text>🔍 </Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm sản phẩm..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 160 }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {checkedItems.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.footerInfo}>
            <Text style={styles.footerCount}>✅ {checkedItems.length} sản phẩm</Text>
            <Text style={styles.footerTotal}>{totalPrice.toLocaleString()}đ</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={handleAddToCart}>
            {/* ✅ Đổi text theo trạng thái đăng nhập */}
            <Text style={styles.addBtnText}>
              {user ? 'Xem hóa đơn & Đặt hàng' : '🔒 Đăng nhập để đặt hàng'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4faf4' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:   { backgroundColor: '#2e7d32', padding: 16, paddingTop: 20 },
  title:    { fontSize: 20, fontWeight: '900', color: '#fff' },
  subtitle: { fontSize: 12, color: '#a5d6a7', marginTop: 2 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', margin: 12, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#c8e6c9',
  },
  searchInput: { flex: 1, fontSize: 14 },

  row:       { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 12 },
  rowActive: { backgroundColor: '#f1f8e9' },
  separator: { height: 1, backgroundColor: '#e8f5e9' },

  checkWrap:      { marginRight: 10, marginTop: 2 },
  checkbox:       { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#c8e6c9', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  checkMark:      { color: '#fff', fontWeight: '800', fontSize: 14 },

  info:  { flex: 1, marginRight: 8 },
  name:  { fontSize: 14, fontWeight: '700', color: '#1b5e20' },
  cat:   { fontSize: 11, color: '#888', marginTop: 1 },
  price: { fontSize: 12, color: '#388e3c', marginTop: 2 },

  noteWrap:  { marginTop: 8 },
  noteLabel: { fontSize: 11, color: '#888', marginBottom: 3 },
  noteInput: {
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#c8e6c9',
    borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 5,
    fontSize: 12, color: '#333',
    minHeight: 34,
  },

  kgCol:  { alignItems: 'center', gap: 4 },
  kgWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kgBtn:  { width: 28, height: 28, borderRadius: 8, backgroundColor: '#e8f5e9', alignItems: 'center', justifyContent: 'center' },
  kgBtnText: { fontSize: 18, color: '#2e7d32', fontWeight: '700', lineHeight: 22 },
  kgInput:   { width: 44, height: 32, borderWidth: 1, borderColor: '#c8e6c9', borderRadius: 8, textAlign: 'center', fontSize: 13, backgroundColor: '#fff', color: '#1b5e20' },
  kgInputZero: { borderColor: '#e53935', color: '#e53935' },
  kgLabel:   { fontSize: 11, color: '#888' },
  subtotal:  { fontSize: 12, color: '#e65100', fontWeight: '700', marginTop: 2 },

  footer:      { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#e8f5e9', elevation: 10 },
  footerInfo:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  footerCount: { fontSize: 14, color: '#555' },
  footerTotal: { fontSize: 18, fontWeight: '900', color: '#1b5e20' },
  addBtn:      { backgroundColor: '#2e7d32', borderRadius: 16, height: 50, alignItems: 'center', justifyContent: 'center' },
  addBtnText:  { color: '#fff', fontSize: 15, fontWeight: '800' },
});