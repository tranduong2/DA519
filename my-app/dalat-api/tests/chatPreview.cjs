// Local visual QA only. Uses disposable PostgreSQL, never DATABASE_URL.
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const { PostgresCompatPool } = require('../dist/postgresCompat');
const { installAdminChat } = require('../dist/adminChat');
(async () => {
  const pg = new PGlite();
  await pg.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY, username TEXT, name TEXT, email TEXT, role TEXT, banned SMALLINT DEFAULT 0, session_token TEXT);
    INSERT INTO users VALUES (1,'Admin Kiểm thử',NULL,'qa@example.test','admin',0,'local-qa-one'),(2,'Minh Anh',NULL,'qa2@example.test','admin',0,'local-qa-two'),(3,'Hoàng Nam',NULL,'qa3@example.test','admin',0,'local-qa-three');`);
  const db = new PostgresCompatPool('postgres://unused');
  db.pool = { query: async (sql, params) => { const r = await pg.query(sql, params); return { ...r, rowCount: r.affectedRows ?? r.rows.length }; } };
  const app = express();
  await installAdminChat(app, db);
  await pg.query("INSERT INTO admin_chat_messages(room,sender_id,body,client_id) VALUES ('general',2,'Chào mọi người! Mình đã cập nhật đơn hàng sáng nay. 🌸','preview_1'),('general',1,'Cảm ơn bạn! Mọi người trao đổi công việc tại đây nhé 👍','preview_2'),('dm:1:2',2,'Bạn kiểm tra giúp mình đơn hàng hôm nay nhé.','preview_3')");
  app.get('/products', (_req,res) => res.json([]));
  app.get('/categories', (_req,res) => res.json([]));
  app.get('/admin/orders', (_req,res) => res.json({orders:[]}));
  app.get('/admin/bulk-orders', (_req,res) => res.json({orders:[]}));
  const root = path.resolve(__dirname, '../../dist');
  app.get(/^\/DA519\/.*\.js$/, (req,res) => {
    const target = path.resolve(root, '.' + req.path.slice('/DA519'.length));
    if (!target.startsWith(root + path.sep) || !fs.existsSync(target)) return res.sendStatus(404);
    res.type('js').send(fs.readFileSync(target, 'utf8').replaceAll('https://da519.onrender.com', 'http://localhost:3039'));
  });
  app.get(['/','/DA519','/DA519/'], (_req,res) => {
    const session = { state: { user: {id:1, username:'Admin Kiểm thử',email:'qa@example.test',role:'admin',token:'local-qa-one'},token:'local-qa-one',isAuthenticated:true,rememberLogin:true }, version: 0 };
    res.type('html').send(fs.readFileSync(path.join(root,'index.html'),'utf8').replace('<head>', `<head><script>localStorage.setItem('user-storage', ${JSON.stringify(JSON.stringify(session))});</script>`));
  });
  app.use('/DA519', express.static(root));
  app.listen(3039,'127.0.0.1', () => console.log('Disposable chat preview: http://localhost:3039/DA519/'));
})();
