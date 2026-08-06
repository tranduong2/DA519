import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, SafeAreaView, Switch
} from 'react-native';
import { useUserStore } from '@/store/userStore';
import { BASE_URL } from '@/services/api';

type UserItem = {
  id: number;
  email: string;
  name?: string | null;
  username?: string | null;
  phone?: string | null;
  role?: string | null;
  banned?: boolean;
};

export default function ManageProfile() {
  const token = useUserStore(s => s.token);
  const hasHydrated = useUserStore(s => s.hasHydrated);
  const user = useUserStore(s => s.user);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'user', banned: false });

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };

  // Guard: chỉ admin mới vào được
  if (hasHydrated && user?.role !== 'admin') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ fontSize: 48 }}>⛔</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#c62828', marginTop: 12 }}>Không có quyền truy cập</Text>
          <Text style={{ color: '#999', marginTop: 8, textAlign: 'center' }}>Chỉ tài khoản admin mới xem được trang này</Text>
          <Text style={{ color: '#bbb', marginTop: 4, fontSize: 12 }}>Role hiện tại: {user?.role ?? 'chưa đăng nhập'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const fetchUsers = async () => {
    if (!hasHydrated) { setError('Đang tải...'); return; }
    if (!token) { setError('Chưa đăng nhập - vui lòng đăng nhập lại'); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${BASE_URL}/admin/users`, { headers });
      if (!res.ok) {
        const errData = await res.text();
        throw new Error(`Lỗi ${res.status}: ${errData || 'Không thể tải danh sách người dùng'}`);
      }
      const data = await res.json();
      setUsers(data.users ?? data);
    } catch (e: any) {
      setError(e.message ?? 'Lỗi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasHydrated) fetchUsers();
  }, [hasHydrated]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', phone: '', role: 'user', banned: false });
    setModalVisible(true);
  };

  const openEdit = (u: UserItem) => {
    setEditing(u);
    setForm({
      name: u.name ?? u.username ?? '',
      email: u.email,
      phone: u.phone ?? '',
      role: u.role ?? 'user',
      banned: !!u.banned,
    });
    setModalVisible(true);
  };

  const save = async () => {
    if (!form.email) { Alert.alert('Email là bắt buộc'); return; }
    try {
      setLoading(true);
      if (editing) {
        const res = await fetch(`${BASE_URL}/admin/users/${editing.id}`, { method: 'PUT', headers, body: JSON.stringify(form) });
        if (!res.ok) throw new Error('Cập nhật thất bại');
      } else {
        const res = await fetch(`${BASE_URL}/admin/users`, { method: 'POST', headers, body: JSON.stringify(form) });
        if (!res.ok) throw new Error('Tạo người dùng thất bại');
      }
      setModalVisible(false);
      fetchUsers();
    } catch (e: any) {
      Alert.alert('Lỗi', e.message ?? 'Có lỗi');
    } finally { setLoading(false); }
  };

  const removeUser = (id: number) => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa người dùng này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            setLoading(true);
            const res = await fetch(`${BASE_URL}/admin/users/${id}`, { method: 'DELETE', headers });
            if (!res.ok) throw new Error('Xóa thất bại');
            fetchUsers();
          } catch (e: any) { Alert.alert('Lỗi', e.message ?? 'Có lỗi'); } finally { setLoading(false); }
        }
      }
    ]);
  };

  const toggleBan = (u: UserItem) => {
    Alert.alert('Xác nhận', `${u.banned ? 'Bỏ cấm' : 'Cấm'} người dùng này?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: u.banned ? 'Bỏ cấm' : 'Cấm', style: 'destructive', onPress: async () => {
          try {
            setLoading(true);
            const res = await fetch(`${BASE_URL}/admin/users/${u.id}/ban`, { method: 'POST', headers, body: JSON.stringify({ banned: !u.banned }) });
            if (!res.ok) throw new Error('Thao tác thất bại');
            fetchUsers();
          } catch (e: any) { Alert.alert('Lỗi', e.message ?? 'Có lỗi'); } finally { setLoading(false); }
        }
      }
    ]);
  };

  const renderItem = ({ item }: { item: UserItem }) => (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={styles.name}>{item.username ?? item.name}</Text>
          <Text style={styles.email}>{item.email}</Text>
          <Text style={styles.meta}>{item.phone ?? ''} • {item.role ?? 'user'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.badge, item.banned ? styles.banned : styles.active]}>
            {item.banned ? 'BANNED' : 'ACTIVE'}
          </Text>
          <View style={{ height: 8 }} />
          <TouchableOpacity style={styles.smallBtn} onPress={() => openEdit(item)}>
            <Text style={styles.smallBtnText}>Sửa</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#e53935' }]} onPress={() => removeUser(item.id)}>
            <Text style={[styles.smallBtnText, { color: '#fff' }]}>Xóa</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#ff9800' }]} onPress={() => toggleBan(item)}>
            <Text style={[styles.smallBtnText, { color: '#fff' }]}>{item.banned ? 'Bỏ cấm' : 'Cấm'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quản lý Người Dùng</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>Thêm</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="large" color="#2e7d32" />}
      {error && <Text style={{ color: '#c62828', textAlign: 'center' }}>{error}</Text>}

      <FlatList
        data={users}
        keyExtractor={u => String(u.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12 }}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Sửa người dùng' : 'Thêm người dùng'}</Text>
            <TextInput placeholder="Tên" style={styles.input} value={form.name} onChangeText={(t) => setForm(s => ({ ...s, name: t }))} />
            <TextInput placeholder="Email" style={styles.input} value={form.email} onChangeText={(t) => setForm(s => ({ ...s, email: t }))} keyboardType="email-address" />
            <TextInput placeholder="Số điện thoại" style={styles.input} value={form.phone} onChangeText={(t) => setForm(s => ({ ...s, phone: t }))} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text>Role</Text>
              <TextInput
                placeholder="role"
                style={[styles.input, { flex: 1, marginLeft: 8 }]}
                value={form.role}
                onChangeText={(t) => setForm(s => ({ ...s, role: t }))}
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <Text style={{ marginRight: 8 }}>Banned</Text>
              <Switch value={form.banned} onValueChange={(v) => setForm(s => ({ ...s, banned: v }))} />
            </View>
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
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.03 },
  name: { fontSize: 14, fontWeight: '800' },
  email: { fontSize: 12, color: '#666' },
  meta: { fontSize: 12, color: '#999' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontWeight: '800' },
  banned: { backgroundColor: '#b71c1c', color: '#fff' },
  active: { backgroundColor: '#2e7d32', color: '#fff' },
  smallBtn: { marginTop: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  smallBtnText: { color: '#333', fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { width: '92%', backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#eee', padding: 8, borderRadius: 8, marginTop: 8 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
});