import React, { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AiMessage, askAi } from '@/services/aiChatService';

const WELCOME: AiMessage = { role: 'assistant', content: 'Xin chào! Mình là trợ lý AI của FreshVeggies. Bạn muốn hỏi gì?' };

export default function AiChatWidget() {
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AiMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const list = useRef<FlatList<AiMessage>>(null);
  const lock = useRef(false);

  const send = async () => {
    const question = input.trim();
    if (!question || lock.current) return;
    const history = messages.filter(message => message !== WELCOME).slice(-20);
    const next = [...messages, { role: 'user' as const, content: question }];
    lock.current = true;
    setMessages(next);
    setInput('');
    setError('');
    setLoading(true);
    try {
      const reply = await askAi(question, history);
      setMessages(current => [...current, { role: 'assistant', content: reply }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Có lỗi khi kết nối chatbot.');
    } finally {
      lock.current = false;
      setLoading(false);
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  return (
    <>
      <View pointerEvents="box-none" style={styles.layer}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mở trợ lý AI" onPress={() => setOpen(true)} style={({ pressed }) => [styles.launcher, pressed && styles.pressed]}>
          <Ionicons name="sparkles" size={25} color="#fff" />
          <Text style={styles.aiLabel}>AI</Text>
        </Pressable>
      </View>
      <Modal visible={open} transparent={width >= 600} animationType="slide" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.overlay, width < 600 && styles.mobileOverlay]}>
          <SafeAreaView style={[styles.panel, width < 600 && styles.mobilePanel]}>
            <View style={styles.header}>
              <View style={styles.botAvatar}><Ionicons name="sparkles" size={20} color="#fff" /></View>
              <View style={{ flex: 1 }}><Text style={styles.title}>Trợ lý AI</Text><Text style={styles.subtitle}>Hỏi đáp tổng quát</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Tạo cuộc trò chuyện mới" onPress={() => { setMessages([WELCOME]); setError(''); }} style={styles.iconButton}><Ionicons name="refresh" size={23} color="#39754a" /></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Đóng chatbot" onPress={() => setOpen(false)} style={styles.iconButton}><Ionicons name="close" size={25} color="#334b3b" /></Pressable>
            </View>
            <FlatList
              ref={list}
              data={messages}
              keyExtractor={(_, index) => String(index)}
              style={styles.list}
              contentContainerStyle={styles.messages}
              onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
              renderItem={({ item }) => <View style={[styles.message, item.role === 'user' ? styles.userMessage : styles.aiMessage]}><Text selectable style={styles.messageText}>{item.content}</Text></View>}
              ListFooterComponent={loading ? <View style={[styles.message, styles.aiMessage, styles.loading]}><ActivityIndicator color="#2e7d32" /><Text style={styles.subtitle}>Đang trả lời...</Text></View> : null}
            />
            {!!error && <View style={styles.errorRow}><Text accessibilityRole="alert" style={styles.errorText}>{error}</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng lỗi" onPress={() => setError('')}><Ionicons name="close" size={20} color="#a92929" /></Pressable></View>}
            <View style={styles.composer}>
              <TextInput
                accessibilityLabel="Câu hỏi cho trợ lý AI"
                placeholder="Nhập câu hỏi..."
                placeholderTextColor="#849589"
                value={input}
                onChangeText={setInput}
                editable={!loading}
                maxLength={2000}
                multiline
                style={styles.input}
                onKeyPress={event => {
                  const native = event.nativeEvent as typeof event.nativeEvent & { shiftKey?: boolean; isComposing?: boolean };
                  if (Platform.OS === 'web' && native.key === 'Enter' && !native.shiftKey && !native.isComposing) {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
              <Pressable accessibilityRole="button" accessibilityLabel="Gửi câu hỏi" disabled={loading || !input.trim()} onPress={() => void send()} style={[styles.send, (loading || !input.trim()) && styles.disabled]}>
                <Ionicons name="send" size={21} color="#fff" />
              </Pressable>
            </View>
            <Text style={styles.disclaimer}>AI có thể trả lời chưa chính xác. Không nhập mật khẩu hoặc thông tin nhạy cảm.</Text>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, alignItems: 'flex-end', justifyContent: 'flex-end', paddingRight: 18, paddingBottom: 158 },
  launcher: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#2e7d32', alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#143b1d', shadowOpacity: .3, shadowRadius: 7, shadowOffset: { width: 0, height: 4 } },
  pressed: { opacity: .82, transform: [{ scale: .96 }] }, aiLabel: { color: '#fff', fontWeight: '800', fontSize: 10, marginTop: -2 },
  overlay: { flex: 1, backgroundColor: '#13251f66', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 18 }, mobileOverlay: { padding: 0, backgroundColor: '#fff' },
  panel: { width: 390, height: 620, maxHeight: '92%', backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', elevation: 15, shadowColor: '#000', shadowOpacity: .25, shadowRadius: 16 }, mobilePanel: { width: '100%', height: '100%', maxHeight: '100%', borderRadius: 0 },
  header: { minHeight: 68, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderColor: '#e1e9e2', backgroundColor: '#f4faf4' },
  botAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2e7d32', alignItems: 'center', justifyContent: 'center' }, title: { color: '#173d21', fontSize: 18, fontWeight: '800' }, subtitle: { color: '#6b7f70', fontSize: 12 },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, list: { flex: 1, backgroundColor: '#f5f7f5' }, messages: { padding: 14, gap: 10 },
  message: { maxWidth: '88%', paddingHorizontal: 13, paddingVertical: 10, borderRadius: 14 }, aiMessage: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#dde7df' }, userMessage: { alignSelf: 'flex-end', backgroundColor: '#dff2e2' }, messageText: { color: '#263b2b', fontSize: 15, lineHeight: 21 }, loading: { flexDirection: 'row', gap: 9, alignItems: 'center' },
  errorRow: { backgroundColor: '#fff0f0', padding: 9, flexDirection: 'row', alignItems: 'center', gap: 8 }, errorText: { color: '#a92929', flex: 1, fontSize: 13 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, borderTopWidth: 1, borderColor: '#dfe8e0' }, input: { flex: 1, minHeight: 44, maxHeight: 110, backgroundColor: '#f1f5f2', borderRadius: 12, padding: 11, fontSize: 16, color: '#243a2a', textAlignVertical: 'top' }, send: { width: 45, height: 45, borderRadius: 13, backgroundColor: '#2e7d32', alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: .45 }, disclaimer: { color: '#7b897e', textAlign: 'center', fontSize: 10, paddingHorizontal: 8, paddingBottom: 8 },
});
