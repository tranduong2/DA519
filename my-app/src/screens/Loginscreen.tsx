import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, Alert, Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { loginUser } from '../services/authService';
import { useUserStore } from '@/store/userStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<NavProp>();
  const setUser = useUserStore(state => state.setUser);
  const rememberLogin = useUserStore(state => state.rememberLogin);
  const setRememberLogin = useUserStore(state => state.setRememberLogin);

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('remembered-login-email')
      .then((savedEmail) => {
        if (rememberLogin && savedEmail) setEmail(savedEmail);
      })
      .catch(() => undefined);
  }, []);

  const toggleRememberLogin = () => {
    const nextValue = !rememberLogin;
    setRememberLogin(nextValue);
    if (!nextValue) AsyncStorage.removeItem('remembered-login-email').catch(() => undefined);
  };

  const handleForgotPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setEmailError('Nhập email tài khoản trước khi yêu cầu hỗ trợ.');
      return;
    }

    const subject = encodeURIComponent('Yêu cầu hỗ trợ quên mật khẩu FreshVeggies');
    const body = encodeURIComponent(
      `Xin chào FreshVeggies,\n\nTôi quên mật khẩu của tài khoản: ${normalizedEmail}\nVui lòng hướng dẫn tôi xác minh và đặt lại mật khẩu.\n\nLưu ý: Tôi sẽ không gửi mật khẩu hoặc mã đăng nhập qua email.`,
    );
    const mailUrl = `mailto:nd141003@gmail.com?subject=${subject}&body=${body}`;

    try {
      const supported = await Linking.canOpenURL(mailUrl);
      if (!supported) throw new Error('Không có ứng dụng email');
      await Linking.openURL(mailUrl);
    } catch {
      Alert.alert(
        'Hỗ trợ đặt lại mật khẩu',
        'Vui lòng liên hệ 0914960478 hoặc gửi email tới nd141003@gmail.com. Không gửi mật khẩu hiện tại cho bất kỳ ai.',
      );
    }
  };

  const handleLogin = async () => {
    setEmailError('');
    setPasswordError('');
    setLoginError('');
    if (!email.trim()) setEmailError('Vui lòng nhập email.');
    if (!password) setPasswordError('Vui lòng nhập mật khẩu.');
    if (!email.trim() || !password) {
      return;
    }
    setLoading(true);
    try {
      const response = await loginUser({ email, password });

      if (rememberLogin) {
        await AsyncStorage.setItem('remembered-login-email', email.trim().toLowerCase());
      } else {
        await AsyncStorage.removeItem('remembered-login-email');
      }

      setUser({
        username: response.user?.name ?? response.user?.username ?? email,
        email:    response.user?.email ?? email,
        phone:    response.user?.phone ?? '',
        role:     response.user?.role ?? 'user',
        token:    response.token ?? '',
      });

      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });

    } catch (err: any) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.';
      const normalized = msg.toLowerCase();
      if (normalized.includes('email') && (normalized.includes('chưa') || normalized.includes('không'))) {
        setEmailError(msg);
      } else if (normalized.includes('mật khẩu')) {
        setPasswordError(msg);
      } else {
        setLoginError(msg);
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
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
          accessibilityRole="button"
          accessibilityLabel="Quay lại trang chính"
        >
          <Text style={styles.homeButtonText}>‹ Quay lại trang chính</Text>
        </TouchableOpacity>

        <View style={styles.topDecor}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
        </View>

        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>FV</Text>
          </View>
          <Text style={styles.brand}>FreshVeggies</Text>
          <Text style={styles.tagline}>Rau sạch — Sống khoe</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Đăng nhập</Text>
          <Text style={styles.subtitle}>Chào mừng bạn quay lại</Text>

          {!!loginError && (
            <View style={styles.errorBanner} accessibilityLiveRegion="assertive">
              <Text style={styles.errorBannerTitle}>Đăng nhập không thành công</Text>
              <Text style={styles.errorBannerText}>{loginError}</Text>
            </View>
          )}

          <Text style={styles.label}>Email</Text>
          <View style={[styles.inputWrap, !!emailError && styles.inputError]}>
            <TextInput
              style={styles.input}
              placeholder="example@email.com"
              placeholderTextColor="#b0bfb0"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="username"
              value={email}
              onChangeText={(value) => { setEmail(value); setEmailError(''); setLoginError(''); }}
            />
          </View>
          {!!emailError && <Text style={styles.fieldError}>{emailError}</Text>}

          <Text style={styles.label}>Mật khẩu</Text>
          <View style={[styles.inputWrap, !!passwordError && styles.inputError]}>
            <TextInput
              style={styles.input}
              placeholder="Nhập mật khẩu"
              placeholderTextColor="#b0bfb0"
              secureTextEntry={!showPass}
              autoComplete="current-password"
              textContentType="password"
              value={password}
              onChangeText={(value) => { setPassword(value); setPasswordError(''); setLoginError(''); }}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)}>
              <Text style={styles.showPass}>{showPass ? 'Ẩn' : 'Hiện'}</Text>
            </TouchableOpacity>
          </View>
          {!!passwordError && <Text style={styles.fieldError}>{passwordError}</Text>}

          <View style={styles.loginOptions}>
            <TouchableOpacity style={styles.rememberWrap} onPress={toggleRememberLogin} accessibilityRole="checkbox" accessibilityState={{ checked: rememberLogin }}>
              <View style={[styles.checkbox, rememberLogin && styles.checkboxChecked]}>
                {rememberLogin && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.rememberText}>Ghi nhớ đăng nhập</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.forgotWrap} onPress={handleForgotPassword}>
              <Text style={styles.forgot}>Quên mật khẩu?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnLoading]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.divLine} />
            <Text style={styles.divText}>hoặc</Text>
            <View style={styles.divLine} />
          </View>

          <TouchableOpacity style={styles.socialBtn} activeOpacity={0.85}>
            <Text style={styles.socialText}>Tiếp tục với Google</Text>
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.switchLink}>Đăng ký ngay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, backgroundColor: '#f4faf4', paddingBottom: 40 },

  homeButton: { position: 'absolute', top: 18, left: 18, zIndex: 3, minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.9)' },
  homeButtonText: { color: '#1b5e20', fontSize: 13, fontWeight: '700' },

  topDecor: { position: 'absolute', top: 0, left: 0, right: 0, height: 220, overflow: 'hidden' },
  circle1: { position: 'absolute', top: -80, left: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: '#c8e6c9', opacity: 0.55 },
  circle2: { position: 'absolute', top: -40, right: -40, width: 170, height: 170, borderRadius: 85, backgroundColor: '#a5d6a7', opacity: 0.4 },

  logoWrap: { alignItems: 'center', marginTop: 70, marginBottom: 24 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#2e7d32', alignItems: 'center', justifyContent: 'center', shadowColor: '#2e7d32', shadowOpacity: 0.18, shadowOffset: { width: 0, height: 4 }, elevation: 6, marginBottom: 10 },
  logoText: { fontSize: 22, fontWeight: '800', color: '#fff' },
  brand: { fontSize: 22, fontWeight: '800', color: '#1b5e20', letterSpacing: 0.5 },
  tagline: { fontSize: 12, color: '#66bb6a', marginTop: 3 },

  card: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#2e7d32', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#1b5e20', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#81c784', marginBottom: 22 },

  label: { fontSize: 12, fontWeight: '700', color: '#388e3c', marginBottom: 6, marginTop: 12 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f8e9', borderRadius: 14, paddingHorizontal: 12, height: 48, borderWidth: 1.5, borderColor: '#c8e6c9' },
  input: { flex: 1, fontSize: 14, color: '#2e7d32' },
  showPass: { fontSize: 13, color: '#388e3c', fontWeight: '600' },
  inputError: { borderColor: '#ef9a9a', backgroundColor: '#fff7f7' },
  fieldError: { color: '#c62828', fontSize: 12, marginTop: 5, marginLeft: 4 },
  errorBanner: { backgroundColor: '#fff2f2', borderWidth: 1, borderColor: '#ef9a9a', borderRadius: 12, padding: 12, marginBottom: 10 },
  errorBannerTitle: { color: '#b71c1c', fontSize: 13, fontWeight: '800', marginBottom: 3 },
  errorBannerText: { color: '#c62828', fontSize: 12, lineHeight: 18 },

  loginOptions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 12, flexWrap: 'wrap' },
  rememberWrap: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: '#81c784', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 7 },
  checkboxChecked: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '900', lineHeight: 16 },
  rememberText: { fontSize: 12, color: '#388e3c', fontWeight: '600' },
  forgotWrap: { minHeight: 32, justifyContent: 'center' },
  forgot: { fontSize: 12, color: '#66bb6a', fontWeight: '600' },

  btn: { marginTop: 22, backgroundColor: '#2e7d32', borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center', shadowColor: '#2e7d32', shadowOpacity: 0.35, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  btnLoading: { backgroundColor: '#81c784' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18, gap: 8 },
  divLine: { flex: 1, height: 1, backgroundColor: '#e8f5e9' },
  divText: { fontSize: 12, color: '#aaa' },

  socialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#c8e6c9', borderRadius: 16, height: 50, backgroundColor: '#fafffe' },
  socialText: { fontSize: 14, color: '#388e3c', fontWeight: '600' },

  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 22 },
  switchText: { fontSize: 13, color: '#888' },
  switchLink: { fontSize: 13, color: '#2e7d32', fontWeight: '800' },
});
