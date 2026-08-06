import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { loginUser } from '../services/authService';
import { useUserStore } from '@/store/userStore';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<NavProp>();
  const setUser = useUserStore(state => state.setUser);

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập email và mật khẩu');
      return;
    }
    setLoading(true);
    try {
      const response = await loginUser({ email, password });

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
      const msg = err.message ?? '';
      Alert.alert('❌ Đăng nhập thất bại', msg || 'Có lỗi xảy ra, vui lòng thử lại.');
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
        </View>

        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>FV</Text>
          </View>
          <Text style={styles.brand}>FreshVeggies</Text>
          <Text style={styles.tagline}>Rau sạch — Sống khoe</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Dang nhap</Text>
          <Text style={styles.subtitle}>Chao mung ban quay lai</Text>

          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="example@email.com"
              placeholderTextColor="#b0bfb0"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <Text style={styles.label}>Mat khau</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Nhap mat khau"
              placeholderTextColor="#b0bfb0"
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)}>
              <Text style={styles.showPass}>{showPass ? 'An' : 'Hien'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgotWrap}>
            <Text style={styles.forgot}>Quen mat khau?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnLoading]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>
              {loading ? 'Dang dang nhap...' : 'Dang nhap'}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.divLine} />
            <Text style={styles.divText}>hoac</Text>
            <View style={styles.divLine} />
          </View>

          <TouchableOpacity style={styles.socialBtn} activeOpacity={0.85}>
            <Text style={styles.socialText}>Tiep tuc voi Google</Text>
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Chua co tai khoan? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.switchLink}>Dang ky ngay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, backgroundColor: '#f4faf4', paddingBottom: 40 },

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

  forgotWrap: { alignSelf: 'flex-end', marginTop: 10 },
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