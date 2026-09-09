const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { PGlite } = require('@electric-sql/pglite');
const { PostgresCompatPool } = require('../dist/postgresCompat');
const { installAdminChat } = require('../dist/adminChat');
let pg, server, base, messageId;
const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
async function request(path, token = 'admin-one', method = 'GET', body) {
  const res = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: res.status, data: await res.json() };
}
before(async () => {
  pg = new PGlite();
  await pg.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY, username TEXT, name TEXT, email TEXT, role TEXT, banned SMALLINT DEFAULT 0, session_token TEXT);
    INSERT INTO users VALUES (1,'Admin Một',NULL,'one@example.test','admin',0,'admin-one'),(2,'Admin Hai',NULL,'two@example.test','admin',0,'admin-two'),(3,'Admin Ba',NULL,'three@example.test','admin',0,'admin-three'),(4,'Khách',NULL,'customer@example.test','user',0,'customer'),(5,'Bị khóa',NULL,'banned@example.test','admin',1,'banned');`);
  // Exercise the real SQL translation layer against an isolated PostgreSQL engine.
  const db = new PostgresCompatPool('postgres://unused');
  db.pool = { query: async (sql, params) => { const r = await pg.query(sql, params); return { ...r, rowCount: r.affectedRows ?? r.rows.length }; } };
  const app = express();
  await installAdminChat(app, db);
  await installAdminChat(express(), db); // schema initialization is restart-safe
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/admin/chat`;
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); if (pg) await pg.close(); });
test('authentication, active admin membership, and direct room isolation', async () => {
  assert.equal((await request('/rooms', null)).status, 401);
  assert.equal((await request('/rooms', 'wrong')).status, 401);
  assert.equal((await request('/rooms', 'customer')).status, 403);
  assert.equal((await request('/rooms', 'banned')).status, 403);
  const members = await request('/members');
  assert.equal(members.data.members.length, 3);
  assert.equal((await request('/rooms/dm:1:2/messages', 'admin-three')).status, 403);
  assert.equal((await request('/rooms/dm:2:1/messages')).status, 403);
  assert.equal((await request('/rooms/dm:1:5/messages')).status, 403);
});
test('text, image, retries, replies, reactions and unread/read state', async () => {
  const payload = { body: 'Xin chào\nĐội ngũ 👋', image, clientId: 'test_message_1' };
  const sent = await request('/rooms/dm:1:2/messages', 'admin-one', 'POST', payload);
  assert.equal(sent.status, 201); messageId = sent.data.id;
  assert.equal((await request('/rooms/dm:1:2/messages', 'admin-one', 'POST', payload)).status, 201);
  const inbox = await request('/rooms/dm:1:2/messages', 'admin-two');
  assert.equal(inbox.data.messages.length, 1);
  assert.equal(inbox.data.messages[0].body, payload.body);
  assert.equal(inbox.data.messages[0].has_image, true);
  assert.equal((await request(`/rooms/dm:1:2/messages/${messageId}/image`, 'admin-two')).data.image, image);
  assert.equal((await request(`/rooms/dm:1:2/messages/${messageId}/image`, 'admin-three')).status, 403);
  assert.equal((await request('/rooms', 'admin-two')).data.rooms.find(r => r.id === 'dm:1:2').unread, 1);
  assert.equal((await request('/rooms/dm:1:2/read', 'admin-two', 'POST', { lastId: messageId })).status, 200);
  assert.equal((await request('/rooms', 'admin-two')).data.rooms.find(r => r.id === 'dm:1:2').unread, 0);
  assert.equal((await request('/rooms/dm:1:2/messages', 'admin-two', 'POST', { body: 'Đã nhận', replyId: messageId, clientId: 'test_reply_1' })).status, 201);
  assert.equal((await request(`/rooms/dm:1:2/messages/${messageId}/reaction`, 'admin-two', 'PUT', { emoji: '❤️' })).status, 200);
  const updated = await request('/rooms/dm:1:2/messages');
  assert.deepEqual(updated.data.messages[0].reactions, [{ userId: 2, emoji: '❤️' }]);
  assert.equal(updated.data.messages[1].reply_body, payload.body);
});
test('validation rejects empty/oversize/invalid images and cross-room replies', async () => {
  assert.equal((await request('/rooms/general/messages', 'admin-one', 'POST', { body: '', clientId: 'invalid_empty' })).status, 400);
  assert.equal((await request('/rooms/general/messages', 'admin-one', 'POST', { body: 'x'.repeat(5001), clientId: 'invalid_long' })).status, 400);
  assert.equal((await request('/rooms/general/messages', 'admin-one', 'POST', { image: 'data:image/png;base64,aGVsbG8=', clientId: 'invalid_image' })).status, 400);
  assert.equal((await request('/rooms/general/messages', 'admin-one', 'POST', { image: 'data:image/svg+xml;base64,aGVsbG8=', clientId: 'invalid_svg' })).status, 400);
  assert.equal((await request('/rooms/general/messages', 'admin-one', 'POST', { body: 'cross room', replyId: messageId, clientId: 'invalid_reply' })).status, 400);
  assert.equal((await request('/rooms/general/read', 'admin-one', 'POST', { lastId: messageId })).status, 400);
});
test('only sender can recall; recalled image becomes inaccessible and reply is redacted', async () => {
  assert.equal((await request(`/rooms/dm:1:2/messages/${messageId}`, 'admin-two', 'DELETE')).status, 403);
  assert.equal((await request(`/rooms/dm:1:2/messages/${messageId}`, 'admin-one', 'DELETE')).status, 200);
  assert.equal((await request(`/rooms/dm:1:2/messages/${messageId}/image`, 'admin-two')).status, 404);
  const history = await request('/rooms/dm:1:2/messages', 'admin-two');
  assert.equal(history.data.messages[0].body, '');
  assert.equal(history.data.messages[0].recalled, true);
  assert.equal(history.data.messages[1].reply_body, 'Tin nhắn đã thu hồi');
});
test('pagination returns chronological pages with no overlap', async () => {
  for (let i = 0; i < 43; i++) assert.equal((await request('/rooms/general/messages', 'admin-one', 'POST', { body: `Tin ${i}`, clientId: `page_test_${i}` })).status, 201);
  const latest = (await request('/rooms/general/messages')).data;
  assert.equal(latest.messages.length, 40); assert.equal(latest.hasMore, true);
  const older = (await request(`/rooms/general/messages?before=${latest.messages[0].id}`)).data;
  assert.equal(older.messages.length, 3); assert.equal(older.hasMore, false);
  assert.ok(older.messages.at(-1).id < latest.messages[0].id);
  const oldId = older.messages[0].id;
  assert.equal((await request(`/rooms/general/messages/${oldId}`, 'admin-one', 'DELETE')).status, 200);
  const sync = (await request(`/rooms/general/messages?ids=${oldId},${messageId}`)).data;
  assert.equal(sync.messages.length, 1); // IDs from another room cannot leak through sync.
  assert.equal(sync.messages[0].recalled, true);
  assert.equal((await request('/rooms/general/messages?ids=invalid')).status, 400);
  assert.equal((await request('/rooms/general/messages?before=-1')).status, 400);
});
test('create private admin group, deduplicate retries, exchange text and images', async () => {
  const payload = { name: 'Đội xử lý đơn hàng', memberIds: [2, 2], clientId: 'create_group_test' };
  const created = await request('/groups', 'admin-one', 'POST', payload);
  assert.equal(created.status, 201);
  const id = created.data.id;
  assert.equal((await request('/groups', 'admin-one', 'POST', payload)).data.id, id);
  const rooms = (await request('/rooms', 'admin-two')).data.rooms;
  assert.equal(rooms.find(r => r.id === id).name, payload.name);
  assert.deepEqual(rooms.find(r => r.id === id).memberIds.sort(), [1, 2]);
  assert.ok(!(await request('/rooms', 'admin-three')).data.rooms.some(r => r.id === id));
  assert.equal((await request(`/rooms/${id}/messages`, 'admin-three')).status, 403);
  assert.equal((await request(`/rooms/${id}/messages`, 'admin-three', 'POST', { body:'x', clientId:'outsider_test' })).status, 403);
  const sent = await request(`/rooms/${id}/messages`, 'admin-two', 'POST', { body:'Tin nhắn trong nhóm 📷', image, clientId:'group_message_test' });
  assert.equal(sent.status, 201);
  assert.equal((await request(`/rooms/${id}/messages`)).data.messages[0].body, 'Tin nhắn trong nhóm 📷');
  assert.equal((await request(`/rooms/${id}/messages/${sent.data.id}/image`, 'admin-three')).status, 403);
  assert.equal((await request(`/rooms/${id}/messages/${sent.data.id}/image`)).data.image, image);
  assert.equal((await request(`/rooms/${id}/members`, 'admin-two', 'POST', { memberIds:[3] })).status, 403);
  assert.equal((await request(`/rooms/${id}/members`, 'admin-one', 'POST', { memberIds:[4] })).status, 400);
  assert.equal((await request(`/rooms/${id}/members`, 'admin-one', 'POST', { memberIds:[3] })).status, 200);
  assert.equal((await request(`/rooms/${id}/members`, 'admin-one', 'POST', { memberIds:[3] })).status, 200);
  assert.equal((await request('/rooms', 'admin-three')).data.rooms.find(r => r.id === id).memberIds.length, 3);
  assert.equal((await request(`/rooms/${id}/messages`, 'admin-three')).data.messages.length, 1);
  assert.equal((await request(`/rooms/${id}/messages`, 'admin-three', 'POST', { body:'Đã vào nhóm', clientId:'new_member_test' })).status, 201);
});
test('group validation rejects customers, banned admins, missing names and empty membership', async () => {
  for (const memberIds of [[], [1], [4], [5], [999], ['2']]) {
    assert.equal((await request('/groups', 'admin-one', 'POST', { name:'Nhóm', memberIds, clientId:'invalid_group_test' })).status, 400);
  }
  assert.equal((await request('/groups', 'admin-one', 'POST', { name:' ', memberIds:[2], clientId:'invalid_name_test' })).status, 400);
  assert.equal((await request('/groups', 'customer', 'POST', { name:'Nhóm', memberIds:[2], clientId:'customer_group_test' })).status, 403);
});
test('revoking a session or admin role immediately revokes chat access', async () => {
  await pg.query("UPDATE users SET session_token = NULL WHERE id = 3");
  assert.equal((await request('/rooms', 'admin-three')).status, 401);
  await pg.query("UPDATE users SET role = 'user' WHERE id = 2");
  assert.equal((await request('/rooms', 'admin-two')).status, 403);
  assert.equal((await request('/rooms/dm:1:2/messages')).status, 403);
});
