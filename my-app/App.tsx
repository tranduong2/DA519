import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { useUserStore } from './src/store/userStore';

export default function App() {
  const hasHydrated = useUserStore(state => state.hasHydrated);

  if (!hasHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4faf4' }}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={{ marginTop: 12, color: '#1b5e20', fontWeight: '600' }}>Đang tải phiên đăng nhập...</Text>
      </View>
    );
  }

  try {
    return <AppNavigator />;
  } catch (e) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red' }}>{String(e)}</Text>
      </View>
    );
  }
}