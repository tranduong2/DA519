import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { chatApi, roomPath } from '@/services/adminChatService';

type Props = { token: string; userId: number; target: { id: string; memberIds: number[] } | null; onClose: () => void; onSaved: (id: string) => void };
export default function AdminChatGroupEditor({ token, userId, target, onClose, onSaved }: Props) {
  const [members, setMembers] = useState<{ id: number; name: string }[]>([]);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const lock = useRef(false);
  const attempt = useRef<{ key: string; id: string } | null>(null);
  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    chatApi<{ members: { id: number; name: string }[] }>(token, '/members')
      .then(data => { if (alive) setMembers(data.members); })
      .catch(e => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token, retry]);
  const save = async () => {
    if (lock.current || !selected.length || (!target && !name.trim())) return;
    lock.current = true; setBusy(true); setError('');
    try {
      let id = target?.id;
      if (target) await chatApi(token, `${roomPath(target.id)}/members`, 'POST', { memberIds: selected });
      else {
        const payload = { name: name.trim(), memberIds: selected };
        const key = JSON.stringify(payload);
        if (attempt.current?.key !== key) attempt.current = { key, id: `group_${Date.now()}_${Math.random().toString(36).slice(2)}` };
        const result = await chatApi<{ id: string }>(token, '/groups', 'POST', { ...payload, clientId: attempt.current.id });
        id = result.id;
      }
      onSaved(id!);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể lưu nhóm.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const available = members.filter(m => m.id !== userId && !target?.memberIds.includes(m.id));
  return <Modal visible animationType="slide" onRequestClose={() => !busy && onClose()}>
    <SafeAreaView style={styles.safe}><View style={styles.panel}>
      <View style={styles.header}><Text style={styles.title}>{target ? 'Thêm thành viên' : 'Tạo nhóm Admin'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng tạo nhóm" disabled={busy} onPress={onClose} style={styles.button}><Text style={styles.blue}>Đóng</Text></Pressable></View>
      {!target && <TextInput accessibilityLabel="Tên nhóm" placeholder="Tên nhóm, ví dụ: Đội xử lý đơn hàng" maxLength={80} value={name} onChangeText={setName} editable={!busy} style={styles.input} />}
      <Text style={styles.note}>{target ? 'Thành viên mới có thể xem lịch sử và nhắn tin trong nhóm.' : 'Bạn sẽ là trưởng nhóm. Chọn ít nhất một admin để trò chuyện.'}</Text>
      <TextInput accessibilityLabel="Tìm admin để thêm vào nhóm" placeholder="Tìm tên admin..." value={search} onChangeText={setSearch} style={styles.input} />
      {!!error && <View><Text accessibilityRole="alert" style={styles.error}>{error}</Text>{!members.length && <Pressable onPress={() => setRetry(v => v + 1)} style={styles.button}><Text style={styles.blue}>Tải lại danh sách</Text></Pressable>}</View>}
      <Text style={styles.note}>Đã chọn {selected.length} thành viên</Text>
      {loading ? <ActivityIndicator style={{ margin: 24 }} /> : <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        {available.filter(m => m.name.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))).map(m => <Pressable key={m.id} accessibilityRole="checkbox" accessibilityLabel={m.name} accessibilityState={{ checked: selected.includes(m.id), disabled: busy }} disabled={busy} onPress={() => setSelected(ids => ids.includes(m.id) ? ids.filter(id => id !== m.id) : ids.length < 100 ? [...ids, m.id] : ids)} style={styles.member}>
          <View style={styles.avatar}><Text style={{ color: '#fff', fontSize: 20 }}>{m.name.slice(0, 1).toUpperCase()}</Text></View><Text style={{ flex: 1, color: '#19314f', fontSize: 16 }}>{m.name}</Text><Text style={styles.blue}>{selected.includes(m.id) ? '☑' : '☐'}</Text>
        </Pressable>)}
        {!available.length && <Text style={styles.note}>Không có admin khác để thêm vào nhóm.</Text>}
      </ScrollView>}
      <Pressable accessibilityRole="button" accessibilityLabel={target ? 'Xác nhận thêm thành viên' : 'Xác nhận tạo nhóm'} disabled={busy || loading || !selected.length || (!target && !name.trim())} onPress={() => void save()} style={[styles.save, (busy || loading || !selected.length || (!target && !name.trim())) && { opacity: .45 }]}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{target ? 'Thêm vào nhóm' : 'Tạo nhóm và trò chuyện'}</Text>}</Pressable>
    </View></SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f3f6fb' }, panel: { flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center', padding: 20, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, title: { fontSize: 22, fontWeight: '700', color: '#19314f' },
  button: { padding: 12 }, blue: { color: '#1769e0', fontSize: 18, fontWeight: '600' }, input: { backgroundColor: '#f0f4fa', padding: 14, borderRadius: 10, marginBottom: 12, fontSize: 15, color: '#19314f' },
  note: { color: '#708198', lineHeight: 22, marginBottom: 12 }, error: { color: '#b32626', marginBottom: 8 }, member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#edf1f7' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4385e7', alignItems: 'center', justifyContent: 'center' }, save: { backgroundColor: '#1769e0', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
});
