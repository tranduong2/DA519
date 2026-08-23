import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Alert, Platform, Modal,
  KeyboardAvoidingView, RefreshControl,
} from 'react-native';
import { BASE_URL } from '@/services/api';
import { useUserStore } from '@/store/userStore';

interface Product {
  id: number;
  name: string;
  price: string;
  oldPrice?: string;
  salePrice?: string;
  imageUrl?: string;
  cat?: string;
}

interface FormData {
  name: string;
  price: string;
  oldPrice: string;
  salePrice: string;
  cat: string;
  imageUrl: string;
}

const EMPTY_FORM: FormData = {
  name: '', price: '', oldPrice: '', salePrice: '', cat: '', imageUrl: '',
};

function calcDiscount(price: string, oldPrice?: string): number | null {
  if (!oldPrice) return null;
  const p = parseFloat(price.replace(/[^\d.]/g, ''));
  const o = parseFloat(oldPrice.replace(/[^\d.]/g, ''));
  if (isNaN(p) || isNaN(o) || o === 0) return null;
  return Math.round((1 - p / o) * 100);
}

// ── Stat Card ──────────────────────────────────────────────────
function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text>
    </View>
  );
}

// ── Product Row ────────────────────────────────────────────────
function ProductRow({
  item, onEdit, onDelete,
}: { item: Product; onEdit: (p: Product) => void; onDelete: (id: number) => void }) {
  const displayPrice = item.salePrice || item.price;
  const discount = calcDiscount(displayPrice, item.oldPrice);

  return (
    <View style={styles.row}>
      <View style={styles.rowThumb}>
        <Text style={styles.rowThumbIcon}>🥦</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.rowMeta}>
          {item.cat ? `${item.cat} · ` : ''}ID #{item.id}
        </Text>
      </View>
      <View style={styles.rowPricing}>
        <Text style={styles.rowPrice}>{displayPrice}</Text>
        {item.oldPrice && (
          <Text style={styles.rowOldPrice}>{item.oldPrice}</Text>
        )}
        {discount !== null && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>-{discount}%</Text>
          </View>
        )}
      </View>
      <View style={styles.rowActions}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => onEdit(item)}>
          <Text style={styles.iconBtnText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconBtn, styles.iconBtnDanger]}
          onPress={() =>
            Alert.alert('Xoá sản phẩm', `Xoá "${item.name}" khỏi Flash Sale?`, [
              { text: 'Huỷ', style: 'cancel' },
              { text: 'Xoá', style: 'destructive', onPress: () => onDelete(item.id) },
            ])
          }
        >
          <Text style={styles.iconBtnText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Product Form Modal ─────────────────────────────────────────
function ProductFormModal({
  visible, editProduct, onSave, onClose, saving,
}: {
  visible: boolean;
  editProduct: Product | null;
  onSave: (form: FormData, id?: number) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  useEffect(() => {
    if (editProduct) {
      setForm({
        name: editProduct.name,
        price: editProduct.price,
        oldPrice: editProduct.oldPrice || '',
        salePrice: editProduct.salePrice || '',
        cat: editProduct.cat || '',
        imageUrl: editProduct.imageUrl || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editProduct, visible]);

  const set = (key: keyof FormData) => (val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = () => {
    if (!form.name.trim() || !form.price.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên sản phẩm và giá bán.');
      return;
    }
    onSave(form, editProduct?.id);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Field label="Tên sản phẩm *" value={form.name} onChangeText={set('name')} placeholder="VD: Rau cải xanh hữu cơ" />
            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <Field label="Giá bán *" value={form.price} onChangeText={set('price')} placeholder="45.000đ" />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Field label="Giá gốc" value={form.oldPrice} onChangeText={set('oldPrice')} placeholder="60.000đ" />
              </View>
            </View>
            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <Field label="Giá sale" value={form.salePrice} onChangeText={set('salePrice')} placeholder="Tuỳ chọn" />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Field label="Danh mục" value={form.cat} onChangeText={set('cat')} placeholder="Rau củ, Trái cây..." />
              </View>
            </View>
            <Field label="URL hình ảnh" value={form.imageUrl} onChangeText={set('imageUrl')} placeholder="/uploads/product.jpg" />

            {/* Preview discount */}
            {form.price && form.oldPrice && calcDiscount(form.price, form.oldPrice) !== null && (
              <View style={styles.discountPreview}>
                <Text style={styles.discountPreviewText}>
                  ✅ Mức giảm: {calcDiscount(form.price, form.oldPrice)}%
                </Text>
              </View>
            )}

            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>{editProduct ? 'Lưu thay đổi' : 'Thêm sản phẩm'}</Text>
              }
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label, value, onChangeText, placeholder,
}: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#C0C0C0"
      />
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────
export default function FlashSaleAdmin() {
  const token = useUserStore(state => state.token);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editProduct, setEditProduct]   = useState<Product | null>(null);
  const [filter, setFilter]     = useState<'all' | 'discount' | 'nodiscount'>('all');
  const [search, setSearch]     = useState('');

  const fetchProducts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/products/flashsale`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setError('Không thể tải dữ liệu. Kiểm tra kết nối mạng.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const onRefresh = () => { setRefreshing(true); fetchProducts(true); };

  const openAdd  = () => { setEditProduct(null); setModalVisible(true); };
  const openEdit = (p: Product) => { setEditProduct(p); setModalVisible(true); };

  const handleSave = async (form: FormData, id?: number) => {
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        price: form.price.trim(),
        oldPrice: form.oldPrice.trim() || undefined,
        salePrice: form.salePrice.trim() || undefined,
        cat: form.cat.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
      };

      if (id !== undefined) {
        // Edit
        const res = await fetch(`${BASE_URL}/products/flashsale/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
        setProducts(prev => prev.map(p => p.id === id ? { ...p, ...body } : p));
      } else {
        // Create
        const res = await fetch(`${BASE_URL}/products/flashsale`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
        const created = await res.json();
        setProducts(prev => [...prev, created]);
      }
      setModalVisible(false);
    } catch {
      Alert.alert('Lỗi', 'Không thể lưu sản phẩm. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${BASE_URL}/products/flashsale/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch {
      Alert.alert('Lỗi', 'Không thể xoá sản phẩm.');
    }
  };

  const filtered = products
    .filter(p => {
      if (search) return p.name.toLowerCase().includes(search.toLowerCase());
      return true;
    })
    .filter(p => {
      const hasDisc = !!p.oldPrice && p.oldPrice !== (p.salePrice || p.price);
      if (filter === 'discount') return hasDisc;
      if (filter === 'nodiscount') return !hasDisc;
      return true;
    });

  const discountedCount = products.filter(p => !!p.oldPrice && p.oldPrice !== (p.salePrice || p.price)).length;
  const cats = new Set(products.map(p => p.cat || '').filter(Boolean)).size;

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.flashBadge}>
            <Text style={styles.flashBadgeText}>⚡ FLASH SALE ADMIN</Text>
          </View>
          <Text style={styles.headerSub}>Quản lý sản phẩm khuyến mãi</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Thêm</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E65100" />}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard label="Đang sale" value={products.length} accent />
          <StatCard label="Giảm giá" value={discountedCount} />
          <StatCard label="Danh mục" value={cats} />
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm sản phẩm..."
            placeholderTextColor="#C0C0C0"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Filter tabs */}
        <View style={styles.tabs}>
          {(['all', 'discount', 'nodiscount'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, filter === t && styles.tabActive]}
              onPress={() => setFilter(t)}
            >
              <Text style={[styles.tabText, filter === t && styles.tabTextActive]}>
                {t === 'all' ? 'Tất cả' : t === 'discount' ? 'Có giảm giá' : 'Không giảm'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {loading && (
          <View style={styles.stateBox}>
            <ActivityIndicator size="large" color="#E65100" />
            <Text style={styles.stateText}>Đang tải...</Text>
          </View>
        )}
        {!!error && !loading && (
          <View style={styles.stateBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchProducts()}>
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        )}
        {!loading && !error && filtered.length === 0 && (
          <View style={styles.stateBox}>
            <Text style={styles.emptyText}>
              {search ? `Không tìm thấy "${search}"` : 'Chưa có sản phẩm Flash Sale'}
            </Text>
          </View>
        )}

        {!loading && !error && filtered.length > 0 && (
          <View style={styles.list}>
            <Text style={styles.listCount}>{filtered.length} sản phẩm</Text>
            {filtered.map(item => (
              <ProductRow key={item.id} item={item} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Form Modal */}
      <ProductFormModal
        visible={modalVisible}
        editProduct={editProduct}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
        saving={saving}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9F5F1' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#FFE0B2',
    ...Platform.select({
      ios:     { shadowColor: '#E65100', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  flashBadge: {
    backgroundColor: '#E65100', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    alignSelf: 'flex-start', marginBottom: 4,
  },
  flashBadgeText: { fontSize: 11, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  headerSub: { fontSize: 12, color: '#BF360C', fontWeight: '500' },
  addBtn: {
    backgroundColor: '#E65100', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 9,
  },
  addBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  scroll: { flex: 1 },

  statsRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4,
  },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#FFE0B2',
    alignItems: 'center',
  },
  statLabel: { fontSize: 11, color: '#BF360C', fontWeight: '500', marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '900', color: '#333' },
  statValueAccent: { color: '#E65100' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 14,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#FFE0B2',
    paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, color: '#333' },

  tabs: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 12, gap: 8 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#FFE0B2',
  },
  tabActive: { backgroundColor: '#E65100', borderColor: '#E65100' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#BF360C' },
  tabTextActive: { color: '#fff' },

  stateBox: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  stateText: { fontSize: 13, color: '#AAA' },
  errorText: { fontSize: 13, color: '#E53935' },
  emptyText: { fontSize: 13, color: '#AAA' },
  retryBtn: {
    backgroundColor: '#E65100', borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 9,
  },
  retryBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  list: { paddingHorizontal: 16, marginTop: 14 },
  listCount: { fontSize: 11, color: '#BF360C', fontWeight: '600', marginBottom: 10, letterSpacing: 0.3 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14,
    padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#F5EBE0',
    gap: 10,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  rowThumb: {
    width: 46, height: 46, borderRadius: 10,
    backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center',
  },
  rowThumbIcon: { fontSize: 24 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 2 },
  rowMeta: { fontSize: 11, color: '#AAA' },
  rowPricing: { alignItems: 'flex-end' },
  rowPrice: { fontSize: 14, fontWeight: '900', color: '#E65100' },
  rowOldPrice: { fontSize: 11, color: '#C0C0C0', textDecorationLine: 'line-through' },
  discountBadge: {
    backgroundColor: '#FFF3E0', borderRadius: 5, marginTop: 2,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  discountBadgeText: { fontSize: 10, fontWeight: '800', color: '#E65100' },
  rowActions: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 9,
    backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center',
  },
  iconBtnDanger: { backgroundColor: '#FDECEA' },
  iconBtnText: { fontSize: 15 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#FFE0B2',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#111' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 13, color: '#555', fontWeight: '700' },
  modalBody: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },

  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 6 },
  fieldInput: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: '#222', backgroundColor: '#FAFAFA',
  },
  fieldRow: { flexDirection: 'row' },

  discountPreview: {
    backgroundColor: '#E8F5E9', borderRadius: 10, padding: 10, marginBottom: 14,
  },
  discountPreviewText: { fontSize: 13, color: '#2E7D32', fontWeight: '600' },

  saveBtn: {
    backgroundColor: '#E65100', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  saveBtnText: { fontSize: 15, fontWeight: '900', color: '#fff' },
});
