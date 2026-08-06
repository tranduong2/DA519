import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, SafeAreaView, RefreshControl,
  TextInput, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useUserStore } from '@/store/userStore';
import { BASE_URL } from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────
type MainTab = 'inventory' | 'stats';
type InvTab  = 'list' | 'import' | 'export' | 'logs';
type IOType  = 'import' | 'export';

export interface Product {
  id: number; name: string; cat: string; price: number;
  stock: number; unit: string; imageUrl?: string;
  totalIn: number; totalOut: number;
  discountPct?: number; fsActive?: number;
}
export interface InventoryLog {
  id: number; productId: number; productName: string;
  type: 'import' | 'export' | 'flashsale';
  quantity: number; note: string; supplier?: string;
  receiver?: string; createdByName?: string; createdAt: string;
}
export interface Stats {
  totalProducts: number; totalStock: number; lowStock: number;
  flashSuggest: number; todayImport: number; todayExport: number;
  weekChart: { date: string; type: string; total: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────
const fmtPrice = (n: number) => Number(n).toLocaleString('vi-VN') + 'đ';

function getStockStatus(stock: number): { label: string; color: string; bg: string } {
  if (stock < 20) return { label: '⚠ Sắp hết',    color: '#c62828', bg: '#ffebee' };
  if (stock > 50) return { label: '🔥 Flash Sale', color: '#e65100', bg: '#fff3e0' };
  return              { label: '✓ Bình thường', color: '#2e7d32', bg: '#e8f5e9' };
}

// ─── Main Component ───────────────────────────────────────────────
export default function InventoryScreen() {
  const user = useUserStore(s => s.user);

  // ── Tabs ──
  const [mainTab,     setMainTab]     = useState<MainTab>('inventory');
  const [invTab,      setInvTab]      = useState<InvTab>('list');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'flash'>('all');
  const [searchText,  setSearchText]  = useState('');

  // ── Data ──
  const [products,  setProducts]  = useState<Product[]>([]);
  const [logs,      setLogs]      = useState<InventoryLog[]>([]);
  const [stats,     setStats]     = useState<Stats | null>(null);

  // ── IO Form ──
  const [selProduct,    setSelProduct]    = useState<Product | null>(null);
  const [ioQty,         setIoQty]         = useState('');
  const [ioPrice,       setIoPrice]       = useState('');
  const [ioSupplier,    setIoSupplier]    = useState('');
  const [ioReceiver,    setIoReceiver]    = useState('');
  const [ioReason,      setIoReason]      = useState('Bán hàng');
  const [ioNote,        setIoNote]        = useState('');
  const [productPicker, setProductPicker] = useState(false);

  // ── Flash modal ──
  const [flashModal, setFlashModal] = useState<{ product: Product } | null>(null);
  const [flashDisc,  setFlashDisc]  = useState('20');

  // ── Loading ──
  const [loading,    setLoading]    = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${user?.token}`,
  }), [user?.token]);

  // ─── Fetch ────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!user?.token) { setError('Chưa đăng nhập'); return; }
    try {
      setLoading(true); setError(null);
      const h = { Authorization: `Bearer ${user.token}` };
      const [r3, r4, r5] = await Promise.all([
        fetch(`${BASE_URL}/admin/inventory/products`,      { headers: h }),
        fetch(`${BASE_URL}/admin/inventory/logs?limit=30`, { headers: h }),
        fetch(`${BASE_URL}/admin/inventory/stats`,         { headers: h }),
      ]);
      if (r3.ok) { const d3 = await r3.json(); setProducts(d3.products ?? []); }
      if (r4.ok) { const d4 = await r4.json(); setLogs(d4.logs ?? []); }
      if (r5.ok) { const d5 = await r5.json(); setStats(d5); }
    } catch (e: any) {
      setError(e.message ?? 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [user?.token]);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  // ─── Import / Export ─────────────────────────────────────────
  const doIO = async (type: IOType) => {
    if (!selProduct) return Alert.alert('Chọn sản phẩm trước');
    const qty = parseInt(ioQty);
    if (!qty || qty < 1) return Alert.alert('Nhập số lượng hợp lệ');
    if (type === 'export' && selProduct.stock < qty)
      return Alert.alert(`Không đủ hàng! Tồn: ${selProduct.stock}`);

    setSubmitting(true);
    const endpoint = type === 'import'
      ? `${BASE_URL}/admin/inventory/import`
      : `${BASE_URL}/admin/inventory/export`;
    const body = type === 'import'
      ? { productId: selProduct.id, quantity: qty, price: parseInt(ioPrice) || 0, supplier: ioSupplier, note: ioNote }
      : { productId: selProduct.id, quantity: qty, receiver: ioReceiver, reason: ioReason, note: ioNote };

    try {
      const res = await fetch(endpoint, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
      const d   = await res.json();
      if (!res.ok) throw new Error(d.message);
      Alert.alert('✅ Thành công', d.message);
      setSelProduct(null); setIoQty(''); setIoPrice(''); setIoSupplier('');
      setIoReceiver(''); setIoNote('');
      fetchAll();
    } catch (e: any) {
      Alert.alert('❌ Lỗi', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Flash Sale ───────────────────────────────────────────────
  const toggleFlashSale = async (product: Product, active: boolean, discPct: number) => {
    try {
      const res = await fetch(`${BASE_URL}/admin/inventory/flashsale/toggle`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ productId: product.id, discountPct: discPct, active }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message);
      Alert.alert(active ? '🔥 Flash Sale bật!' : '⏸ Đã tắt', d.message);
      setFlashModal(null);
      fetchAll();
    } catch (e: any) { Alert.alert('Lỗi', e.message); }
  };

  // ─── Render: Stats ────────────────────────────────────────────
  const renderStats = () => {
    if (!stats) return <ActivityIndicator color="#2e7d32" style={{ marginTop: 40 }} />;

    const allDates: string[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      allDates.push(d.toISOString().split('T')[0]);
    }
    const chartImport = allDates.map(date => {
      const row = stats.weekChart.find(r => r.date?.substring(0, 10) === date && r.type === 'import');
      return { date, val: row ? Number(row.total) : 0 };
    });
    const chartExport = allDates.map(date => {
      const row = stats.weekChart.find(r => r.date?.substring(0, 10) === date && r.type === 'export');
      return { date, val: row ? Number(row.total) : 0 };
    });
    const maxVal = Math.max(...chartImport.map(x => x.val), ...chartExport.map(x => x.val), 1);

    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Stat cards */}
        <View style={s.statsGrid}>
          {[
            { label: 'Tổng SP',      value: stats.totalProducts, color: '#1565c0', emoji: '📦' },
            { label: 'Tổng tồn kho', value: stats.totalStock,    color: '#2e7d32', emoji: '🏪' },
            { label: 'Sắp hết hàng', value: stats.lowStock,      color: '#c62828', emoji: '⚠️' },
            { label: 'Đề xuất FS',   value: stats.flashSuggest,  color: '#e65100', emoji: '🔥' },
          ].map(c => (
            <View key={c.label} style={[s.statCard, { borderTopColor: c.color }]}>
              <Text style={s.statEmoji}>{c.emoji}</Text>
              <Text style={[s.statValue, { color: c.color }]}>{c.value}</Text>
              <Text style={s.statLabel}>{c.label}</Text>
            </View>
          ))}
        </View>

        <View style={s.statsGrid}>
          {[
            { label: 'Nhập hôm nay', value: stats.todayImport, color: '#2e7d32', emoji: '📥' },
            { label: 'Xuất hôm nay', value: stats.todayExport, color: '#c62828', emoji: '📤' },
          ].map(c => (
            <View key={c.label} style={[s.statCardWide, { borderTopColor: c.color }]}>
              <Text style={s.statEmoji}>{c.emoji}</Text>
              <Text style={[s.statValue, { color: c.color, fontSize: 28 }]}>{c.value}</Text>
              <Text style={s.statLabel}>{c.label}</Text>
            </View>
          ))}
        </View>

        {/* Bar chart */}
        <View style={s.chartCard}>
          <Text style={s.chartTitle}>📊 Nhập / Xuất 7 ngày qua</Text>
          <View style={s.chartLegend}>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: '#2e7d32' }]} />
              <Text style={s.legendText}>Nhập</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: '#c62828' }]} />
              <Text style={s.legendText}>Xuất</Text>
            </View>
          </View>
          <View style={s.barChart}>
            {allDates.map((date, i) => {
              const imp = chartImport[i].val;
              const exp = chartExport[i].val;
              const day = new Date(date).toLocaleDateString('vi-VN', { weekday: 'short' });
              return (
                <View key={date} style={s.barGroup}>
                  <View style={s.bars}>
                    <View style={[s.bar, { height: Math.max(4, (imp / maxVal) * 80), backgroundColor: '#2e7d32' }]} />
                    <View style={[s.bar, { height: Math.max(4, (exp / maxVal) * 80), backgroundColor: '#c62828' }]} />
                  </View>
                  <Text style={s.barLabel}>{day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Warnings */}
        {stats.lowStock > 0 && (
          <View style={s.warnBanner}>
            <Text style={s.warnTitle}>⚠️ {stats.lowStock} sản phẩm sắp hết hàng!</Text>
            <Text style={s.warnSub}>Tồn kho dưới 20 đơn vị — cần nhập thêm ngay</Text>
            <TouchableOpacity onPress={() => { setMainTab('inventory'); setStockFilter('low'); }}>
              <Text style={s.warnLink}>Xem ngay →</Text>
            </TouchableOpacity>
          </View>
        )}
        {stats.flashSuggest > 0 && (
          <View style={[s.warnBanner, { backgroundColor: '#fff3e0', borderColor: '#ffb74d' }]}>
            <Text style={[s.warnTitle, { color: '#e65100' }]}>🔥 {stats.flashSuggest} SP nên Flash Sale!</Text>
            <Text style={[s.warnSub, { color: '#bf360c' }]}>Tồn trên 50 đơn vị — đẩy Flash Sale giải phóng hàng</Text>
            <TouchableOpacity onPress={() => { setMainTab('inventory'); setStockFilter('flash'); }}>
              <Text style={[s.warnLink, { color: '#e65100' }]}>Xem ngay →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  };

  // ─── Render: Inventory ────────────────────────────────────────
  const renderInventory = () => {
    let filtered = products;
    if (stockFilter === 'low')   filtered = filtered.filter(p => p.stock < 20);
    if (stockFilter === 'flash') filtered = filtered.filter(p => p.stock > 50);
    if (searchText) filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(searchText.toLowerCase())
    );

    return (
      <View style={{ flex: 1 }}>
        {/* Sub tabs */}
        <View style={s.subTabs}>
          {(['list', 'import', 'export', 'logs'] as InvTab[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[s.subTab, invTab === t && s.subTabActive]}
              onPress={() => setInvTab(t)}
            >
              <Text style={[s.subTabText, invTab === t && s.subTabTextActive]}>
                {{ list: '📦 Kho', import: '📥 Nhập', export: '📤 Xuất', logs: '🕓 Lịch sử' }[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── List ── */}
        {invTab === 'list' && (
          <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
            <View style={s.searchRow}>
              <TextInput
                style={s.searchInput}
                placeholder="🔍 Tìm sản phẩm..."
                value={searchText}
                onChangeText={setSearchText}
                placeholderTextColor="#aaa"
              />
            </View>
            <View style={s.filterRow}>
              {(['all', 'low', 'flash'] as const).map(f => (
                <TouchableOpacity
                  key={f}
                  style={[s.filterBtn,
                    stockFilter === f && (f === 'low' ? s.filterBtnRed : f === 'flash' ? s.filterBtnOrange : s.filterBtnGreen)
                  ]}
                  onPress={() => setStockFilter(f)}
                >
                  <Text style={[s.filterBtnText,
                    stockFilter === f && { color: f === 'low' ? '#c62828' : f === 'flash' ? '#e65100' : '#2e7d32', fontWeight: '800' }
                  ]}>
                    {{ all: 'Tất cả', low: '⚠ Sắp hết', flash: '🔥 Flash Sale' }[f]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {filtered.length === 0
              ? <Text style={s.empty}>Không có sản phẩm nào</Text>
              : filtered.map(p => {
                  const st = getStockStatus(p.stock);
                  return (
                    <View key={p.id} style={[s.productCard, { borderLeftColor: st.color }]}>
                      <View style={s.productTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.productName} numberOfLines={1}>{p.name}</Text>
                          <Text style={s.productCat}>{p.cat} · {fmtPrice(p.price)}</Text>
                        </View>
                        <View style={[s.stockBadge, { backgroundColor: st.bg }]}>
                          <Text style={[s.stockBadgeText, { color: st.color }]}>{st.label}</Text>
                        </View>
                      </View>

                      <View style={s.stockRow}>
                        <View style={s.stockItem}>
                          <Text style={s.stockNum}>{p.stock}</Text>
                          <Text style={s.stockLabel}>Tồn kho</Text>
                        </View>
                        <View style={s.stockItem}>
                          <Text style={[s.stockNum, { color: '#2e7d32' }]}>{p.totalIn ?? 0}</Text>
                          <Text style={s.stockLabel}>Tổng nhập</Text>
                        </View>
                        <View style={s.stockItem}>
                          <Text style={[s.stockNum, { color: '#c62828' }]}>{p.totalOut ?? 0}</Text>
                          <Text style={s.stockLabel}>Tổng xuất</Text>
                        </View>
                      </View>

                      <View style={s.progressBg}>
                        <View style={[s.progressFill, {
                          width: `${Math.min(100, (p.stock / Math.max(p.totalIn || 1, 1)) * 100)}%` as any,
                          backgroundColor: st.color,
                        }]} />
                      </View>

                      <View style={s.productActions}>
                        <TouchableOpacity style={s.actionBtn} onPress={() => { setSelProduct(p); setInvTab('import'); }}>
                          <Text style={[s.actionBtnText, { color: '#2e7d32' }]}>📥 Nhập</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.actionBtn} onPress={() => { setSelProduct(p); setInvTab('export'); }}>
                          <Text style={[s.actionBtnText, { color: '#c62828' }]}>📤 Xuất</Text>
                        </TouchableOpacity>
                        {p.stock > 50 && (
                          <TouchableOpacity
                            style={[s.actionBtn, { backgroundColor: p.fsActive ? '#fff3e0' : '#e8f5e9' }]}
                            onPress={() => { setFlashModal({ product: p }); setFlashDisc(String(p.discountPct ?? 20)); }}
                          >
                            <Text style={[s.actionBtnText, { color: p.fsActive ? '#e65100' : '#2e7d32' }]}>
                              {p.fsActive ? '🔥 FS ON' : '⚡ Flash Sale'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
            }
          </ScrollView>
        )}

        {/* ── Import / Export Form ── */}
        {(invTab === 'import' || invTab === 'export') && (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
            <View style={s.formCard}>
              <Text style={s.formTitle}>
                {invTab === 'import' ? '📥 Phiếu nhập kho' : '📤 Phiếu xuất kho'}
              </Text>

              <Text style={s.formLabel}>Sản phẩm *</Text>
              <TouchableOpacity style={s.pickerBtn} onPress={() => setProductPicker(true)}>
                <Text style={selProduct ? s.pickerText : s.pickerPlaceholder}>
                  {selProduct ? `${selProduct.name} (Tồn: ${selProduct.stock})` : 'Chọn sản phẩm...'}
                </Text>
              </TouchableOpacity>

              {selProduct && (
                <View style={[s.selectedInfo, selProduct.stock < 20 ? { backgroundColor: '#ffebee' } : {}]}>
                  <Text style={s.selectedInfoText}>
                    Tồn hiện tại:{' '}
                    <Text style={{ fontWeight: '800', color: selProduct.stock < 20 ? '#c62828' : '#2e7d32' }}>
                      {selProduct.stock}
                    </Text>
                  </Text>
                  {invTab === 'export' && selProduct.stock < 20 && (
                    <Text style={{ color: '#c62828', fontSize: 12, marginTop: 2 }}>⚠ Sắp hết hàng!</Text>
                  )}
                </View>
              )}

              <View style={s.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.formLabel}>Số lượng *</Text>
                  <TextInput
                    style={s.formInput} keyboardType="numeric"
                    placeholder="0" value={ioQty} onChangeText={setIoQty}
                    placeholderTextColor="#aaa"
                  />
                </View>
                {invTab === 'import' && (
                  <View style={{ flex: 1 }}>
                    <Text style={s.formLabel}>Giá nhập (đ)</Text>
                    <TextInput
                      style={s.formInput} keyboardType="numeric"
                      placeholder="0" value={ioPrice} onChangeText={setIoPrice}
                      placeholderTextColor="#aaa"
                    />
                  </View>
                )}
              </View>

              {invTab === 'import' ? (
                <>
                  <Text style={s.formLabel}>Nhà cung cấp</Text>
                  <TextInput style={s.formInput} placeholder="Tên nhà cung cấp"
                    value={ioSupplier} onChangeText={setIoSupplier} placeholderTextColor="#aaa" />
                </>
              ) : (
                <>
                  <Text style={s.formLabel}>Người nhận</Text>
                  <TextInput style={s.formInput} placeholder="Tên người nhận"
                    value={ioReceiver} onChangeText={setIoReceiver} placeholderTextColor="#aaa" />
                  <Text style={s.formLabel}>Lý do xuất</Text>
                  <View style={s.reasonRow}>
                    {['Bán hàng', 'Trả NCC', 'Hư hỏng', 'Chuyển kho'].map(r => (
                      <TouchableOpacity
                        key={r}
                        style={[s.reasonBtn, ioReason === r && s.reasonBtnActive]}
                        onPress={() => setIoReason(r)}
                      >
                        <Text style={[s.reasonText, ioReason === r && s.reasonTextActive]}>{r}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={s.formLabel}>Ghi chú</Text>
              <TextInput style={s.formInput} placeholder="Ghi chú thêm..."
                value={ioNote} onChangeText={setIoNote} placeholderTextColor="#aaa" />

              <TouchableOpacity
                style={[s.submitBtn, invTab === 'export' && s.submitBtnRed, submitting && { opacity: 0.6 }]}
                onPress={() => doIO(invTab as IOType)}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.submitBtnText}>
                      {invTab === 'import' ? '📥 Xác nhận nhập kho' : '📤 Xác nhận xuất kho'}
                    </Text>
                }
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* ── Logs ── */}
        {invTab === 'logs' && (
          <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
            {logs.length === 0
              ? <Text style={s.empty}>Chưa có giao dịch nào</Text>
              : logs.map(log => (
                <View key={log.id} style={s.logCard}>
                  <View style={[s.logIcon, {
                    backgroundColor: log.type === 'import' ? '#e8f5e9' : log.type === 'export' ? '#ffebee' : '#fff3e0'
                  }]}>
                    <Text>{{ import: '📥', export: '📤', flashsale: '🔥' }[log.type]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.logProduct} numberOfLines={1}>{log.productName}</Text>
                    <Text style={s.logMeta}>
                      {new Date(log.createdAt).toLocaleString('vi-VN')}
                      {log.note ? ` · ${log.note}` : ''}
                    </Text>
                  </View>
                  <Text style={[s.logQty, {
                    color: log.type === 'import' ? '#2e7d32' : log.type === 'export' ? '#c62828' : '#e65100'
                  }]}>
                    {log.type === 'import' ? '+' : log.type === 'flashsale' ? '🔥' : '-'}{log.quantity || ''}
                  </Text>
                </View>
              ))
            }
          </ScrollView>
        )}
      </View>
    );
  };

  // ─── Main Render ──────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>

      {/* Product picker modal */}
      <Modal transparent visible={productPicker} animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setProductPicker(false)}>
          <View style={[s.sheet, { maxHeight: '75%' }]}>
            <Text style={s.sheetTitle}>Chọn sản phẩm</Text>
            <ScrollView>
              {products.map(p => {
                const st = getStockStatus(p.stock);
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={s.sheetItem}
                    onPress={() => { setSelProduct(p); setProductPicker(false); }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.sheetItemText}>{p.name}</Text>
                      <Text style={{ fontSize: 12, color: '#888' }}>{p.cat}</Text>
                    </View>
                    <Text style={[{ fontWeight: '700', fontSize: 13 }, { color: st.color }]}>
                      {p.stock}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={s.sheetCancel} onPress={() => setProductPicker(false)}>
              <Text style={s.sheetCancelText}>Huỷ</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Flash Sale modal */}
      <Modal transparent visible={!!flashModal} animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setFlashModal(null)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>🔥 Flash Sale — {flashModal?.product.name}</Text>
            <Text style={{ textAlign: 'center', color: '#666', marginBottom: 16, fontSize: 13 }}>
              Tồn kho:{' '}
              <Text style={{ color: '#e65100', fontWeight: '800' }}>{flashModal?.product.stock}</Text>
            </Text>
            <Text style={s.formLabel}>Mức giảm giá (%)</Text>
            <View style={s.discRow}>
              {[10, 15, 20, 25, 30, 40, 50].map(d => (
                <TouchableOpacity
                  key={d}
                  style={[s.discBtn, flashDisc === String(d) && s.discBtnActive]}
                  onPress={() => setFlashDisc(String(d))}
                >
                  <Text style={[s.discText, flashDisc === String(d) && { color: '#fff' }]}>{d}%</Text>
                </TouchableOpacity>
              ))}
            </View>
            {flashModal && (
              <Text style={{ textAlign: 'center', color: '#888', marginBottom: 16, fontSize: 12 }}>
                Giá Flash Sale:{' '}
                <Text style={{ color: '#e65100', fontWeight: '800' }}>
                  {fmtPrice(Math.round(flashModal.product.price * (1 - parseInt(flashDisc) / 100)))}
                </Text>
              </Text>
            )}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[s.submitBtn, { flex: 1 }]}
                onPress={() => flashModal && toggleFlashSale(flashModal.product, true, parseInt(flashDisc))}
              >
                <Text style={s.submitBtnText}>🔥 Kích hoạt Flash Sale</Text>
              </TouchableOpacity>
              {flashModal?.product.fsActive ? (
                <TouchableOpacity
                  style={[s.submitBtn, s.submitBtnRed, { flex: 1 }]}
                  onPress={() => flashModal && toggleFlashSale(flashModal.product, false, parseInt(flashDisc))}
                >
                  <Text style={s.submitBtnText}>⏸ Tắt Flash Sale</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>🏪 Kho hàng & Thống kê</Text>
        </View>
        {stats && (
          <View style={s.headerBadges}>
            {stats.lowStock > 0 && (
              <View style={[s.headerBadge, { backgroundColor: '#c62828' }]}>
                <Text style={s.headerBadgeText}>⚠ {stats.lowStock}</Text>
              </View>
            )}
            {stats.flashSuggest > 0 && (
              <View style={[s.headerBadge, { backgroundColor: '#e65100' }]}>
                <Text style={s.headerBadgeText}>🔥 {stats.flashSuggest}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Main tabs */}
      <View style={s.tabs}>
        {([
          { id: 'inventory', label: '📦 Kho hàng' },
          { id: 'stats',     label: '📊 Thống kê'  },
        ] as { id: MainTab; label: string }[]).map(t => (
          <TouchableOpacity
            key={t.id}
            style={[s.tab, mainTab === t.id && s.tabActive]}
            onPress={() => setMainTab(t.id)}
          >
            <Text style={[s.tabText, mainTab === t.id && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#2e7d32" />
          <Text style={{ marginTop: 12, color: '#666' }}>Đang tải...</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text style={{ fontSize: 40 }}>⚠️</Text>
          <Text style={{ color: '#c62828', marginTop: 8, textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={fetchAll}>
            <Text style={s.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {mainTab === 'inventory' && renderInventory()}
          {mainTab === 'stats'     && renderStats()}
        </>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4faf4' },

  header: {
    backgroundColor: '#1b5e20', paddingHorizontal: 20,
    paddingTop: 16, paddingBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  headerBadges: { flexDirection: 'row', gap: 6 },
  headerBadge:  { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  headerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8f5e9' },
  tab:         { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive:   { borderBottomWidth: 3, borderBottomColor: '#2e7d32' },
  tabText:     { fontSize: 13, color: '#aaa', fontWeight: '600' },
  tabTextActive: { color: '#2e7d32', fontWeight: '800' },

  subTabs: { flexDirection: 'row', backgroundColor: '#f9fbe7', borderBottomWidth: 1, borderBottomColor: '#e8f5e9' },
  subTab:       { flex: 1, paddingVertical: 10, alignItems: 'center' },
  subTabActive: { borderBottomWidth: 2, borderBottomColor: '#2e7d32', backgroundColor: '#fff' },
  subTabText:   { fontSize: 11, color: '#aaa', fontWeight: '600' },
  subTabTextActive: { color: '#2e7d32', fontWeight: '800' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  empty:  { textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 14 },

  retryBtn:  { backgroundColor: '#2e7d32', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10, marginTop: 16 },
  retryText: { color: '#fff', fontWeight: '700' },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1, minWidth: '44%', backgroundColor: '#fff', borderRadius: 12, padding: 14,
    alignItems: 'center', borderTopWidth: 3,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 1 },
  },
  statCardWide: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14,
    alignItems: 'center', borderTopWidth: 3, elevation: 1,
  },
  statEmoji: { fontSize: 24, marginBottom: 6 },
  statValue: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  statLabel: { fontSize: 11, color: '#888', marginTop: 4, textAlign: 'center' },

  chartCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1 },
  chartTitle:  { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 8 },
  chartLegend: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:   { width: 10, height: 10, borderRadius: 5 },
  legendText:  { fontSize: 11, color: '#666' },
  barChart:    { flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 4 },
  barGroup:    { flex: 1, alignItems: 'center', gap: 4 },
  bars:        { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 80 },
  bar:         { width: 10, borderRadius: 3 },
  barLabel:    { fontSize: 9, color: '#999', textAlign: 'center' },

  warnBanner: {
    backgroundColor: '#ffebee', borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#ef9a9a',
  },
  warnTitle: { fontSize: 14, fontWeight: '800', color: '#c62828', marginBottom: 4 },
  warnSub:   { fontSize: 12, color: '#b71c1c', marginBottom: 8 },
  warnLink:  { fontSize: 13, fontWeight: '700', color: '#c62828', textDecorationLine: 'underline' },

  // Inventory list
  searchRow: { marginBottom: 10 },
  searchInput: {
    backgroundColor: '#fff', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#e0e0e0', fontSize: 13, color: '#333',
  },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0' },
  filterBtnGreen:  { backgroundColor: '#e8f5e9', borderColor: '#a5d6a7' },
  filterBtnRed:    { backgroundColor: '#ffebee', borderColor: '#ef9a9a' },
  filterBtnOrange: { backgroundColor: '#fff3e0', borderColor: '#ffcc80' },
  filterBtnText: { fontSize: 12, color: '#888' },

  productCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    borderLeftWidth: 4, elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 },
  },
  productTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  productName: { fontSize: 14, fontWeight: '700', color: '#1b5e20' },
  productCat:  { fontSize: 11, color: '#888', marginTop: 2 },
  stockBadge:  { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  stockBadgeText: { fontSize: 11, fontWeight: '700' },
  stockRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  stockItem: { alignItems: 'center' },
  stockNum:  { fontSize: 22, fontWeight: '900', color: '#333' },
  stockLabel:{ fontSize: 10, color: '#aaa', marginTop: 2 },
  progressBg:   { height: 6, backgroundColor: '#f5f5f5', borderRadius: 3, marginBottom: 10, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  productActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: { flex: 1, paddingVertical: 8, backgroundColor: '#f5f5f5', borderRadius: 8, alignItems: 'center', minWidth: 80 },
  actionBtnText: { fontSize: 12, fontWeight: '700' },

  // Form
  formCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, elevation: 1 },
  formTitle: { fontSize: 16, fontWeight: '800', color: '#1b5e20', marginBottom: 16 },
  formLabel: { fontSize: 12, fontWeight: '700', color: '#666', marginBottom: 6, marginTop: 12 },
  formRow:   { flexDirection: 'row', gap: 10 },
  formInput: {
    backgroundColor: '#f9fbe7', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#e0e0e0', fontSize: 13, color: '#333',
  },
  pickerBtn: { backgroundColor: '#f9fbe7', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#c8e6c9' },
  pickerText:        { fontSize: 13, color: '#1b5e20', fontWeight: '600' },
  pickerPlaceholder: { fontSize: 13, color: '#aaa' },
  selectedInfo: { backgroundColor: '#e8f5e9', borderRadius: 8, padding: 10, marginTop: 8 },
  selectedInfoText: { fontSize: 13, color: '#2e7d32' },
  reasonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e0e0e0' },
  reasonBtnActive: { backgroundColor: '#e8f5e9', borderColor: '#2e7d32' },
  reasonText: { fontSize: 12, color: '#666' },
  reasonTextActive: { color: '#2e7d32', fontWeight: '700' },
  submitBtn: { backgroundColor: '#2e7d32', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  submitBtnRed: { backgroundColor: '#c62828' },
  submitBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Log
  logCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 },
  logIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logProduct: { fontSize: 13, fontWeight: '700', color: '#333' },
  logMeta:    { fontSize: 11, color: '#aaa', marginTop: 2 },
  logQty:     { fontSize: 16, fontWeight: '900' },

  // Flash modal
  discRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  discBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e0e0e0' },
  discBtnActive: { backgroundColor: '#e65100', borderColor: '#e65100' },
  discText: { fontSize: 13, color: '#666', fontWeight: '600' },

  // Sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  sheetTitle:      { fontSize: 16, fontWeight: '800', color: '#1b5e20', marginBottom: 16, textAlign: 'center' },
  sheetItem:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  sheetItemActive: { backgroundColor: '#f1f8e9', borderRadius: 10, paddingHorizontal: 8 },
  sheetItemText:   { flex: 1, fontSize: 14, color: '#333' },
  sheetCancel:     { marginTop: 16, alignItems: 'center', paddingVertical: 12, backgroundColor: '#f5f5f5', borderRadius: 12 },
  sheetCancelText: { color: '#888', fontWeight: '700', fontSize: 14 },
});