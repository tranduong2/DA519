import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, SafeAreaView
} from 'react-native';
import { useUserStore } from '@/store/userStore';
import { BASE_URL } from '@/services/api';

type Category = {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string | null;
};

const emptyForm = { name: '', slug: '', imageUrl: '' };

export default function ManageCategories() {
  const token = useUserStore(s => s.token);
  const hasHydrated = useUserStore(s => s.hasHydrated);
  const user = useUserStore(s => s.user);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
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

  const fetchCategories = async () => {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${BASE_URL}/admin/categories`, { headers });
      if (!res.ok) throw new Error(`Lỗi ${res.status}`);
      const data = await res.json();
      setCategories(data.categories ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Lỗi');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (hasHydrated) fetchCategories(); }, [hasHydrated]);

  const handleNameChange = (t: string) => {
    const slug = t.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/[^a-z0-9\s-]/g, '')
      .trim().replace(/\s+/g, '-');
    setForm(s => ({ ...s, name: t, slug }));
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalVisible(true); };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ name: c.name, slug: c.slug, imageUrl: c.imageUrl ?? '' });
    setModalVisible(true);
  };

  const save = async () => {
    if (!form.name || !form.slug) { Alert.alert('Tên và slug là bắt buộc'); return; }
    try {
      setLoading(true);
      if (editing) {
        const res = await fetch(`${BASE_URL}/admin/categories/${editing.id}`, { method: 'PUT', headers, body: JSON.stringify(form) });
        if (!res.ok) throw new Error('Cập nhật thất bại');
      } else {
        const res = await fetch(`${BASE_URL}/admin/categories`, { method: 'POST', headers, body: JSON.stringify(form) });
        if (!res.ok) throw new Error('Tạo thất bại');
      }
      setModalVisible(false);
      fetchCategories();
    } catch (e: any) {
      Alert.alert('Lỗi', e.message);
    } finally { setLoading(false); }
  };

  const remove = (id: number) => {
    Alert.alert('Xác nhận', 'Xóa danh mục này?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        try {
          setLoading(true);
          await fetch(`${BASE_URL}/admin/categories/${id}`, { method: 'DELETE', headers });
          fetchCategories();
        } catch (e: any) { Alert.alert('Lỗi', e.message); }
        finally { setLoading(false); }
      }},
    ]);
  };

  const renderItem = ({ item }: { item: Category }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.slug}>slug: {item.slug}</Text>
        {item.imageUrl && <Text style={styles.meta} numberOfLines={1}>🖼 {item.imageUrl}</Text>}
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
        <Text style={styles.title}>Quản lý Danh mục</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>+ Thêm</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="large" color="#2e7d32" />}
      {error && <Text style={{ color: '#c62828', textAlign: 'center', padding: 8 }}>{error}</Text>}

      <FlatList
        data={categories}
        keyExtractor={c => String(c.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12 }}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Sửa danh mục' : 'Thêm danh mục'}</Text>
            <TextInput
              placeholder="Tên danh mục *"
              style={styles.input}
              value={form.name}
              onChangeText={handleNameChange}
            />
            <TextInput
              placeholder="Slug (tự động tạo)"
              style={styles.input}
              value={form.slug}
              onChangeText={t => setForm(s => ({ ...s, slug: t }))}
            />
            <TextInput
              placeholder="URL ảnh (tuỳ chọn)"
              style={styles.input}
              value={form.imageUrl}
              onChangeText={t => setForm(s => ({ ...s, imageUrl: t }))}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#e0e0e0' }]} onPress={() => setModalVisible(false)}>
                <Text>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2e7d32' }]} onPress={save}>
                <Text style={{ color: '#fff' }}>{editing ? 'Lưu' : 'Tạo'}</Text>
              </TouchableOpacity>
            </View>
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
  slug: { fontSize: 12, color: '#888', marginTop: 2, fontStyle: 'italic' },
  meta: { fontSize: 11, color: '#aaa', marginTop: 2 },
  smallBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  smallBtnText: { color: '#333', fontWeight: '700', fontSize: 12 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { width: '92%', backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#eee', padding: 8, borderRadius: 8, marginTop: 8 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
});