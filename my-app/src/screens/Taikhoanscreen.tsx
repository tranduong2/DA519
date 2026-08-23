import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ActivityIndicator, Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useUserStore } from '@/store/userStore';
import { updateUserProfile, changePassword as changePasswordApi } from '@/services/api';

type Section = 'info' | 'password' | 'address';
type ToastType = 'success' | 'error';

function useToast() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('success');
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = (msg: string, t: ToastType = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(msg);
    setType(t);
    setVisible(true);
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setVisible(false));
    }, 2500);
  };

  return { visible, message, type, opacity, show };
}

export default function TaiKhoanScreen() {
  const navigation = useNavigation();
  const user    = useUserStore(state => state.user);
  const setUser = useUserStore(state => state.setUser);
  const toast   = useToast();

  const [activeSection, setActiveSection] = useState<Section>('info');

  const [username, setUsername] = useState(user?.username ?? '');
  const [phone, setPhone]       = useState(user?.phone ?? '');

  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [address, setAddress] = useState(user?.address ?? '');

  const [savingInfo, setSavingInfo]         = useState(false);
  const [savingAddress, setSavingAddress]   = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username ?? '');
      setPhone(user.phone ?? '');
      setAddress(user.address ?? '');
    }
  }, [user?.username, user?.phone, user?.address]);

  const handleSaveInfo = async () => {
    if (!username.trim()) {
      toast.show('Tên người dùng không được để trống', 'error');
      return;
    }
    if (phone && !/^0\d{9}$/.test(phone)) {
      toast.show('Số điện thoại không hợp lệ (VD: 0901234567)', 'error');
      return;
    }
    if (!user || !user.token) {
      toast.show('Bạn cần đăng nhập lại', 'error');
      return;
    }
    try {
      setSavingInfo(true);
      const result = await updateUserProfile(user.token, {
        email: user.email,
        username: username.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });
      setUser({ ...user, ...(result.user ?? {}), name: username.trim(), username: username.trim(), phone: phone.trim(), token: user.token });
      toast.show('Đã cập nhật thông tin cá nhân');
    } catch (err: any) {
      toast.show(err.message || 'Cập nhật thất bại', 'error');
    } finally {
      setSavingInfo(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!address.trim()) {
      toast.show('Vui lòng nhập địa chỉ', 'error');
      return;
    }
    if (!user || !user.token) {
      toast.show('Bạn cần đăng nhập lại', 'error');
      return;
    }
    try {
      setSavingAddress(true);
      const result = await updateUserProfile(user.token, {
        email: user.email,
        username: username.trim() || user.username || '',
        phone: phone.trim() || user.phone || '',
        address: address.trim(),
      });
      setUser({ ...user, ...(result.user ?? {}), address: address.trim(), token: user.token });
      toast.show('Đã cập nhật địa chỉ giao hàng');
    } catch (err: any) {
      toast.show(err.message || 'Cập nhật thất bại', 'error');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      toast.show('Vui lòng điền đầy đủ thông tin', 'error');
      return;
    }
    if (newPw.length < 8) {
      toast.show('Mật khẩu mới phải có ít nhất 8 ký tự', 'error');
      return;
    }
    if (newPw !== confirmPw) {
      toast.show('Mật khẩu xác nhận không khớp', 'error');
      return;
    }
    if (!user || !user.token) {
      toast.show('Bạn cần đăng nhập lại', 'error');
      return;
    }
    try {
      setSavingPassword(true);
      await changePasswordApi(user.token, {
        currentPassword: currentPw,
        newPassword: newPw,
      });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      toast.show('Mật khẩu đã được thay đổi');
    } catch (err: any) {
      toast.show(err.message || 'Đổi mật khẩu thất bại', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const getStrength = (pw: string) => {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 6) s++;
    if (pw.length >= 10) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const strength = getStrength(newPw);
  const strengthLabel = ['', 'Rất yếu', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'][strength];
  const strengthColor = ['#ccc', '#e53935', '#fb8c00', '#fdd835', '#43a047', '#1b5e20'][strength];

  const tabs: { id: Section; label: string; icon: string }[] = [
    { id: 'info',     label: 'Thông tin', icon: '👤' },
    { id: 'password', label: 'Mật khẩu', icon: '🔒' },
    { id: 'address',  label: 'Địa chỉ',  icon: '📍' },
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* TOAST */}
      {toast.visible && (
        <Animated.View style={[styles.toast, toast.type === 'error' ? styles.toastError : styles.toastSuccess, { opacity: toast.opacity }]}>
          <Text style={styles.toastText}>
            {toast.type === 'success' ? '✅ ' : '❌ '}{toast.message}
          </Text>
        </Animated.View>
      )}

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.bigAvatar}>
              <Text style={styles.bigAvatarText}>{user?.username?.[0]?.toUpperCase() ?? 'U'}</Text>
            </View>
            <Text style={styles.headerName}>{user?.username}</Text>
            <Text style={styles.headerEmail}>{user?.email}</Text>
            {user?.role === 'admin' && (
              <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>⚙️ Admin</Text></View>
            )}
          </View>
        </View>

        {/* TABS */}
        <View style={styles.tabs}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeSection === tab.id && styles.tabActive]}
              onPress={() => setActiveSection(tab.id)}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabText, activeSection === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ====== THÔNG TIN ====== */}
        {activeSection === 'info' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>✏️ Chỉnh sửa thông tin</Text>

            <Field label="Tên người dùng" required>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Nhập tên người dùng"
                placeholderTextColor="#bbb"
                maxLength={40}
              />
            </Field>

            <Field label="Email" hint="Không thể thay đổi">
              <View style={styles.inputDisabled}>
                <Text style={styles.inputDisabledText}>{user?.email}</Text>
                <Text>🔒</Text>
              </View>
            </Field>

            <Field label="Số điện thoại">
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="VD: 0901234567"
                placeholderTextColor="#bbb"
                keyboardType="phone-pad"
                maxLength={11}
              />
            </Field>

            <TouchableOpacity
              style={[styles.saveBtn, savingInfo && styles.saveBtnDisabled]}
              onPress={handleSaveInfo}
              disabled={savingInfo}
            >
              {savingInfo ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>💾 Lưu thay đổi</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ====== MẬT KHẨU ====== */}
        {activeSection === 'password' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔒 Đổi mật khẩu</Text>

            <Field label="Mật khẩu hiện tại">
              <View style={styles.pwRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={currentPw}
                  onChangeText={setCurrentPw}
                  placeholder="Nhập mật khẩu hiện tại"
                  placeholderTextColor="#bbb"
                  secureTextEntry={!showCurrent}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowCurrent(v => !v)}>
                  <Text>{showCurrent ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </Field>

            <Field label="Mật khẩu mới">
              <View style={styles.pwRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={newPw}
                  onChangeText={setNewPw}
                  placeholder="Tối thiểu 8 ký tự"
                  placeholderTextColor="#bbb"
                  secureTextEntry={!showNew}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNew(v => !v)}>
                  <Text>{showNew ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {newPw.length > 0 && (
                <View style={styles.strengthWrap}>
                  <View style={styles.strengthBars}>
                    {[1,2,3,4,5].map(i => (
                      <View key={i} style={[styles.strengthBar, { backgroundColor: i <= strength ? strengthColor : '#e0e0e0' }]} />
                    ))}
                  </View>
                  <Text style={[styles.strengthLabel, { color: strengthColor }]}>{strengthLabel}</Text>
                </View>
              )}
            </Field>

            <Field label="Xác nhận mật khẩu mới">
              <View style={styles.pwRow}>
                <TextInput
                  style={[styles.input, { flex: 1, borderColor: confirmPw && confirmPw !== newPw ? '#e53935' : '#ddd' }]}
                  value={confirmPw}
                  onChangeText={setConfirmPw}
                  placeholder="Nhập lại mật khẩu mới"
                  placeholderTextColor="#bbb"
                  secureTextEntry={!showConfirm}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(v => !v)}>
                  <Text>{showConfirm ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {confirmPw.length > 0 && confirmPw !== newPw && (
                <Text style={styles.errorText}>⚠️ Mật khẩu không khớp</Text>
              )}
              {confirmPw.length > 0 && confirmPw === newPw && (
                <Text style={styles.successText}>✅ Mật khẩu khớp</Text>
              )}
            </Field>

            <View style={styles.pwTips}>
              <Text style={styles.pwTipsTitle}>💡 Gợi ý mật khẩu mạnh:</Text>
              <Text style={styles.pwTipItem}>• Tối thiểu 8 ký tự</Text>
              <Text style={styles.pwTipItem}>• Kết hợp chữ hoa, chữ thường</Text>
              <Text style={styles.pwTipItem}>• Thêm số và ký tự đặc biệt (@, #, !...)</Text>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, savingPassword && styles.saveBtnDisabled]}
              onPress={handleChangePassword}
              disabled={savingPassword}
            >
              {savingPassword ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>🔑 Cập nhật mật khẩu</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ====== ĐỊA CHỈ ====== */}
        {activeSection === 'address' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📍 Địa chỉ giao hàng</Text>

            <Field label="Địa chỉ" required>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={address}
                onChangeText={setAddress}
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
                placeholderTextColor="#bbb"
                multiline
                numberOfLines={4}
              />
            </Field>

            <TouchableOpacity
              style={[styles.saveBtn, savingAddress && styles.saveBtnDisabled]}
              onPress={handleSaveAddress}
              disabled={savingAddress}
            >
              {savingAddress ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>💾 Lưu địa chỉ</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children, required, hint }: {
  label: string; children: React.ReactNode; required?: boolean; hint?: string;
}) {
  return (
    <View style={fieldStyles.wrap}>
      <View style={fieldStyles.labelRow}>
        <Text style={fieldStyles.label}>{label}{required && <Text style={fieldStyles.required}> *</Text>}</Text>
        {hint && <Text style={fieldStyles.hint}>{hint}</Text>}
      </View>
      {children}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '700', color: '#444' },
  required: { color: '#e53935' },
  hint: { fontSize: 11, color: '#aaa', fontStyle: 'italic' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4faf4' },

  toast: {
    position: 'absolute', top: 56, left: 16, right: 16, zIndex: 999,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  toastSuccess: { backgroundColor: '#2e7d32' },
  toastError:   { backgroundColor: '#c62828' },
  toastText:    { color: '#fff', fontSize: 14, fontWeight: '700', flex: 1 },

  header: { backgroundColor: '#1b5e20', paddingTop: 50, paddingBottom: 28, alignItems: 'center' },
  backBtn: { position: 'absolute', top: 50, left: 16, padding: 8, zIndex: 10 },
  backIcon: { fontSize: 22, color: '#fff' },
  headerCenter: { alignItems: 'center', gap: 4 },
  bigAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 3, borderColor: '#a5d6a7' },
  bigAvatarText: { fontSize: 32, fontWeight: '900', color: '#1b5e20' },
  headerName: { fontSize: 20, fontWeight: '900', color: '#fff' },
  headerEmail: { fontSize: 12, color: '#a5d6a7', marginTop: 2 },
  adminBadge: { marginTop: 6, backgroundColor: '#fff3', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  adminBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginTop: -16, borderRadius: 14, elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, overflow: 'hidden' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 2 },
  tabActive: { backgroundColor: '#e8f5e9', borderBottomWidth: 3, borderBottomColor: '#2e7d32' },
  tabIcon: { fontSize: 18 },
  tabText: { fontSize: 11, color: '#888', fontWeight: '600' },
  tabTextActive: { color: '#2e7d32', fontWeight: '800' },
  card: { backgroundColor: '#fff', borderRadius: 16, margin: 16, padding: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 } },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1b5e20', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#333', backgroundColor: '#fafafa' },
  inputMultiline: { minHeight: 100, textAlignVertical: 'top' },
  inputDisabled: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: '#f5f5f5' },
  inputDisabledText: { fontSize: 14, color: '#aaa' },
  pwRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 8 },
  strengthWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '700', width: 64 },
  errorText: { fontSize: 12, color: '#e53935', marginTop: 4 },
  successText: { fontSize: 12, color: '#43a047', marginTop: 4 },
  pwTips: { backgroundColor: '#f1f8e9', borderRadius: 10, padding: 12, marginBottom: 16 },
  pwTipsTitle: { fontSize: 12, fontWeight: '700', color: '#2e7d32', marginBottom: 6 },
  pwTipItem: { fontSize: 12, color: '#555', marginBottom: 2 },
  saveBtn: { backgroundColor: '#2e7d32', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
