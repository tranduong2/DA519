import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { registerUser } from '../services/authService';
import { useUserStore } from '@/store/userStore';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const emailRx   = /^[^\s@]+@gmail\.com$/i;
const upperRx   = /[A-Z]/;
const specialRx = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
const digitRx   = /[0-9]/;

function passwordStrength(pw: string): { label: string; color: string; score: number } {
  let score = 0;
  if (pw.length >= 8)      score++;
  if (upperRx.test(pw))    score++;
  if (specialRx.test(pw))  score++;
  if (digitRx.test(pw))    score++;
  if (pw.length >= 12)     score++;

  if (score <= 1) return { label: 'Rat yeu',    color: '#ef5350', score };
  if (score === 2) return { label: 'Yeu',        color: '#ff7043', score };
  if (score === 3) return { label: 'Trung binh', color: '#ffb300', score };
  if (score === 4) return { label: 'Manh',       color: '#66bb6a', score };
  return                   { label: 'Rat manh',  color: '#2e7d32', score };
}

export default function RegisterScreen() {
  const navigation = useNavigation<NavProp>();
  const setUser = useUserStore(state => state.setUser);

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [agreed,   setAgreed]   = useState(false);
  const [touched,  setTouched]  = useState<Record<string, boolean>>({});
  const [serverError, setServerError] = useState('');
  const [emailServerError, setEmailServerError] = useState('');

  const touch = (field: string) => setTouched(p => ({ ...p, [field]: true }));

  const nameErr    = name.trim().length < 2 ? 'Họ tên phải có ít nhất 2 ký tự.' : '';
  const emailErr   = !emailRx.test(email)   ? 'Vui lòng nhập địa chỉ Gmail hợp lệ.' : emailServerError;
  const phoneErr   = !/^(0|\+84)[0-9]{8,10}$/.test(phone.replace(/\s/g, '')) ? 'Số điện thoại không hợp lệ.' : '';
  const confirmErr = confirm !== password   ? 'Mật khẩu xác nhận không khớp.' : '';

  const pwErrors: string[] = [];
  if (password.length < 8)       pwErrors.push('it nhat 8 ky tu');
  if (!upperRx.test(password))   pwErrors.push('1 chu hoa');
  if (!digitRx.test(password))   pwErrors.push('1 chu so');
  // if (!specialRx.test(password)) pwErrors.push('1 ky tu dac biet');

  const pwInfo  = passwordStrength(password);
  const isValid = !nameErr && !emailErr && !phoneErr &&
                  pwErrors.length === 0 && !confirmErr && agreed;

  const handleRegister = async () => {
    setServerError('');
    setTouched({ name: true, email: true, phone: true, password: true, confirm: true, agreed: true });
    if (!isValid) return;

    setLoading(true);
    try {
      const response = await registerUser({ name, email, phone, password });

      setUser({
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        username: response.user.name ?? name,
        phone,
        token: response.token,
        role: response.user.role,
      });

      navigation.navigate('UserProfileSetup', { name, email, phone });
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Không thể đăng ký. Vui lòng thử lại.';
      if (message.toLowerCase().includes('email') && message.toLowerCase().includes('tồn tại')) {
        setEmailServerError('Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.');
        setTouched(previous => ({ ...previous, email: true }));
      } else {
        setServerError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topDecor}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
          <View style={styles.circle3} />
        </View>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>{'<'}</Text>
          </TouchableOpacity>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>FV</Text>
          </View>
          <Text style={styles.brand}>Tao tai khoan</Text>
          <Text style={styles.tagline}>Tham gia cong dong rau sach ngay hom nay</Text>
        </View>

        <View style={styles.card}>

          {!!serverError && (
            <View style={styles.errorBanner} accessibilityLiveRegion="assertive">
              <Text style={styles.errorBannerTitle}>Không thể tạo tài khoản</Text>
              <Text style={styles.errorBannerText}>{serverError}</Text>
            </View>
          )}

          {/* Ho ten */}
          <Text style={styles.label}>Ho va ten *</Text>
          <View style={[styles.inputWrap, touched.name && nameErr ? styles.inputError : null]}>
            <TextInput
              style={styles.input}
              placeholder="Nguyen Van A"
              placeholderTextColor="#b0bfb0"
              value={name}
              onChangeText={setName}
              onBlur={() => touch('name')}
            />
            {touched.name && !nameErr && <Text style={styles.ok}>ok</Text>}
          </View>
          {touched.name && !!nameErr && <Text style={styles.errorText}>{nameErr}</Text>}

          {/* Email */}
          <Text style={styles.label}>Email *</Text>
          <View style={[styles.inputWrap, touched.email && emailErr ? styles.inputError : null]}>
            <TextInput
              style={styles.input}
              placeholder="example@gmail.com"
              placeholderTextColor="#b0bfb0"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(value) => {
                setEmail(value.trim());
                setEmailServerError('');
                setServerError('');
              }}
              onBlur={() => touch('email')}
            />
            {touched.email && !emailErr && <Text style={styles.ok}>ok</Text>}
          </View>
          {touched.email && !!emailErr && <Text style={styles.errorText}>{emailErr}</Text>}

          {/* SDT */}
          <Text style={styles.label}>So dien thoai *</Text>
          <View style={[styles.inputWrap, touched.phone && phoneErr ? styles.inputError : null]}>
            <TextInput
              style={styles.input}
              placeholder="0901 234 567"
              placeholderTextColor="#b0bfb0"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(value) => {
                setPhone(value);
                setServerError('');
              }}
              onBlur={() => touch('phone')}
            />
            {touched.phone && !phoneErr && <Text style={styles.ok}>ok</Text>}
          </View>
          {touched.phone && !!phoneErr && <Text style={styles.errorText}>{phoneErr}</Text>}

          {/* Mat khau */}
          <Text style={styles.label}>Mat khau *</Text>
          <View style={[styles.inputWrap, touched.password && pwErrors.length > 0 ? styles.inputError : null]}>
            <TextInput
              style={styles.input}
              placeholder="Toi thieu 8 ky tu"
              placeholderTextColor="#b0bfb0"
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
              onBlur={() => touch('password')}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)}>
              <Text style={styles.toggleText}>{showPass ? 'An' : 'Hien'}</Text>
            </TouchableOpacity>
          </View>

          {password.length > 0 && (
            <View style={styles.strengthRow}>
              {[1,2,3,4,5].map(i => (
                <View key={i} style={[styles.strengthSeg, { backgroundColor: i <= pwInfo.score ? pwInfo.color : '#e0e0e0' }]} />
              ))}
              <Text style={[styles.strengthLabel, { color: pwInfo.color }]}>{pwInfo.label}</Text>
            </View>
          )}

          {touched.password && pwErrors.length > 0 && (
            <View style={styles.pwChecklist}>
              {[
                { key: 'len', label: 'It nhat 8 ky tu',       ok: password.length >= 8 },
                { key: 'up',  label: 'Co chu hoa (A-Z)',       ok: upperRx.test(password) },
                { key: 'dig', label: 'Co chu so (0-9)',        ok: digitRx.test(password) },
                // { key: 'sp',  label: 'Co ky tu dac biet',     ok: specialRx.test(password) },
              ].map(r => (
                <View key={r.key} style={styles.pwCheckRow}>
                  <Text style={r.ok ? styles.checkGreen : styles.checkRed}>{r.ok ? 'V' : 'X'}</Text>
                  <Text style={[styles.checkRowText, r.ok && styles.checkRowOk]}>{r.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Xac nhan mat khau */}
          <Text style={styles.label}>Xac nhan mat khau *</Text>
          <View style={[styles.inputWrap, touched.confirm && confirmErr ? styles.inputError : null]}>
            <TextInput
              style={styles.input}
              placeholder="Nhap lai mat khau"
              placeholderTextColor="#b0bfb0"
              secureTextEntry={!showConf}
              value={confirm}
              onChangeText={setConfirm}
              onBlur={() => touch('confirm')}
            />
            <TouchableOpacity onPress={() => setShowConf(!showConf)}>
              <Text style={styles.toggleText}>{showConf ? 'An' : 'Hien'}</Text>
            </TouchableOpacity>
          </View>
          {touched.confirm && !!confirmErr && <Text style={styles.errorText}>{confirmErr}</Text>}

          {/* Dieu khoan */}
          <TouchableOpacity style={styles.agreeRow} onPress={() => setAgreed(!agreed)} activeOpacity={0.8}>
            <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
              {agreed && <Text style={styles.checkmark}>V</Text>}
            </View>
            <Text style={styles.agreeText}>
              Toi dong y voi <Text style={styles.agreeLink}>Dieu khoan dich vu</Text> va <Text style={styles.agreeLink}>Chinh sach bao mat</Text>
            </Text>
          </TouchableOpacity>
          {touched.agreed && !agreed && (
            <Text style={styles.errorText}>Bạn cần đồng ý với điều khoản để đăng ký.</Text>
          )}

          <TouchableOpacity
            style={[styles.btn, (!isValid || loading) && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>{loading ? 'Dang tao tai khoan...' : 'Dang ky ngay'}</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.divLine} />
            <Text style={styles.divText}>hoac</Text>
            <View style={styles.divLine} />
          </View>

          <TouchableOpacity style={styles.socialBtn} activeOpacity={0.85}>
            <Text style={styles.socialText}>Dang ky voi Google</Text>
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Da co tai khoan? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.switchLink}>Dang nhap</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, backgroundColor: '#f4faf4', paddingBottom: 48 },

  topDecor: { position: 'absolute', top: 0, left: 0, right: 0, height: 200, overflow: 'hidden' },
  circle1: { position: 'absolute', top: -70, left: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: '#c8e6c9', opacity: 0.5 },
  circle2: { position: 'absolute', top: -30, right: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: '#a5d6a7', opacity: 0.38 },
  circle3: { position: 'absolute', top: 90, left: '30%', width: 100, height: 100, borderRadius: 50, backgroundColor: '#dcedc8', opacity: 0.45 },

  header: { alignItems: 'center', marginTop: 56, marginBottom: 20, paddingHorizontal: 20 },
  backBtn: { position: 'absolute', left: 20, top: 0, width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#2e7d32', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  backIcon: { fontSize: 18, color: '#2e7d32', fontWeight: '700' },
  logoCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#2e7d32', alignItems: 'center', justifyContent: 'center', shadowColor: '#2e7d32', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 4 }, elevation: 5, marginBottom: 10 },
  logoText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  brand: { fontSize: 20, fontWeight: '800', color: '#1b5e20', letterSpacing: 0.4 },
  tagline: { fontSize: 12, color: '#66bb6a', marginTop: 4, textAlign: 'center' },

  card: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#2e7d32', shadowOpacity: 0.07, shadowOffset: { width: 0, height: 6 }, elevation: 8 },

  label: { fontSize: 12, fontWeight: '700', color: '#388e3c', marginBottom: 6, marginTop: 14 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f8e9', borderRadius: 14, paddingHorizontal: 12, height: 48, borderWidth: 1.5, borderColor: '#c8e6c9' },
  inputError: { borderColor: '#ef9a9a', backgroundColor: '#fff8f8' },
  input: { flex: 1, fontSize: 14, color: '#2e7d32' },
  toggleText: { fontSize: 13, color: '#388e3c', fontWeight: '600' },
  ok: { fontSize: 12, color: '#2e7d32', fontWeight: '800' },
  errorText: { fontSize: 11, color: '#e53935', marginTop: 5, marginLeft: 4 },
  errorBanner: { backgroundColor: '#fff2f2', borderWidth: 1, borderColor: '#ef9a9a', borderRadius: 12, padding: 12, marginBottom: 8 },
  errorBannerTitle: { color: '#b71c1c', fontSize: 13, fontWeight: '800', marginBottom: 3 },
  errorBannerText: { color: '#c62828', fontSize: 12, lineHeight: 18 },

  strengthRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  strengthSeg: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '700', marginLeft: 6, minWidth: 60 },

  pwChecklist: { marginTop: 8, padding: 10, backgroundColor: '#f9fbe7', borderRadius: 10, gap: 4 },
  pwCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkGreen: { fontSize: 12, color: '#2e7d32', fontWeight: '800' },
  checkRed: { fontSize: 12, color: '#e53935', fontWeight: '800' },
  checkRowText: { fontSize: 12, color: '#888' },
  checkRowOk: { color: '#2e7d32' },

  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 18, gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#c8e6c9', alignItems: 'center', justifyContent: 'center', marginTop: 1, backgroundColor: '#f1f8e9' },
  checkboxActive: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '800' },
  agreeText: { flex: 1, fontSize: 12, color: '#666', lineHeight: 18 },
  agreeLink: { color: '#2e7d32', fontWeight: '700' },

  btn: { marginTop: 20, backgroundColor: '#2e7d32', borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center', shadowColor: '#2e7d32', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  btnDisabled: { backgroundColor: '#a5d6a7', shadowOpacity: 0 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18, gap: 8 },
  divLine: { flex: 1, height: 1, backgroundColor: '#e8f5e9' },
  divText: { fontSize: 12, color: '#aaa' },

  socialBtn: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#c8e6c9', borderRadius: 16, height: 50, backgroundColor: '#fafffe' },
  socialText: { fontSize: 14, color: '#388e3c', fontWeight: '600' },

  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 22 },
  switchText: { fontSize: 13, color: '#888' },
  switchLink: { fontSize: 13, color: '#2e7d32', fontWeight: '800' },
});
