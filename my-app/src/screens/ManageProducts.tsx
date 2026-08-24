import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, SafeAreaView, Switch, ScrollView
} from 'react-native';
import { useUserStore } from '@/store/userStore';
import { BASE_URL } from '@/services/api';

type Product = {
  id: number;
  name: string;
  price?: string | null;
  oldPrice?: string | null;
  cat?: string | null;
  imageUrl?: string | null;
  isFlashSale?: boolean;
  salePrice?: string | null;
  priceValue?: number;
};

const emptyForm = {
  name: '', price: '', oldPrice: '', cat: '',
  imageUrl: '', isFlashSale: false, salePrice: '', priceValue: '',
};

export default function ManageProducts() {
  const token = useUserStore(s => s.token);
  const hasHydrated = useUserStore(s => s.hasHydrated);
  const user = useUserStore(s => s.user);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  if (hasHydrated && user?.role !== 'admin') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, color: '#c62828' }}>⛔ Không có quyền truy cập</Text>
        </View>
      </SafeAreaView>
    );
  }

  const fetchProducts = async () => {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${BASE_URL}/admin/products`, { headers });
      if (!res.ok) throw new Error(`Lỗi ${res.status}`);
      const data = await res.json();
      setProducts(data.products ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Lỗi');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (hasHydrated) fetchProducts(); }, [hasHydrated]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      price: p.price ?? '',
      oldPrice: p.oldPrice ?? '',
      cat: p.cat ?? '',
      imageUrl: p.imageUrl ?? '',
      isFlashSale: !!p.isFlashSale,
      salePrice: p.salePrice ?? '',
      priceValue: String(p.priceValue ?? ''),
    });
    setModalVisible(true);
  };

  const save = async () => {
    if (!form.name) { Alert.alert('Tên sản phẩm là bắt buộc'); return; }
    try {
      setLoading(true);
      const body = { ...form, priceValue: form.priceValue ? parseInt(form.priceValue) : 0 };
      if (editing) {
        const res = await fetch(`${BASE_URL}/admin/products/${editing.id}`, { method: 'PUT', headers, body: JSON.stringify(body) });
        if (!res.ok) throw new Error('Cập nhật thất bại');
      } else {
        const res = await fetch(`${BASE_URL}/admin/products`, { method: 'POST', headers, body: JSON.stringify(body) });
        if (!res.ok) throw new Error('Tạo thất bại');
      }
      setModalVisible(false);
      fetchProducts();
    } catch (e: any) {
      Alert.alert('Lỗi', e.message);
    } finally { setLoading(false); }
  };

  const remove = (id: number) => {
    Alert.alert('Xác nhận', 'Xóa sản phẩm này?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        try {
          setLoading(true);
          const res = await fetch(`${BASE_URL}/admin/products/${id}`, { method: 'DELETE', headers });
          if (!res.ok) throw new Error('Xóa sản phẩm thất bại');
          fetchProducts();
        } catch (e: any) { Alert.alert('Lỗi', e.message); }
        finally { setLoading(false); }
      }},
    ]);
  };

  const renderItem = ({ item }: { item: Product }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>
          {'Giá: ' + (item.price != null ? String(item.price) : '—') + ' • Danh mục: ' + (item.cat != null ? String(item.cat) : '—')}
        </Text>
        {item.isFlashSale ? <Text style={styles.flashBadge}>⚡ Flash Sale</Text> : null}
      </View>
      <View style={{ gap: 6 }}>
        <TouchableOpacity style={styles.smallBtn} onPress={() => openEdit(item)}>
          <Text style={styles.smallBtnText}>Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#e53935' }]} onPress={() => remove(item.id)}>
          <Text style={[styles.smallBtnText, { color: '#fff' }]}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quản lý sản phẩm đơn sỉ</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>+ Thêm</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator size="large" color="#2e7d32" /> : null}
      {error != null ? <Text style={{ color: '#c62828', textAlign: 'center', padding: 8 }}>{error}</Text> : null}

      <FlatList
        data={products}
        keyExtractor={p => String(p.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12 }}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView>
              <Text style={styles.modalTitle}>{editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</Text>
              {([
                { key: 'name', label: 'Tên sản phẩm *' },
                { key: 'price', label: 'Giá hiển thị (vd: 25.000đ)' },
                { key: 'oldPrice', label: 'Giá cũ' },
                { key: 'priceValue', label: 'Giá số (vd: 25000)', keyboard: 'numeric' },
                { key: 'cat', label: 'Danh mục (slug, vd: leaf)' },
                { key: 'imageUrl', label: 'URL ảnh' },
                { key: 'salePrice', label: 'Giá sale' },
              ] as const).map(({ key, label, keyboard }: any) => (
                <TextInput
                  key={key}
                  placeholder={label}
                  style={styles.input}
                  value={(form as any)[key]}
                  onChangeText={t => setForm(s => ({ ...s, [key]: t }))}
                  keyboardType={keyboard ?? 'default'}
                />
              ))}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <Text style={{ marginRight: 8 }}>Flash Sale</Text>
                <Switch value={form.isFlashSale} onValueChange={v => setForm(s => ({ ...s, isFlashSale: v }))} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#e0e0e0' }]} onPress={() => setModalVisible(false)}>
                  <Text>Huỷ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2e7d32' }]} onPress={save}>
                  <Text style={{ color: '#fff' }}>{editing ? 'Lưu' : 'Tạo'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4faf4' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '800', color: '#1b5e20' },
  addBtn: { backgroundColor: '#2e7d32', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '800' },
  meta: { fontSize: 12, color: '#666', marginTop: 2 },
  flashBadge: { fontSize: 11, color: '#e65100', marginTop: 4, fontWeight: '700' },
  smallBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  smallBtnText: { color: '#333', fontWeight: '700', fontSize: 12 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { width: '92%', backgroundColor: '#fff', borderRadius: 12, padding: 16, maxHeight: '85%' },
  modalTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#eee', padding: 8, borderRadius: 8, marginTop: 8 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
});
