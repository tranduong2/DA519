import React from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { useUserStore } from './src/store/userStore';

export default function App() {
  const hasHydrated = useUserStore(state => state.hasHydrated);

  React.useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const styleId = 'mobile-input-no-auto-zoom';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @media (max-width: 900px) {
        html { -webkit-text-size-adjust: 100%; }
        input, textarea, select {
          font-size: 16px !important;
          touch-action: manipulation;
        }
      }
    `;
    document.head.appendChild(style);

    return () => style.remove();
  }, []);

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
