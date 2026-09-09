import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '@/navigation/types';
import { useUserStore } from '@/store/userStore';
import { chatApi, ChatMessage, ChatPage, ChatRoom, roomPath } from '@/services/adminChatService';
import AdminChatGroupEditor from '@/components/AdminChatGroupEditor';

const EMOJI = ['😀', '😊', '😂', '🥰', '😍', '😎', '🤔', '😮', '😢', '😭', '🙏', '👍', '👏', '💪', '❤️', '🎉', '🔥', '✅', '🌸', '☕'];
const REACTIONS = ['👍', '❤️', '😂', '😮', '😢'];
const stamp = (value: string) => new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const preview = (m: ChatRoom['last']) => !m ? 'Bắt đầu trò chuyện' : m.recalled ? 'Tin nhắn đã thu hồi' : m.body || '📷 Hình ảnh';
function IconButton({ name, label, onPress, disabled = false }: { name: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[s.iconButton, disabled && { opacity: .4 }]}><Ionicons name={name} size={23} color="#2159a6" /></Pressable>;
}
function Avatar({ name, group = false }: { name: string; group?: boolean }) {
  return <View style={s.avatar}>{group ? <Ionicons name="people" size={25} color="#fff" /> : <Text style={s.avatarText}>{name?.trim().slice(0, 1).toUpperCase() || 'A'}</Text>}</View>;
}
function ChatImage({ token, room, id, onOpen }: { token: string; room: string; id: number; onOpen: (uri: string) => void }) {
  const [uri, setUri] = useState('');
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setError(false); setUri('');
    chatApi<{ image: string }>(token, `${roomPath(room)}/messages/${id}/image`).then(data => { if (alive) setUri(data.image); }).catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [token, room, id, retry]);
  return <Pressable accessibilityLabel={error ? 'Thử tải lại ảnh' : 'Xem ảnh lớn'} onPress={() => uri ? onOpen(uri) : setRetry(v => v + 1)} style={s.chatImage}>{uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" /> : error ? <Text style={s.sub}>Không tải được ảnh. Chạm để thử lại.</Text> : <ActivityIndicator color="#1769e0" />}</Pressable>;
}

export default function AdminChatScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useUserStore(v => v.user);
  const storedToken = useUserStore(v => v.token);
  const token = storedToken || user?.token || '';
  const uid = Number(user?.id);
  const allowed = user?.role === 'admin' && !!token;
  const { width } = useWindowDimensions();
  const mobile = width < 760;
  const [room, setRoom] = useState<string | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reads, setReads] = useState<ChatPage['reads']>([]);
  const [members, setMembers] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [olderLoading, setOlderLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [info, setInfo] = useState(false);
  const [groupEditor, setGroupEditor] = useState<'create' | 'add' | null>(null);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [reply, setReply] = useState<ChatMessage | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [action, setAction] = useState<ChatMessage | null>(null);
  const list = useRef<FlatList<ChatMessage>>(null);
  const activeRoom = useRef(room); activeRoom.current = room;
  const loadedMessages = useRef(messages); loadedMessages.current = messages;
  const initialPageLoaded = useRef(false);
  const refreshSequence = useRef(0);
  const sendLock = useRef(false);
  const pending = useRef<{ key: string; id: string } | null>(null);
  const drafts = useRef<Record<string, { text: string; photo: string | null; reply: ChatMessage | null }>>({});
  const current = rooms.find(r => r.id === room);
  const isGroup = room === 'general' || !!room?.startsWith('group:');
  const onGroupSaved = (id: string) => {
    setGroupEditor(null);
    if (id !== room) selectRoom(id);
    void refreshRooms().catch(showError);
    void chatApi<{ members: { id: number; name: string }[] }>(token, '/members').then(d => setMembers(d.members)).catch(showError);
  };
  const showError = (e: unknown) => setError(e instanceof Error ? e.message : 'Không thể kết nối. Vui lòng thử lại.');
  const selectRoom = (id: string | null) => {
    if (sendLock.current || id === room) return;
    if (room) drafts.current[room] = { text, photo, reply };
    const draft = id ? drafts.current[id] : undefined;
    activeRoom.current = id;
    loadedMessages.current = []; initialPageLoaded.current = false; refreshSequence.current++;
    setRoom(id); setMessages([]); setReads([]); setHasMore(false); setLoadingMessages(!!id);
    setText(draft?.text || ''); setPhoto(draft?.photo || null); setReply(draft?.reply || null);
    setMessageSearch(''); setEmojiOpen(false); setAction(null); setInfo(false); setError('');
  };
  const refreshRooms = useCallback(async () => {
    const data = await chatApi<{ rooms: ChatRoom[] }>(token, '/rooms');
    setRooms(data.rooms); setLoading(false);
  }, [token]);
  const refreshMessages = useCallback(async (id: string) => {
    const sequence = ++refreshSequence.current;
    const data = await chatApi<ChatPage>(token, `${roomPath(id)}/messages`);
    if (activeRoom.current !== id || sequence !== refreshSequence.current) return;
    const olderIds = loadedMessages.current.filter(m => data.messages.length && m.id < data.messages[0].id).map(m => m.id);
    const updates: ChatMessage[] = [];
    // Fill gaps after returning from the background, even if over 40 messages arrived.
    const previousLast = loadedMessages.current.at(-1)?.id;
    let cursorPage = data;
    while (previousLast && cursorPage.hasMore && cursorPage.messages[0]?.id > previousLast) {
      cursorPage = await chatApi<ChatPage>(token, `${roomPath(id)}/messages?before=${cursorPage.messages[0].id}`);
      if (activeRoom.current !== id || sequence !== refreshSequence.current) return;
      updates.push(...cursorPage.messages);
    }
    for (let offset = 0; offset < olderIds.length; offset += 200) {
      const page = await chatApi<ChatPage>(token, `${roomPath(id)}/messages?ids=${olderIds.slice(offset, offset + 200).join(',')}`);
      updates.push(...page.messages);
    }
    if (activeRoom.current !== id || sequence !== refreshSequence.current) return;
    const synced = new Map([...updates, ...data.messages].map(m => [m.id, m]));
    setMessages(old => [...new Map([...old.map(m => synced.get(m.id) || m), ...updates, ...data.messages].map(m => [m.id, m])).values()].sort((a, b) => a.id - b.id));
    setReads(data.reads); setLoadingMessages(false);
    if (!initialPageLoaded.current) { setHasMore(data.hasMore); initialPageLoaded.current = true; }
    const last = data.messages.at(-1)?.id;
    if (last) await chatApi(token, `${roomPath(id)}/read`, 'POST', { lastId: last });
  }, [token]);
  useFocusEffect(useCallback(() => {
    if (!allowed) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const visible = AppState.currentState === 'active' && (Platform.OS !== 'web' || typeof document === 'undefined' || document.visibilityState !== 'hidden');
        if (visible) {
          await refreshRooms();
          if (alive && room) await refreshMessages(room);
        }
      } catch (e) { if (alive) { showError(e); setLoading(false); setLoadingMessages(false); } }
      finally { if (alive) timer = setTimeout(tick, 3000); }
    };
    void tick();
    chatApi<{ members: { id: number; name: string }[] }>(token, '/members').then(d => { if (alive) setMembers(d.members); }).catch(() => {});
    return () => { alive = false; clearTimeout(timer); };
  }, [allowed, token, room, refreshRooms, refreshMessages]));
  const loadOlder = async () => {
    if (!room || olderLoading || !messages.length) return;
    const id = room; setOlderLoading(true);
    try {
      const data = await chatApi<ChatPage>(token, `${roomPath(id)}/messages?before=${messages[0].id}`);
      if (activeRoom.current === id) { setMessages(old => [...data.messages.filter(m => !old.some(o => o.id === m.id)), ...old]); setHasMore(data.hasMore); }
    } catch (e) { showError(e); } finally { setOlderLoading(false); }
  };
  const pickImage = async () => {
    const target = room;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: .7 });
      if (result.canceled || activeRoom.current !== target) return;
      const asset = result.assets[0];
      if (!asset.base64) throw new Error('Không đọc được ảnh. Vui lòng chọn ảnh khác.');
      if (asset.base64.length > 2796204) throw new Error('Vui lòng chọn ảnh nhỏ hơn 2 MB.');
      const type = asset.base64.startsWith('/9j/') ? 'jpeg' : asset.base64.startsWith('iVBOR') ? 'png' : asset.base64.startsWith('R0lG') ? 'gif' : asset.base64.startsWith('UklGR') ? 'webp' : '';
      if (!type) throw new Error('Vui lòng chọn ảnh JPEG, PNG, GIF hoặc WebP.');
      setPhoto(`data:image/${type};base64,${asset.base64}`);
    } catch (e) { showError(e); }
  };
  const send = async () => {
    if (!room || sendLock.current || (!text.trim() && !photo)) return;
    const id = room;
    const payload = { body: text.trim(), image: photo, replyId: reply?.id || null };
    const key = JSON.stringify([id, payload]);
    if (pending.current?.key !== key) pending.current = { key, id: `${Date.now()}_${Math.random().toString(36).slice(2)}` };
    sendLock.current = true; setSending(true); setError('');
    try {
      await chatApi(token, `${roomPath(id)}/messages`, 'POST', { ...payload, clientId: pending.current.id });
      pending.current = null; delete drafts.current[id];
      setText(''); setPhoto(null); setReply(null); setEmojiOpen(false);
      await refreshMessages(id); await refreshRooms();
      list.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (e) { showError(e); } finally { sendLock.current = false; setSending(false); }
  };
  const mutate = async (message: ChatMessage, kind: 'recall' | 'reaction', emoji?: string) => {
    if (!room) return;
    const id = room; setAction(null);
    try {
      await chatApi(token, `${roomPath(id)}/messages/${message.id}${kind === 'reaction' ? '/reaction' : ''}`, kind === 'reaction' ? 'PUT' : 'DELETE', kind === 'reaction' ? { emoji: message.reactions.some(r => r.userId === uid && r.emoji === emoji) ? '' : emoji } : undefined);
      if (activeRoom.current !== id) return;
      setMessages(old => old.map(m => m.id !== message.id ? m : kind === 'recall' ? { ...m, recalled: true, body: '', has_image: false } : { ...m, reactions: [...m.reactions.filter(r => r.userId !== uid), ...(m.reactions.some(r => r.userId === uid && r.emoji === emoji) ? [] : [{ userId: uid, emoji: emoji! }])] }));
      await refreshMessages(id); await refreshRooms();
    } catch (e) { showError(e); }
  };
  if (!allowed) return <SafeAreaView style={s.center}><Text style={s.title}>Chat dành cho quản trị viên</Text><Text style={s.sub}>Đăng nhập bằng tài khoản admin để tiếp tục.</Text><Pressable onPress={() => navigation.navigate('Login')} style={s.primary}><Text style={s.white}>Đăng nhập</Text></Pressable></SafeAreaView>;
  const renderMessage = ({ item: m }: { item: ChatMessage }) => {
    const mine = Number(m.sender_id) === uid;
    const seen = reads.some(r => Number(r.reader_id) !== uid && r.last_id >= m.id);
    return <View style={[s.messageRow, mine && { alignItems: 'flex-end' }]}>
      <Pressable onLongPress={() => !m.recalled && setAction(m)} style={[s.bubble, mine && s.mine]}>
        {!mine && <Text style={s.sender}>{m.sender_name}</Text>}
        {m.reply_id && !m.recalled && <View style={s.quote}><Text style={s.sub} numberOfLines={2}>↩ {m.reply_body || (m.reply_image ? '📷 Hình ảnh' : 'Tin nhắn')}</Text></View>}
        {m.recalled ? <Text style={[s.sub, { fontStyle: 'italic' }]}>Tin nhắn đã thu hồi</Text> : <>{m.has_image && <ChatImage token={token} room={room!} id={m.id} onOpen={setLightbox} />}{!!m.body && <Text selectable style={s.messageText}>{m.body}</Text>}</>}
        <View style={s.messageFooter}><Text style={s.time}>{stamp(m.created_at)} · {new Date(m.created_at).toLocaleDateString('vi-VN')}{mine ? seen ? ' · Đã xem' : ' · Đã gửi' : ''}</Text>{!m.recalled && <Pressable accessibilityLabel="Tùy chọn tin nhắn" onPress={() => setAction(m)} style={s.more}><Ionicons name="ellipsis-horizontal" size={19} color="#667992" /></Pressable>}</View>
        {!m.recalled && m.reactions.length > 0 && <View style={s.reactions}>{REACTIONS.filter(e => m.reactions.some(r => r.emoji === e)).map(e => <Pressable key={e} onPress={() => void mutate(m, 'reaction', e)} style={s.reaction}><Text>{e} {m.reactions.filter(r => r.emoji === e).length}</Text></Pressable>)}</View>}
      </Pressable>
    </View>;
  };
  const details = <ScrollView style={s.details} contentContainerStyle={{ padding: 20 }}><Text style={s.title}>Thông tin hội thoại</Text><View style={{ alignItems: 'center', gap: 12, paddingVertical: 28 }}><Avatar name={current?.name || 'Admin'} group={isGroup} /><Text style={s.title}>{current?.name}</Text><Text style={s.sub}>{isGroup ? `${current?.memberIds?.length || 0} quản trị viên` : 'Hội thoại riêng giữa hai admin'}</Text></View><Text style={s.sectionTitle}>Thành viên</Text>{current?.ownerId === uid && <Pressable accessibilityRole="button" accessibilityLabel="Thêm thành viên vào nhóm" onPress={() => { setInfo(false); setGroupEditor('add'); }} style={s.primary}><Text style={s.white}>+ Thêm thành viên</Text></Pressable>}{members.filter(m => current?.memberIds?.includes(m.id)).map(m => <View key={m.id} style={s.member}><Avatar name={m.name} /><Text style={s.messageText}>{m.name}{m.id === uid ? ' (Bạn)' : ''}</Text></View>)}<Text style={s.sectionTitle}>Ảnh trong tin nhắn đã tải</Text><View style={s.gallery}>{messages.filter(m => m.has_image && !m.recalled).map(m => <View key={m.id} style={{ width: '100%' }}><ChatImage token={token} room={room!} id={m.id} onOpen={setLightbox} /></View>)}</View>{!messages.some(m => m.has_image && !m.recalled) && <Text style={s.sub}>Chưa có hình ảnh.</Text>}</ScrollView>;
  return <SafeAreaView style={s.safe}>
    <View style={s.appBar}><IconButton name="arrow-back" label="Về trang admin" onPress={() => navigation.navigate('Admin')} /><Text style={s.title}>Chat nội bộ</Text><View style={s.adminPill}><Text style={s.sender}>ADMIN</Text></View><View style={{ flex: 1 }} /><Text style={s.sub}>{mobile ? '' : user?.username || user?.name}</Text></View>
    {!!error && <View style={s.error}><Text style={{ color: '#a92828', flex: 1 }}>{error}</Text><IconButton name="close" label="Đóng thông báo" onPress={() => setError('')} /></View>}
    <View style={s.layout}>
      {(!mobile || !room) && <View style={[s.sidebar, mobile && { width: '100%' }]}><View style={[s.row, { justifyContent: 'space-between' }]}><Text style={[s.title, { padding: 20 }]}>Tin nhắn <Text style={s.sub}>({rooms.reduce((n, r) => n + r.unread, 0)})</Text></Text><IconButton name="people-outline" label="Tạo nhóm Admin" onPress={() => setGroupEditor('create')} /></View><View style={s.searchBox}><Ionicons name="search" size={19} color="#738198" /><TextInput accessibilityLabel="Tìm quản trị viên" placeholder="Tìm quản trị viên..." value={search} onChangeText={setSearch} style={s.searchInput} /></View><View style={s.tabs}>{['Tất cả', 'Chưa đọc'].map((label, i) => <Pressable key={label} onPress={() => setOnlyUnread(!!i)} style={[s.tab, onlyUnread === !!i && s.activeTab]}><Text style={{ color: onlyUnread === !!i ? '#1769e0' : '#738198', fontWeight: '600' }}>{label}</Text></Pressable>)}</View>{loading ? <ActivityIndicator style={{ margin: 25 }} /> : <FlatList data={[...rooms].filter(r => r.name.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')) && (!onlyUnread || r.unread > 0)).sort((a, b) => (b.last?.id || 0) - (a.last?.id || 0))} keyExtractor={r => r.id} ListEmptyComponent={<Text style={s.empty}>Không có hội thoại phù hợp.</Text>} renderItem={({ item: r }) => <Pressable onPress={() => selectRoom(r.id)} style={[s.room, r.id === room && s.selected]}><Avatar name={r.name} group={r.id === 'general' || r.id.startsWith('group:')} /><View style={{ flex: 1, gap: 6 }}><View style={s.row}><Text numberOfLines={1} style={[s.roomName, { flex: 1 }]}>{r.name}</Text>{r.last && <Text style={s.time}>{stamp(r.last.created_at)}</Text>}</View><View style={s.row}><Text numberOfLines={1} style={[s.sub, { flex: 1 }]}>{r.last?.sender_id === uid ? 'Bạn: ' : ''}{preview(r.last)}</Text>{r.unread > 0 && <View style={s.badge}><Text style={s.white}>{r.unread > 99 ? '99+' : r.unread}</Text></View>}</View></View></Pressable>} />}<Text style={s.sidebarNote}>Trao đổi công việc cùng đội ngũ quản trị</Text></View>}
      {(!mobile || room) && <KeyboardAvoidingView style={s.conversation} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {!room ? <View style={s.center}><Ionicons name="chatbubbles-outline" size={72} color="#76a5e6" /><Text style={[s.title, { marginTop: 20 }]}>Kết nối đội ngũ Admin</Text><Text style={[s.sub, { marginTop: 10, textAlign: 'center' }]}>Chọn một thành viên hoặc Nhóm Admin để bắt đầu trò chuyện.</Text></View> : <>
          <View style={s.conversationHeader}>{mobile && <IconButton name="arrow-back" label="Danh sách hội thoại" onPress={() => selectRoom(null)} />}<Avatar name={current?.name || 'Admin'} group={isGroup} /><View style={{ flex: 1 }}><Text numberOfLines={1} style={s.title}>{current?.name || 'Hội thoại'}</Text><Text style={s.sub}>Tự cập nhật mỗi 3 giây</Text></View><IconButton name="information-circle-outline" label="Thông tin hội thoại" onPress={() => setInfo(v => !v)} /></View>
          <View style={s.messageSearch}><Ionicons name="search" size={17} color="#738198" /><TextInput value={messageSearch} onChangeText={setMessageSearch} placeholder="Tìm trong tin nhắn đã tải" accessibilityLabel="Tìm trong tin nhắn đã tải" style={s.searchInput} /></View>
          {loadingMessages ? <View style={s.center}><ActivityIndicator /></View> : <FlatList ref={list} style={{ flex: 1 }} contentContainerStyle={{ padding: mobile ? 12 : 24 }} inverted data={[...messages].reverse().filter(m => !messageSearch || (!m.recalled && m.body.toLocaleLowerCase('vi').includes(messageSearch.toLocaleLowerCase('vi'))))} keyExtractor={m => String(m.id)} renderItem={renderMessage} keyboardShouldPersistTaps="handled" ListEmptyComponent={<Text style={s.empty}>{messageSearch ? 'Không tìm thấy tin nhắn.' : 'Chưa có tin nhắn. Hãy gửi lời chào! 👋'}</Text>} ListFooterComponent={hasMore ? <Pressable disabled={olderLoading} onPress={() => void loadOlder()} style={s.loadMore}><Text style={s.sender}>{olderLoading ? 'Đang tải...' : 'Tải tin nhắn cũ hơn'}</Text></Pressable> : null} />}
          <View style={s.composer}>
            {reply && <View style={s.replyDraft}><View style={{ flex: 1 }}><Text style={s.sender}>Trả lời {reply.sender_name}</Text><Text numberOfLines={1} style={s.sub}>{reply.body || '📷 Hình ảnh'}</Text></View><IconButton name="close" label="Hủy trả lời" onPress={() => setReply(null)} disabled={sending} /></View>}
            {photo && <View style={s.replyDraft}><Pressable onPress={() => setLightbox(photo)}><Image source={{ uri: photo }} style={{ width: 76, height: 65, borderRadius: 8 }} /></Pressable><Text style={s.sub}>Ảnh đính kèm</Text><IconButton name="close" label="Bỏ ảnh" onPress={() => setPhoto(null)} disabled={sending} /></View>}
            {emojiOpen && <View style={s.emojiGrid}>{EMOJI.map(e => <Pressable key={e} disabled={sending} accessibilityLabel={`Chèn ${e}`} onPress={() => setText(t => (t + e).slice(0, 5000))} style={s.iconButton}><Text style={{ fontSize: 25 }}>{e}</Text></Pressable>)}</View>}
            <View style={s.row}><IconButton name="image-outline" label="Đính kèm hình ảnh" onPress={() => void pickImage()} disabled={sending} /><IconButton name="happy-outline" label="Chọn emoji" onPress={() => setEmojiOpen(v => !v)} disabled={sending} /><Text style={s.time}>Ảnh tối đa 2 MB</Text></View>
            <View style={s.row}><TextInput style={s.composeInput} value={text} onChangeText={setText} editable={!sending} multiline maxLength={5000} placeholder={`Nhắn tin tới ${current?.name || 'admin'}...`} accessibilityLabel="Nội dung tin nhắn" onKeyPress={e => { const event = e.nativeEvent as typeof e.nativeEvent & { shiftKey?: boolean; isComposing?: boolean }; if (Platform.OS === 'web' && event.key === 'Enter' && !event.shiftKey && !event.isComposing) { e.preventDefault(); void send(); } }} /><Pressable accessibilityRole="button" accessibilityLabel="Gửi tin nhắn" disabled={sending || (!text.trim() && !photo)} onPress={() => void send()} style={[s.sendButton, (sending || (!text.trim() && !photo)) && { opacity: .45 }]}>{sending ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={22} color="#fff" />}</Pressable></View>
          </View>
        </>}
      </KeyboardAvoidingView>}
      {room && info && width >= 1150 && details}
    </View>
    {groupEditor && <AdminChatGroupEditor token={token} userId={uid} target={groupEditor === 'add' && current ? { id: current.id, memberIds: current.memberIds } : null} onClose={() => setGroupEditor(null)} onSaved={onGroupSaved} />}<Modal visible={info && !!room && width < 1150} animationType="slide" onRequestClose={() => setInfo(false)}><SafeAreaView style={s.safe}><View style={s.appBar}><IconButton name="close" label="Đóng thông tin" onPress={() => setInfo(false)} /><Text style={s.title}>Thông tin hội thoại</Text></View>{details}</SafeAreaView></Modal>
    <Modal visible={!!action} transparent animationType="fade" onRequestClose={() => setAction(null)}><Pressable style={s.overlay} onPress={() => setAction(null)}><Pressable style={s.actionSheet} onPress={e => e.stopPropagation()}><Text style={s.title}>Tùy chọn tin nhắn</Text><View style={s.row}>{REACTIONS.map(e => <Pressable key={e} style={s.iconButton} onPress={() => action && void mutate(action, 'reaction', e)}><Text style={{ fontSize: 27 }}>{e}</Text></Pressable>)}</View><Pressable style={s.actionItem} onPress={() => { setReply(action); setAction(null); }}><Text style={s.sender}>↩ Trả lời tin nhắn</Text></Pressable>{action?.sender_id === uid && <Pressable style={s.actionItem} onPress={() => action && void mutate(action, 'recall')}><Text style={{ color: '#c33434' }}>Thu hồi tin nhắn của tôi</Text></Pressable>}<Pressable style={s.actionItem} onPress={() => setAction(null)}><Text style={s.sub}>Đóng</Text></Pressable></Pressable></Pressable></Modal>
    <Modal visible={!!lightbox} transparent onRequestClose={() => setLightbox(null)}><View style={s.lightbox}><SafeAreaView style={{ flex: 1 }}><View style={s.appBar}><IconButton name="close" label="Đóng ảnh" onPress={() => setLightbox(null)} /><Text style={s.title}>Xem hình ảnh</Text></View>{lightbox && <Image source={{ uri: lightbox }} style={{ flex: 1 }} resizeMode="contain" />}</SafeAreaView></View></Modal>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' }, layout: { flex: 1, flexDirection: 'row', minHeight: 0 },
  appBar: { minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e4e9f0' },
  title: { fontSize: 19, color: '#19314f', fontWeight: '700' }, sub: { fontSize: 13, color: '#728098', lineHeight: 20 },
  adminPill: { borderRadius: 6, backgroundColor: '#edf4ff', padding: 6 }, sidebar: { width: 310, borderRightWidth: 1, borderColor: '#e0e6ef', backgroundColor: '#fff' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f1f4f8', marginHorizontal: 16, borderRadius: 8, paddingHorizontal: 12 }, searchInput: { flex: 1, paddingVertical: 12, color: '#19314f', minWidth: 0 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#edf0f5', gap: 22 }, tab: { paddingVertical: 17 }, activeTab: { borderBottomWidth: 3, borderColor: '#1769e0' },
  room: { flexDirection: 'row', gap: 12, padding: 16, alignItems: 'center' }, selected: { backgroundColor: '#e5f0ff' }, roomName: { fontSize: 15, fontWeight: '600', color: '#203957' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#4385e7', justifyContent: 'center', alignItems: 'center' }, avatarText: { color: '#fff', fontSize: 21, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, badge: { backgroundColor: '#ec4b59', borderRadius: 12, minWidth: 23, padding: 3, alignItems: 'center' }, white: { color: '#fff', fontWeight: '600' },
  sidebarNote: { fontSize: 12, color: '#8795a7', padding: 16, textAlign: 'center' }, conversation: { flex: 1, minWidth: 0, backgroundColor: '#eef2f7' },
  conversationHeader: { minHeight: 80, padding: 12, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderColor: '#e0e6ef' },
  messageSearch: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 8, backgroundColor: '#f8faff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 8 }, empty: { textAlign: 'center', color: '#728098', padding: 25 },
  messageRow: { alignItems: 'flex-start', marginVertical: 5 }, bubble: { maxWidth: '90%', backgroundColor: '#fff', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6, borderRadius: 13, borderWidth: 1, borderColor: '#dfe6f0', minWidth: 120 }, mine: { backgroundColor: '#dfeeff', borderColor: '#cbdff8' },
  sender: { color: '#2364bb', fontSize: 13, fontWeight: '600' }, messageText: { fontSize: 15, color: '#233b59', lineHeight: 23 }, messageFooter: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }, time: { fontSize: 11, color: '#7c8ba0' }, more: { minWidth: 36, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  quote: { backgroundColor: '#edf2fa', borderLeftWidth: 3, borderColor: '#6496d8', padding: 8, marginVertical: 7 }, reactions: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', paddingBottom: 5 }, reaction: { borderRadius: 12, backgroundColor: '#fff', padding: 5 },
  chatImage: { width: 230, maxWidth: '100%', height: 170, borderRadius: 8, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: '#edf2f7', marginVertical: 6 },
  composer: { backgroundColor: '#fff', padding: 10, borderTopWidth: 1, borderColor: '#dce3ee' }, composeInput: { flex: 1, minWidth: 0, minHeight: 44, maxHeight: 120, padding: 10, fontSize: 15, color: '#213954', textAlignVertical: 'top' },
  iconButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }, sendButton: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#1769e0', alignItems: 'center', justifyContent: 'center' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, backgroundColor: '#f4f7fc', borderRadius: 10 }, replyDraft: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#f1f6fe', padding: 8, borderRadius: 8, marginBottom: 5 },
  details: { flex: 1, maxWidth: 310, backgroundColor: '#fff', borderLeftWidth: 1, borderColor: '#e0e6ef' }, sectionTitle: { fontSize: 15, fontWeight: '700', color: '#233b59', marginVertical: 16 }, member: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 8 }, gallery: { gap: 8 },
  overlay: { flex: 1, backgroundColor: '#13253b88', justifyContent: 'center', alignItems: 'center', padding: 20 }, actionSheet: { backgroundColor: '#fff', padding: 22, borderRadius: 18, width: 340, maxWidth: '100%', gap: 14 }, actionItem: { paddingVertical: 12 },
  lightbox: { flex: 1, backgroundColor: '#101a2c' }, error: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, backgroundColor: '#fff0f0' }, primary: { backgroundColor: '#1769e0', padding: 14, borderRadius: 10, marginTop: 15 }, loadMore: { alignSelf: 'center', padding: 15, marginVertical: 10 },
});
