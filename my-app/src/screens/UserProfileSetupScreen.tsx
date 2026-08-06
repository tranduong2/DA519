import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { updateUserProfile } from '../services/profileService';
import { useUserStore } from '@/store/userStore';

type NavProp       = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'UserProfileSetup'>;

const PROVINCES = [
  'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng',
  'An Giang', 'Bà Rịa - Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu',
  'Bắc Ninh', 'Bến Tre', 'Bình Định', 'Bình Dương', 'Bình Phước',
  'Bình Thuận', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Đắk Nông',
  'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Giang',
  'Hà Nam', 'Hà Tĩnh', 'Hải Dương', 'Hậu Giang', 'Hòa Bình',
  'Hưng Yên', 'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu',
  'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định',
  'Nghệ An', 'Ninh Bình', 'Ninh Thuận', 'Phú Thọ', 'Phú Yên',
  'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị',
  'Sóc Trăng', 'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên',
  'Thanh Hóa', 'Thừa Thiên Huế', 'Tiền Giang', 'Trà Vinh', 'Tuyên Quang',
  'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái',
];

const STEPS = [
  { key: 'username', title: 'Tên hiển thị',      subtitle: 'Mọi người sẽ thấy tên này' },
  { key: 'address',  title: 'Địa chỉ giao hàng', subtitle: 'Để giao rau tươi đến tận nhà' },
  { key: 'phone',    title: 'Số điện thoại',      subtitle: 'Dùng để liên hệ khi giao hàng' },
];

export default function UserProfileSetupScreen() {
  const navigation = useNavigation<NavProp>();
  const route      = useRoute<RoutePropType>();
  const { name: regName, email: regEmail, phone: regPhone } = route.params ?? {};
  const setUser = useUserStore.getState().setUser;

  const [step,       setStep]       = useState(0);
  const [username,   setUsername]   = useState(regName ?? '');
  const [street,     setStreet]     = useState('');
  const [ward,       setWard]       = useState('');
  const [district,   setDistrict]   = useState('');
  const [province,   setProvince]   = useState('');
  const [showProv,   setShowProv]   = useState(false);
  const [provSearch, setProvSearch] = useState('');
  const [phone,      setPhone]      = useState(regPhone ?? '');
  const [loading,    setLoading]    = useState(false);

  const progress = (step + 1) / STEPS.length;

  // ── Validation ──────────────────────────────────────────────────────────
  const usernameOk = username.trim().length >= 2;
  const addressOk  = street.trim().length >= 3 && district.trim().length >= 2 && province.length > 0;

  const phoneOk    = phone.trim().length > 0;
  // const phoneOk    = /^(0|\+84)[0-9]{8,10}$/.test(phone);

  const canNext =
    step === 0 ? usernameOk :
    step === 1 ? addressOk  :
    phoneOk;

  // ── Next / Finish ────────────────────────────────────────────────────────
  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
      return;
    }

    setLoading(true);
    try {
      const fullAddress = [street, ward, district, province]
        .filter(Boolean)
        .join(', ');

      await updateUserProfile({
        email:    regEmail ?? '',
        username,
        address:  fullAddress,
        phone,
      });

      setUser({
        username,
        email: regEmail ?? '',
        phone,
        address: fullAddress,
      });

      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const filteredProvinces = PROVINCES.filter(p =>
    p.toLowerCase().includes(provSearch.toLowerCase())
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Decor */}
        <View style={styles.topDecor}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.stepNum}>{step + 1}</Text>
          </View>
          <Text style={styles.brand}>{STEPS[step].title}</Text>
          <Text style={styles.tagline}>{STEPS[step].subtitle}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>Bước {step + 1} / {STEPS.length}</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>

          {/* ══ Step 0: Username ══ */}
          {step === 0 && (
            <>
              <Text style={styles.label}>Tên hiển thị <Text style={styles.req}>*</Text></Text>
              <View style={[styles.inputWrap, username.length > 0 && !usernameOk && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  placeholder="VD: Nguyễn Văn A"
                  placeholderTextColor="#b0bfb0"
                  value={username}
                  onChangeText={setUsername}
                  maxLength={40}
                />
                {usernameOk && <Text style={styles.ok}>✓</Text>}
              </View>
              {username.length > 0 && !usernameOk && (
                <Text style={styles.errorText}>Tên phải có ít nhất 2 ký tự</Text>
              )}
              <Text style={styles.hint}>
                Tên này sẽ xuất hiện trong các đơn hàng của bạn
              </Text>

              <View style={styles.avatarSection}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitial}>
                    {username.trim().charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
                <Text style={styles.avatarLabel}>Xem trước tên hiển thị</Text>
                {usernameOk && (
                  <View style={styles.avatarNameBadge}>
                    <Text style={styles.avatarName}>{username.trim()}</Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* ══ Step 1: Address ══ */}
          {step === 1 && (
            <>
              <Text style={styles.label}>Số nhà / Tên đường <Text style={styles.req}>*</Text></Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="VD: 123 Đường Lê Lợi"
                  placeholderTextColor="#b0bfb0"
                  value={street}
                  onChangeText={setStreet}
                />
              </View>

              <Text style={styles.label}>Phường / Xã</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="VD: Phường Bến Nghé"
                  placeholderTextColor="#b0bfb0"
                  value={ward}
                  onChangeText={setWard}
                />
              </View>

              <Text style={styles.label}>Quận / Huyện <Text style={styles.req}>*</Text></Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="VD: Quận 1"
                  placeholderTextColor="#b0bfb0"
                  value={district}
                  onChangeText={setDistrict}
                />
              </View>

              <Text style={styles.label}>Tỉnh / Thành phố <Text style={styles.req}>*</Text></Text>
              <TouchableOpacity
                style={styles.inputWrap}
                onPress={() => setShowProv(!showProv)}
                activeOpacity={0.8}
              >
                <Text style={[styles.input, !province && { color: '#b0bfb0' }]}>
                  {province || 'Chọn tỉnh / thành phố'}
                </Text>
                <Text style={styles.chevron}>{showProv ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {showProv && (
                <>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.input}
                      placeholder="Tìm tỉnh thành..."
                      placeholderTextColor="#b0bfb0"
                      value={provSearch}
                      onChangeText={setProvSearch}
                      autoFocus
                    />
                  </View>
                  <View style={styles.provinceDropdown}>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                      {filteredProvinces.map(p => (
                        <TouchableOpacity
                          key={p}
                          style={styles.provinceItem}
                          onPress={() => {
                            setProvince(p);
                            setProvSearch('');
                            setShowProv(false);
                          }}
                        >
                          <Text style={styles.provinceItemText}>{p}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </>
              )}

              {addressOk && (
                <View style={styles.addressPreview}>
                  <Text style={styles.addressPreviewTitle}>Địa chỉ giao hàng:</Text>
                  <Text style={styles.addressPreviewText}>
                    {[street, ward, district, province].filter(Boolean).join(', ')}
                  </Text>
                </View>
              )}
            </>
          )}

          {/* ══ Step 2: Phone ══ */}
          {step === 2 && (
            <>
              <Text style={styles.label}>Số điện thoại <Text style={styles.req}>*</Text></Text>
              <View style={[styles.inputWrap, phone.length > 0 && !phoneOk && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  placeholder="0901 234 567"
                  placeholderTextColor="#b0bfb0"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
                {phoneOk && <Text style={styles.ok}>✓</Text>}
              </View>
              {phone.length > 0 && !phoneOk && (
                <Text style={styles.errorText}>Số điện thoại không hợp lệ</Text>
              )}
              <Text style={styles.hint}>
                Số điện thoại dùng để liên hệ khi giao hàng
              </Text>
            </>
          )}

          {/* Navigation */}
          <View style={styles.navRow}>
            {step > 0 && (
              <TouchableOpacity style={styles.backStep} onPress={() => setStep(s => s - 1)}>
                <Text style={styles.backStepText}>Quay lại</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.btn,
                (!canNext || loading) && styles.btnDisabled,
                step === 0 && { flex: 1 },
              ]}
              onPress={handleNext}
              disabled={!canNext || loading}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>
                {loading ? 'Đang xử lý...' : step === STEPS.length - 1 ? 'Hoàn tất' : 'Tiếp theo'}
              </Text>
            </TouchableOpacity>
          </View>

          {step < STEPS.length - 1 && (
            <TouchableOpacity style={styles.skipBtn} onPress={() => setStep(s => s + 1)}>
              <Text style={styles.skipText}>Bỏ qua bước này</Text>
            </TouchableOpacity>
          )}

        </View>

        {/* Step dots */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]} />
          ))}
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, backgroundColor: '#f4faf4', paddingBottom: 48 },

  topDecor: { position: 'absolute', top: 0, left: 0, right: 0, height: 200, overflow: 'hidden' },
  circle1: { position: 'absolute', top: -60, left: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: '#c8e6c9', opacity: 0.5 },
  circle2: { position: 'absolute', top: -20, right: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: '#a5d6a7', opacity: 0.38 },

  header: { alignItems: 'center', marginTop: 56, marginBottom: 20, paddingHorizontal: 24 },
  logoCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#2e7d32', alignItems: 'center', justifyContent: 'center', shadowColor: '#2e7d32', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 4 }, elevation: 5, marginBottom: 10 },
  stepNum: { fontSize: 26, fontWeight: '800', color: '#fff' },
  brand: { fontSize: 20, fontWeight: '800', color: '#1b5e20', letterSpacing: 0.4 },
  tagline: { fontSize: 12, color: '#66bb6a', marginTop: 4, textAlign: 'center' },

  progressBar: { width: '80%', height: 6, backgroundColor: '#c8e6c9', borderRadius: 3, marginTop: 16, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#2e7d32', borderRadius: 3 },
  progressLabel: { fontSize: 11, color: '#888', marginTop: 6 },

  card: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#2e7d32', shadowOpacity: 0.07, shadowOffset: { width: 0, height: 6 }, elevation: 8 },

  req: { color: '#e53935' },
  label: { fontSize: 12, fontWeight: '700', color: '#388e3c', marginBottom: 6, marginTop: 14 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f8e9', borderRadius: 14, paddingHorizontal: 12, height: 48, borderWidth: 1.5, borderColor: '#c8e6c9' },
  inputError: { borderColor: '#ef9a9a', backgroundColor: '#fff8f8' },
  input: { flex: 1, fontSize: 14, color: '#2e7d32' },
  ok: { fontSize: 14, color: '#2e7d32', fontWeight: '800' },
  errorText: { fontSize: 11, color: '#e53935', marginTop: 5, marginLeft: 4 },
  hint: { fontSize: 11, color: '#9e9e9e', marginTop: 8, marginLeft: 2, lineHeight: 16 },
  chevron: { fontSize: 12, color: '#888' },

  avatarSection: { alignItems: 'center', marginTop: 24, padding: 16, backgroundColor: '#f1f8e9', borderRadius: 16 },
  avatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#2e7d32', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarInitial: { fontSize: 28, color: '#fff', fontWeight: '800' },
  avatarLabel: { fontSize: 11, color: '#888' },
  avatarNameBadge: { marginTop: 6, paddingHorizontal: 14, paddingVertical: 4, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1.5, borderColor: '#c8e6c9' },
  avatarName: { fontSize: 13, color: '#2e7d32', fontWeight: '700' },

  addressPreview: { marginTop: 14, padding: 12, backgroundColor: '#f1f8e9', borderRadius: 12, borderLeftWidth: 3, borderLeftColor: '#2e7d32' },
  addressPreviewTitle: { fontSize: 11, fontWeight: '700', color: '#388e3c', marginBottom: 4 },
  addressPreviewText: { fontSize: 13, color: '#2e7d32', lineHeight: 18 },

  provinceDropdown: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#c8e6c9', marginTop: 4, overflow: 'hidden' },
  provinceItem: { paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#f1f8e9' },
  provinceItemText: { fontSize: 13, color: '#2e7d32' },

  navRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  backStep: { borderWidth: 1.5, borderColor: '#c8e6c9', borderRadius: 16, height: 52, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  backStepText: { fontSize: 13, color: '#388e3c', fontWeight: '700' },
  btn: { flex: 1, backgroundColor: '#2e7d32', borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center', shadowColor: '#2e7d32', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  btnDisabled: { backgroundColor: '#a5d6a7', shadowOpacity: 0 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  skipBtn: { alignItems: 'center', marginTop: 14 },
  skipText: { fontSize: 12, color: '#aaa' },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#c8e6c9' },
  dotActive: { width: 24, backgroundColor: '#2e7d32' },
  dotDone: { backgroundColor: '#66bb6a' },
});