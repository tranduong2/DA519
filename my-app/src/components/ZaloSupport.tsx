import React, { useEffect } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

const OA_ID = (process.env.EXPO_PUBLIC_ZALO_OA_ID || '').trim();

declare global {
  interface Window {
    ZaloSocialSDK?: { reload: () => void };
  }
}

export default function ZaloSupport() {
  useEffect(() => {
    if (Platform.OS !== 'web' || !OA_ID || typeof document === 'undefined') return;

    const widgetId = 'fresh-veggies-zalo-widget';
    let widget = document.getElementById(widgetId);
    if (!widget) {
      widget = document.createElement('div');
      widget.id = widgetId;
      widget.className = 'zalo-chat-widget';
      widget.setAttribute('data-oaid', OA_ID);
      widget.setAttribute('data-welcome-message', 'FreshVeggies xin chào! Bạn cần chúng tôi hỗ trợ gì?');
      widget.setAttribute('data-autopopup', '0');
      widget.setAttribute('data-width', '350');
      widget.setAttribute('data-height', '420');
      document.body.appendChild(widget);
    }

    const sdkId = 'zalo-social-sdk';
    let sdk = document.getElementById(sdkId) as HTMLScriptElement | null;
    if (!sdk) {
      sdk = document.createElement('script');
      sdk.id = sdkId;
      sdk.src = 'https://sp.zalo.me/plugins/sdk.js';
      sdk.async = true;
      document.body.appendChild(sdk);
    } else {
      window.ZaloSocialSDK?.reload();
    }

    return () => {
      document.getElementById(widgetId)?.remove();
    };
  }, []);

  if (!OA_ID || Platform.OS === 'web') return null;

  const openZalo = async () => {
    const webUrl = `https://zalo.me/${encodeURIComponent(OA_ID)}`;
    try {
      await Linking.openURL(`zalo://oa?id=${encodeURIComponent(OA_ID)}`);
    } catch {
      await Linking.openURL(webUrl);
    }
  };

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chat với FreshVeggies trên Zalo"
        onPress={() => void openZalo()}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <View style={styles.chatTail} />
        <Text style={styles.logo}>Zalo</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingRight: 18,
    paddingBottom: 90,
  },
  button: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#4267f5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10265f',
    shadowOpacity: 0.28,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
    elevation: 7,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
  logo: { color: '#fff', fontWeight: '700', fontSize: 15 },
  chatTail: {
    position: 'absolute',
    bottom: 12,
    width: 21,
    height: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#fff',
    borderRadius: 10,
  },
});
