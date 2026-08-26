import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { PostgresCompatPool, ResultSetHeader } from './postgresCompat';

dotenv.config();

const app = express();
app.disable('x-powered-by');

const configuredOrigin = process.env.FRONTEND_URL
  ? new URL(process.env.FRONTEND_URL).origin
  : 'https://tranduong2.github.io';
const allowedOrigins = new Set([
  configuredOrigin,
  'https://tranduong2.github.io',
  'http://localhost:19006',
  'http://localhost:8081',
  'http://localhost:3000',
]);
app.use(cors({
  origin(origin, callback) {
    // Native apps and same-origin/server requests do not send an Origin header.
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin không được phép'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use((error: Error, _req: Request, res: Response, next: NextFunction) => {
  if (error?.message === 'Origin không được phép') {
    return res.status(403).json({ message: 'Origin không được phép' });
  }
  next(error);
});
app.use(express.json({ limit: '1mb' }));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  next();
});

type RateEntry = { count: number; resetAt: number };
function rateLimit(windowMs: number, max: number) {
  const entries = new Map<string, RateEntry>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const current = entries.get(key);
    if (!current || current.resetAt <= now) {
      entries.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    current.count += 1;
    if (current.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
      return res.status(429).json({ message: 'Quá nhiều lần thử. Vui lòng chờ rồi thử lại.' });
    }
    next();
  };
}

app.use('/auth/login', rateLimit(15 * 60 * 1000, 10));
app.use('/auth/register', rateLimit(60 * 60 * 1000, 10));
const createOrderRateLimit = rateLimit(60 * 60 * 1000, 30);

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

const databaseUrl = process.env.DATABASE_URL;

type VipTierKey = 'silver' | 'gold' | 'platinum';

type VipTierConfig = {
  key: VipTierKey;
  label: string;
  minSpending: number;
  discountPercent: number;
  pointsMultiplier: number;
};

const VIP_TIERS: VipTierConfig[] = [
  { key: 'silver', label: 'Silver', minSpending: 5_000_000, discountPercent: 5, pointsMultiplier: 1 },
  { key: 'gold', label: 'Gold', minSpending: 10_000_000, discountPercent: 10, pointsMultiplier: 1.5 },
  { key: 'platinum', label: 'Platinum', minSpending: 20_000_000, discountPercent: 15, pointsMultiplier: 2 },
];

let pool: PostgresCompatPool;
// Cache token → userId trong bộ nhớ; nếu server restart sẽ fallback sang DB (session_token)
const tokenToUserId: Record<string, number> = {};

function createToken(): string {
  return crypto.randomUUID();
}

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? '').trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, maxLength);
}

function normalizeEmail(value: unknown): string {
  return cleanText(value, 254).toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) return reject(error);
      resolve(`scrypt$${salt}$${derivedKey.toString('hex')}`);
    });
  });
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored.startsWith('scrypt$')) return stored === password;
  const [, salt, expectedHex] = stored.split('$');
  if (!salt || !expectedHex) return false;
  return new Promise((resolve) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) return resolve(false);
      const expected = Buffer.from(expectedHex, 'hex');
      resolve(expected.length === derivedKey.length && crypto.timingSafeEqual(expected, derivedKey));
    });
  });
}

async function migrateLegacyPasswords(): Promise<void> {
  const [rows] = await pool.query('SELECT id, password FROM users') as [any[], any];
  for (const row of rows as any[]) {
    const password = String(row.password ?? '');
    if (password && !password.startsWith('scrypt$')) {
      await pool.query('UPDATE users SET password = ? WHERE id = ?', [await hashPassword(password), row.id]);
    }
  }
}

function mapUser(row: any, token: string) {
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? row.username ?? null,
    username: row.username ?? row.name ?? null,
    phone: row.phone ?? null,
    address: row.address ?? null,
    role: row.role ?? 'user',
    vipTier: row.vipTier ?? null,
    quarterlySpending: Number(row.quarterlySpending ?? 0),
    rewardPoints: Number(row.rewardPoints ?? 0),
    vipQuarterKey: row.vipQuarterKey ?? null,
    vipTierUpdatedAt: row.vipTierUpdatedAt ?? null,
    token,
  } as const;
}

function getCurrentQuarterKey(date = new Date()): string {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}-Q${quarter}`;
}

function getNextQuarterReset(date = new Date()): string {
  const quarter = Math.floor(date.getMonth() / 3);
  const nextQuarterStartMonth = (quarter + 1) * 3;
  const nextYear = nextQuarterStartMonth >= 12 ? date.getFullYear() + 1 : date.getFullYear();
  const month = nextQuarterStartMonth % 12;
  return new Date(nextYear, month, 1, 0, 0, 0, 0).toISOString();
}

function getVipTierForSpending(spending: number): VipTierConfig | null {
  return [...VIP_TIERS]
    .sort((a, b) => a.minSpending - b.minSpending)
    .filter((tier) => spending >= tier.minSpending)
    .at(-1) ?? null;
}

async function ensureUserColumns() {
  const statements = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS banned SMALLINT DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS session_token VARCHAR(255) NULL",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS address VARCHAR(500) NULL",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS vipTier VARCHAR(20) DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS quarterlySpending DECIMAL(12,2) DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS rewardPoints DECIMAL(12,2) DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS vipQuarterKey VARCHAR(20) DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS vipTierUpdatedAt TIMESTAMP DEFAULT NULL",
  ];

  for (const statement of statements) {
    try {
      await pool.query(statement);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.toLowerCase().includes('exists')) {
        console.warn('⚠️ User migration warning:', message);
      }
    }
  }
}

async function ensureInventoryTables() {
  const statements = [
    "ALTER TABLE Products ADD COLUMN IF NOT EXISTS stock INT DEFAULT 0",
    "ALTER TABLE Products ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'kg'",
    `CREATE TABLE IF NOT EXISTS inventory_logs (
        id           INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        productId    INT NOT NULL,
        productName  VARCHAR(255),
        type         VARCHAR(20) NOT NULL CHECK (type IN ('import','export','flashsale')),
        quantity     INT NOT NULL,
        note         VARCHAR(500),
        supplier     VARCHAR(255),
        receiver     VARCHAR(255),
        price        BIGINT DEFAULT 0,
        createdBy    INT,
        createdAt    TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (productId) REFERENCES Products(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS inventory_flashsale (
        id           INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        productId    INT NOT NULL UNIQUE,
        discountPct  INT DEFAULT 20,
        isActive     SMALLINT DEFAULT 0,
        activatedAt  TIMESTAMP NULL,
        createdAt    TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (productId) REFERENCES Products(id) ON DELETE CASCADE
    )`,
    'ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE inventory_flashsale ENABLE ROW LEVEL SECURITY',
  ];

  for (const statement of statements) {
    try {
      await pool.query(statement);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.toLowerCase().includes('exists') && !message.toLowerCase().includes('duplicate')) {
        console.warn('⚠️ Inventory migration warning:', message.substring(0, 120));
      }
    }
  }
}

// ✅ THÊM: cho phép đơn hàng không có userId (khách vãng lai / guest checkout)
async function ensureOrderColumns() {
  try {
    await pool.query('ALTER TABLE orders ALTER COLUMN "userId" DROP NOT NULL');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('⚠️ Order migration warning:', message.substring(0, 150));
  }
}

async function ensureBulkOrderColumns() {
  try {
    await pool.query('ALTER TABLE bulk_orders ADD COLUMN IF NOT EXISTS invoiceSentAt TIMESTAMP NULL');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('⚠️ Bulk order migration warning:', message.substring(0, 150));
  }
}

async function syncVipCycle(userId: number) {
  const [rows] = await pool.query(
    'SELECT id, vipTier, quarterlySpending, rewardPoints, vipQuarterKey FROM users WHERE id = ?',
    [userId],
  ) as [any[], any];

  const user = (rows as any[])[0];
  if (!user) return null;

  const currentQuarterKey = getCurrentQuarterKey();
  if (user.vipQuarterKey !== currentQuarterKey) {
    await pool.query(
      'UPDATE users SET quarterlySpending = 0, vipQuarterKey = ?, vipTier = NULL, vipTierUpdatedAt = NOW() WHERE id = ?',
      [currentQuarterKey, userId],
    );

    return {
      ...user,
      quarterlySpending: 0,
      vipQuarterKey: currentQuarterKey,
      vipTier: null,
    };
  }

  return user;
}

async function updateVipAfterOrder(userId: number, orderTotal: number) {
  const [rows] = await pool.query(
    'SELECT id, quarterlySpending, rewardPoints, vipQuarterKey FROM users WHERE id = ?',
    [userId],
  ) as [any[], any];

  const user = (rows as any[])[0];
  if (!user) return;

  const currentQuarterKey = getCurrentQuarterKey();
  const currentSpending = user.vipQuarterKey === currentQuarterKey ? Number(user.quarterlySpending ?? 0) : 0;
  const nextSpending = currentSpending + Number(orderTotal || 0);
  const nextTier = getVipTierForSpending(nextSpending);
  const earnedPoints = Math.floor((Number(orderTotal || 0) / 10000) * (nextTier?.pointsMultiplier ?? 1));
  const nextPoints = Number(user.rewardPoints ?? 0) + earnedPoints;

  await pool.query(
    'UPDATE users SET quarterlySpending = ?, rewardPoints = ?, vipTier = ?, vipQuarterKey = ?, vipTierUpdatedAt = NOW() WHERE id = ?',
    [nextSpending, nextPoints, nextTier?.key ?? null, currentQuarterKey, userId],
  );
}

// ✅ Middleware kiểm tra token
interface AuthRequest extends Request {
  userId?: number;
  token?: string;
}

// Async: nếu token không có trong bộ nhớ (vd server vừa restart), fallback tra DB theo session_token
async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }
  const token = authHeader.substring(7);

  let userId = tokenToUserId[token];

  if (!userId) {
    try {
      const [rows] = await pool.query(
        'SELECT id FROM users WHERE session_token = ?',
        [token],
      ) as [any[], any];
      const found = (rows as any[])[0];
      if (found) {
        userId = found.id;
        tokenToUserId[token] = userId;
      }
    } catch (e) {
      console.error('authMiddleware DB fallback error:', e);
    }
  }

  if (!userId) {
    console.error('❌ authMiddleware: invalid or expired token');
    return res.status(401).json({ message: 'Token không hợp lệ hoặc hết hạn' });
  }

  req.userId = userId;
  req.token = token;
  next();
}

// ✅ THÊM: Middleware xác thực TÙY CHỌN — có token thì gắn userId,
// KHÔNG có token (hoặc token sai) vẫn cho đi tiếp như khách vãng lai (guest checkout)
async function optionalAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.userId = undefined;
    req.token = undefined;
    return next();
  }
  const token = authHeader.substring(7);
  let userId = tokenToUserId[token];

  if (!userId) {
    try {
      const [rows] = await pool.query(
        'SELECT id FROM users WHERE session_token = ?',
        [token],
      ) as [any[], any];
      const found = (rows as any[])[0];
      if (found) {
        userId = found.id;
        tokenToUserId[token] = userId;
      }
    } catch (e) {
      console.error('optionalAuthMiddleware DB fallback error:', e);
    }
  }

  // Không tìm thấy user cho token này -> vẫn coi là khách, KHÔNG chặn request
  req.userId = userId || undefined;
  req.token = userId ? token : undefined;
  next();
}

// ✅ Middleware kiểm tra quyền admin
async function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.userId) {
      return res.status(400).json({ message: 'Lỗi: Không có userId' });
    }
    const [rows] = await pool.query('SELECT id, email, role FROM users WHERE id = ?', [req.userId]) as [any[], any];
    const user = (rows as any[])[0];
    const role = user?.role;
    if (!role || role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền admin. Bạn cần là admin để truy cập.' });
    }
    next();
  } catch (err) {
    console.error('❌ adminMiddleware error:', err);
    res.status(500).json({ message: 'Lỗi server: ' + String(err) });
  }
}

async function startServer() {
  try {
    if (!databaseUrl) throw new Error('Thiếu DATABASE_URL trong file .env');
    pool = new PostgresCompatPool(databaseUrl);
    await pool.connect();
    console.log("✅ Kết nối Supabase PostgreSQL thành công!");

    await ensureUserColumns();
    await migrateLegacyPasswords();
    await ensureInventoryTables();
    await ensureOrderColumns();
    await ensureBulkOrderColumns();

    app.get('/health', (_req, res) => {
      res.json({ status: 'ok', database: 'supabase-postgres' });
    });

    // ── AUTH ─────────────────────────────────────────────────

    app.get('/auth/me', authMiddleware, async (req: AuthRequest, res) => {
      try {
        await syncVipCycle(req.userId!);
        const [rows] = await pool.query(
          'SELECT id, email, name, username, phone, address, role, banned, vipTier, quarterlySpending, rewardPoints, vipQuarterKey, vipTierUpdatedAt FROM users WHERE id = ?',
          [req.userId],
        ) as [any[], any];
        const user = (rows as any[])[0];
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
        res.json({
          user: { ...user, banned: !!user.banned },
          token: req.token,
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server: ' + String(err) });
      }
    });

    app.post("/auth/login", async (req, res) => {
      try {
        const email = normalizeEmail(req.body?.email);
        const password = String(req.body?.password ?? '');

        if (!email || !password) {
          return res.status(400).json({ message: "Vui lòng nhập đầy đủ email và mật khẩu" });
        }

        const [rows] = await pool.query(
          "SELECT * FROM users WHERE LOWER(email) = LOWER(?)",
          [email],
        ) as [any[], any];

        if (!Array.isArray(rows) || rows.length === 0) {
          return res.status(401).json({ message: "Email chưa được đăng ký" });
        }
        if (rows[0].banned) {
          return res.status(403).json({ message: "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên" });
        }
        if (!(await verifyPassword(password, String(rows[0].password ?? '')))) {
          return res.status(401).json({ message: "Mật khẩu không chính xác" });
        }

        // Nâng cấp trong suốt tài khoản cũ từ mật khẩu chữ thường sang scrypt.
        if (!String(rows[0].password ?? '').startsWith('scrypt$')) {
          await pool.query('UPDATE users SET password = ? WHERE id = ?', [await hashPassword(password), rows[0].id]);
        }

        const token = createToken();
        const typedRows = rows as any[];
        tokenToUserId[token] = typedRows[0].id;

        // Lưu token vào DB để tồn tại qua các lần restart server
        await pool.query('UPDATE users SET session_token = ? WHERE id = ?', [token, typedRows[0].id]);

        await syncVipCycle(typedRows[0].id);
        const [vipRows] = await pool.query('SELECT * FROM users WHERE id = ?', [typedRows[0].id]) as [any[], any];
        const refreshedUser = (vipRows as any[])[0] ?? typedRows[0];

        res.json({
          message: "Đăng nhập thành công",
          token,
          user: mapUser(refreshedUser, token),
        });
      } catch (err: unknown) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
      }
    });

    app.post("/auth/register", async (req, res) => {
      try {
        const name = cleanText(req.body?.name, 100);
        const email = normalizeEmail(req.body?.email);
        const phone = cleanText(req.body?.phone, 20);
        const password = String(req.body?.password ?? '');

        if (!name || !isValidEmail(email) || password.length < 8 || password.length > 128) {
          return res.status(400).json({ message: 'Tên, email hợp lệ và mật khẩu từ 8 ký tự là bắt buộc' });
        }

        const [exist] = await pool.query(
          "SELECT id FROM users WHERE email = ?",
          [email],
        ) as [any[], any];

        if (Array.isArray(exist) && exist.length > 0) {
          return res.status(400).json({ message: "Email đã tồn tại" });
        }

        await pool.query(
          "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)",
          [name, email, phone, await hashPassword(password), "user"],
        );

        const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
          email,
        ]) as [any[], any];
        const token = createToken();
        const typedRegRows = rows as any[];
        tokenToUserId[token] = typedRegRows[0].id;

        await pool.query('UPDATE users SET session_token = ? WHERE id = ?', [token, typedRegRows[0].id]);

        await syncVipCycle(typedRegRows[0].id);
        const [vipRows] = await pool.query('SELECT * FROM users WHERE id = ?', [typedRegRows[0].id]) as [any[], any];
        const refreshedUser = (vipRows as any[])[0] ?? typedRegRows[0];

        res.json({
          message: "Đăng ký thành công",
          token,
          user: mapUser(refreshedUser, token),
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
      }
    });

    app.post("/auth/logout", authMiddleware, async (req: AuthRequest, res) => {
      try {
        const token = req.token;
        if (token) {
          delete tokenToUserId[token];
          await pool.query('UPDATE users SET session_token = NULL WHERE id = ?', [req.userId]);
        }
        res.json({ message: "Đăng xuất thành công" });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
      }
    });

    // ✅ FIX: dùng req.userId thay vì email trong body, trả về user sau khi cập nhật
    app.put("/auth/update-profile", authMiddleware, async (req: AuthRequest, res) => {
      try {
        const username = cleanText(req.body?.username, 100);
        const address = cleanText(req.body?.address, 500);
        const phone = cleanText(req.body?.phone, 20);

        await pool.query(
          `UPDATE users SET username = ?, address = ?, phone = ? WHERE id = ?`,
          [username || null, address || null, phone || null, req.userId],
        );

        const [rows] = await pool.query(
          'SELECT id, email, name, username, phone, address, role FROM users WHERE id = ?',
          [req.userId],
        ) as [any[], any];

        res.json({ message: "Cập nhật thành công", user: (rows as any[])[0] });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi update profile" });
      }
    });

    // ✅ THÊM: đổi mật khẩu (còn thiếu trong bản TS gốc)
    app.put("/auth/change-password", authMiddleware, async (req: AuthRequest, res) => {
      try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
          return res.status(400).json({ message: "Thiếu thông tin mật khẩu" });
        }
        if (newPassword.length < 8 || newPassword.length > 128) {
          return res.status(400).json({ message: "Mật khẩu mới phải có từ 8 đến 128 ký tự" });
        }
        const [rows] = await pool.query(
          "SELECT password FROM users WHERE id = ?", [req.userId],
        ) as [any[], any];
        const user = (rows as any[])[0];
        if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });
        if (!(await verifyPassword(String(currentPassword), String(user.password ?? '')))) {
          return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });
        }
        await pool.query("UPDATE users SET password = ? WHERE id = ?", [await hashPassword(String(newPassword)), req.userId]);
        res.json({ message: "Đổi mật khẩu thành công" });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server: " + String(err) });
      }
    });

    // ✅ GET USER
    app.get("/user/:email", authMiddleware, async (req: AuthRequest, res) => {
      try {
        const email = normalizeEmail(req.params.email);
        const [requesterRows] = await pool.query('SELECT email, role FROM users WHERE id = ?', [req.userId]) as [any[], any];
        const requester = (requesterRows as any[])[0];
        if (!requester || (requester.role !== 'admin' && normalizeEmail(requester.email) !== email)) {
          return res.status(403).json({ message: 'Không có quyền xem tài khoản này' });
        }

        const [rows] = await pool.query(
          "SELECT id, email, name, username, phone, address, role, banned, vipTier, quarterlySpending, rewardPoints, vipQuarterKey, vipTierUpdatedAt FROM users WHERE email = ?",
          [email as string],
        ) as [any[], any];
        const typedRows = rows as any[];

        if (!typedRows || !typedRows[0]) {
          return res.status(404).json({ message: "Không tìm thấy user" });
        }

        res.json(typedRows[0]);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
      }
    });

    // ── VIP ──────────────────────────────────────────────────

    app.get('/vip/tiers', authMiddleware, async (_req: AuthRequest, res) => {
      res.json({
        tiers: VIP_TIERS,
        nextResetAt: getNextQuarterReset(),
      });
    });

    app.get('/vip/status', authMiddleware, async (req: AuthRequest, res) => {
      try {
        const snapshot = await syncVipCycle(req.userId!);
        if (!snapshot) {
          return res.status(404).json({ message: 'Không tìm thấy user' });
        }

        const currentTier = getVipTierForSpending(Number(snapshot.quarterlySpending ?? 0));
        res.json({
          vip: {
            tier: currentTier?.key ?? null,
            tierLabel: currentTier?.label ?? 'Member',
            quarterlySpending: Number(snapshot.quarterlySpending ?? 0),
            rewardPoints: Number(snapshot.rewardPoints ?? 0),
            quarterKey: snapshot.vipQuarterKey ?? getCurrentQuarterKey(),
            nextResetAt: getNextQuarterReset(),
            tiers: VIP_TIERS,
          },
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
      }
    });

    // ── PRODUCTS ─────────────────────────────────────────────

    app.get("/products/flashsale", async (req, res) => {
      const [rows] = await pool.query(
        "SELECT * FROM Products WHERE isFlashSale = 1 ORDER BY RAND()",
      ) as [any[], any];
      res.json(rows as any[]);
    });

    app.get("/products/cat/:cat", async (req, res) => {
      const [rows] = await pool.query("SELECT * FROM Products WHERE cat = ?", [
        req.params.cat as string,
      ]) as [any[], any];
      res.json(rows as any[]);
    });

    app.get("/products", async (req, res) => {
      const [rows] = await pool.query("SELECT * FROM Products") as [any[], any];
      res.json(rows as any[]);
    });

    app.get("/products/:id", async (req, res) => {
      const [rows] = await pool.query("SELECT * FROM Products WHERE id = ?", [
        req.params.id as string,
      ]) as [any[], any];
      const typedRows = rows as any[];
      if (!typedRows[0]) return res.status(404).json({ error: "Không tìm thấy" });
      res.json(typedRows[0]);
    });

    app.post("/products", authMiddleware, adminMiddleware, async (req, res) => {
      const { name, price, oldPrice, cat, imageUrl } = req.body;
      const [result] = await pool.query(
        "INSERT INTO Products (name, price, oldPrice, cat, imageUrl) VALUES (?, ?, ?, ?, ?)",
        [name, price, oldPrice, cat, imageUrl],
      ) as [any, any];
      const resultTyped = result as any;
      const [rows] = await pool.query("SELECT * FROM Products WHERE id = ?", [
        resultTyped.insertId,
      ]) as [any[], any];
      res.json((rows as any[])[0]);
    });

    // ✅ THÊM: quản lý sản phẩm flash sale (còn thiếu trong bản TS gốc)
    app.post('/products/flashsale', authMiddleware, adminMiddleware, async (req, res) => {
      try {
        const { name, price, oldPrice, salePrice, cat, imageUrl } = req.body;
        if (!name) return res.status(400).json({ message: 'Tên sản phẩm là bắt buộc' });
        const [result] = await pool.query(
          'INSERT INTO Products (name, price, oldPrice, salePrice, cat, imageUrl, isFlashSale) VALUES (?, ?, ?, ?, ?, ?, 1)',
          [name, price ?? null, oldPrice ?? null, salePrice ?? null, cat ?? null, imageUrl ?? null],
        ) as [any, any];
        const [rows] = await pool.query('SELECT * FROM Products WHERE id = ?', [(result as any).insertId]) as [any[], any];
        res.status(201).json((rows as any[])[0]);
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + String(err) });
      }
    });

    app.put('/products/flashsale/:id', authMiddleware, adminMiddleware, async (req, res) => {
      try {
        const { id } = req.params;
        const { name, price, oldPrice, salePrice, cat, imageUrl } = req.body;
        await pool.query(
          'UPDATE Products SET name=?, price=?, oldPrice=?, salePrice=?, cat=?, imageUrl=? WHERE id=? AND isFlashSale=1',
          [name, price ?? null, oldPrice ?? null, salePrice ?? null, cat ?? null, imageUrl ?? null, id],
        );
        const [rows] = await pool.query('SELECT * FROM Products WHERE id = ?', [id]) as [any[], any];
        if (!(rows as any[])[0]) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
        res.json((rows as any[])[0]);
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + String(err) });
      }
    });

    app.delete('/products/flashsale/:id', authMiddleware, adminMiddleware, async (req, res) => {
      try {
        await pool.query('DELETE FROM Products WHERE id = ? AND isFlashSale = 1', [req.params.id]);
        res.json({ message: 'Đã xóa sản phẩm flash sale' });
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + String(err) });
      }
    });

    // ── ORDERS ───────────────────────────────────────────────

    app.get("/orders", authMiddleware, async (req: AuthRequest, res) => {
      try {
        const limit = req.query.limit ? parseInt(String(req.query.limit)) : 20;
        const status = req.query.status ? String(req.query.status) : undefined;

        let query = "SELECT * FROM orders WHERE userId = ?";
        let params: any[] = [req.userId];

        if (status) {
          query += " AND status = ?";
          params.push(status);
        }

        query += " ORDER BY createdAt DESC LIMIT ?";
        params.push(limit);

        const [orders] = await pool.query(query, params) as [any[], any];

        const ordersWithItems = await Promise.all(
          (orders as any[]).map(async (order) => {
            const [items] = await pool.query(
              "SELECT * FROM order_items WHERE orderId = ?",
              [order.id],
            ) as [any[], any];
            return { ...order, items: items || [] };
          }),
        );

        res.json({ orders: ordersWithItems });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
      }
    });

    // ✅ SỬA: optionalAuthMiddleware — khách vãng lai cũng xem được đơn hàng của họ qua orderId
    app.get("/orders/:orderId", authMiddleware, async (req: AuthRequest, res) => {
      try {
        const { orderId } = req.params;

        const [orders] = await pool.query(
          "SELECT * FROM orders WHERE id = ? AND userId = ?",
          [orderId, req.userId],
        ) as [any[], any];

        if (!Array.isArray(orders) || orders.length === 0) {
          return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
        }

        const [items] = await pool.query(
          "SELECT * FROM order_items WHERE orderId = ?",
          [orderId],
        ) as [any[], any];

        res.json({ order: { ...orders[0], items: items || [] } });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
      }
    });

    // ✅ SỬA: optionalAuthMiddleware — cho phép đặt hàng không cần đăng nhập (guest checkout)
    app.post("/orders", createOrderRateLimit, optionalAuthMiddleware, async (req: AuthRequest, res) => {
      try {
        const {
          orderCode,
          items,
          totalAmount,
          paymentMethod,
          shippingAddress,
          estimatedDelivery,
        } = req.body;

        if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
          return res.status(400).json({ message: "Đơn hàng phải có sản phẩm" });
        }

        const safeOrderCode = cleanText(orderCode, 50);
        const safeAddress = cleanText(shippingAddress, 500);
        if (!safeOrderCode || !safeAddress) {
          return res.status(400).json({ message: 'Thiếu mã đơn hoặc địa chỉ giao hàng' });
        }
        for (const item of items) {
          const quantity = Number(item?.quantity);
          const price = Number(item?.price);
          if (!item?.productId || !cleanText(item?.productName, 255) || !Number.isFinite(quantity) || quantity <= 0 || quantity > 10000 || !Number.isFinite(price) || price < 0) {
            return res.status(400).json({ message: 'Dữ liệu sản phẩm không hợp lệ' });
          }
        }

        const orderValue = Number(totalAmount || 0);
        // Chuẩn hóa paymentMethod về "cod" hoặc "bank" trước khi lưu DB
        const normalizedPaymentMethod =
          paymentMethod === 'cod' || paymentMethod === 'bank'
            ? paymentMethod
            : /tiền mặt|cod/i.test(String(paymentMethod))
              ? 'cod'
              : 'bank';

        const [result] = await pool.query(
          `INSERT INTO orders (userId, orderCode, totalAmount, status, paymentMethod, shippingAddress, estimatedDelivery, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            req.userId ?? null, // ← khách vãng lai: không có userId
            safeOrderCode,
            orderValue,
            "pending",
            normalizedPaymentMethod,
            safeAddress,
            cleanText(estimatedDelivery, 100) || null,
          ],
        ) as [any, any];

        const resultTyped = result as any;
        const orderId = resultTyped.insertId;

        for (const item of items) {
          await pool.query(
            `INSERT INTO order_items (orderId, productId, productName, price, quantity, note)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              orderId,
              item.productId,
              cleanText(item.productName, 255),
              item.price,
              item.quantity,
              cleanText(item.note, 500) || null,
            ],
          );
        }

        // Lưu ý: KHÔNG cộng điểm VIP/doanh thu ngay khi tạo đơn nữa.
        // Điểm VIP chỉ được cộng khi đơn chuyển sang trạng thái "delivered"
        // (xem route PUT /admin/orders/:orderId/status bên dưới) —
        // tránh cộng nhầm điểm cho đơn sau đó bị hủy.

        const [orders] = await pool.query("SELECT * FROM orders WHERE id = ?", [
          orderId,
        ]) as [any[], any];
        const [orderItems] = await pool.query(
          "SELECT * FROM order_items WHERE orderId = ?",
          [orderId],
        ) as [any[], any];
        const typedOrders = orders as any[];
        const typedOrderItems = orderItems as any[];

        let vipInfo = null;
        if (req.userId) {
          const [userRows] = await pool.query(
            'SELECT id, email, name, username, phone, role, vipTier, quarterlySpending, rewardPoints, vipQuarterKey, vipTierUpdatedAt FROM users WHERE id = ?',
            [req.userId],
          ) as [any[], any];
          vipInfo = (userRows as any[])[0] ?? null;
        }

        res.status(201).json({
          message: "Đơn hàng được tạo thành công",
          order: { ...typedOrders[0], items: typedOrderItems },
          vip: vipInfo,
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
      }
    });

    app.put("/orders/:orderId", authMiddleware, async (req: AuthRequest, res) => {
      try {
        const { orderId } = req.params;
        const { status, estimatedDelivery } = req.body;

        if (status !== undefined) {
          return res.status(403).json({ message: 'Khách hàng không thể tự thay đổi trạng thái đơn' });
        }

        const validStatuses = [
          "pending",
          "confirmed",
          "preparing",
          "on_the_way",
          "delivered",
          "cancelled",
        ];
        if (status && !validStatuses.includes(status)) {
          return res.status(400).json({ message: "Trạng thái không hợp lệ" });
        }

        const [orderCheck] = await pool.query(
          "SELECT id FROM orders WHERE id = ? AND userId = ?",
          [orderId, req.userId],
        ) as [any[], any];

        if (!Array.isArray(orderCheck) || orderCheck.length === 0) {
          return res
            .status(403)
            .json({ message: "Không có quyền cập nhật đơn hàng này" });
        }

        let query = "UPDATE orders SET updatedAt = NOW()";
        const params = [];

        if (status) {
          query += ", status = ?";
          params.push(status);
        }
        if (estimatedDelivery) {
          query += ", estimatedDelivery = ?";
          params.push(estimatedDelivery);
        }

        query += " WHERE id = ?";
        params.push(orderId);

        await pool.query(query, params);

        const [orders] = await pool.query("SELECT * FROM orders WHERE id = ?", [
          orderId,
        ]) as [any[], any];
        const [items] = await pool.query(
          "SELECT * FROM order_items WHERE orderId = ?",
          [orderId],
        ) as [any[], any];

        res.json({
          message: "Cập nhật đơn hàng thành công",
          order: { ...(orders as any[])[0], items: (Array.isArray(items) ? items : []) },
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
      }
    });

    app.put("/orders/:orderId/cancel", authMiddleware, async (req: AuthRequest, res) => {
      try {
        const { orderId } = req.params;

        const [orders] = await pool.query(
          "SELECT * FROM orders WHERE id = ? AND userId = ?",
          [orderId, req.userId],
        ) as [any[], any];

        if (!Array.isArray(orders) || orders.length === 0) {
          return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
        }

        if (!["pending", "confirmed"].includes(orders[0].status)) {
          return res.status(400).json({
            message:
              "Chỉ có thể hủy đơn hàng ở trạng thái chờ xác nhận hoặc đã xác nhận",
          });
        }

        await pool.query(
          "UPDATE orders SET status = ?, updatedAt = NOW() WHERE id = ?",
          ["cancelled", orderId],
        );

        const [updatedOrders] = await pool.query(
          "SELECT * FROM orders WHERE id = ?",
          [orderId],
        ) as [any[], any];
        const [items] = await pool.query(
          "SELECT * FROM order_items WHERE orderId = ?",
          [orderId],
        ) as [any[], any];

        res.json({
          message: "Đơn hàng đã được hủy",
          order: { ...(updatedOrders as any[])[0], items: (Array.isArray(items) ? items : []) },
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
      }
    });

    // ── BULK ORDERS ──────────────────────────────────────────

    app.post("/bulk-orders", authMiddleware, async (req: AuthRequest, res) => {
      try {
        const { orderCode, orderDate, items } = req.body;

        if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
          return res.status(400).json({ message: "Đơn hàng phải có sản phẩm" });
        }
        for (const item of items) {
          const kg = Number(item?.kg);
          const pricePerKg = Number(item?.pricePerKg);
          if (!cleanText(item?.productName, 255) || !Number.isFinite(kg) || kg <= 0 || kg > 100000
            || !Number.isFinite(pricePerKg) || pricePerKg < 0) {
            return res.status(400).json({ message: 'Tên món, số kg hoặc đơn giá không hợp lệ' });
          }
        }
        const calculatedTotal = items.reduce(
          (sum: number, item: any) => sum + Number(item.kg) * Number(item.pricePerKg),
          0,
        );

        const [result] = await pool.query(
          `INSERT INTO bulk_orders (userId, orderCode, orderDate, totalPrice, status, createdAt)
           VALUES (?, ?, ?, ?, 'pending', NOW())`,
          [req.userId, cleanText(orderCode, 50), cleanText(orderDate, 50), calculatedTotal],
        ) as [any, any];

        const resultTyped = result as any;
        const bulkOrderId = resultTyped.insertId;

        for (const item of items) {
          await pool.query(
            `INSERT INTO bulk_order_items (bulkOrderId, productId, productName, kg, pricePerKg, subtotal, note)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              bulkOrderId,
              cleanText(item.productId, 50) || null,
              cleanText(item.productName, 255),
              Number(item.kg),
              Number(item.pricePerKg),
              Number(item.kg) * Number(item.pricePerKg),
              cleanText(item.note, 500) || null,
            ],
          );
        }

        const [orders] = await pool.query(
          "SELECT * FROM bulk_orders WHERE id = ?",
          [bulkOrderId],
        ) as [any[], any];
        const [orderItems] = await pool.query(
          "SELECT * FROM bulk_order_items WHERE bulkOrderId = ?",
          [bulkOrderId],
        ) as [any[], any];

        res.status(201).json({
          message: "Đơn hàng số lượng lớn đã được gửi đến Admin",
          order: { ...(orders as any[])[0], items: (Array.isArray(orderItems) ? orderItems : []) },
        });
      } catch (err) {
        console.error("Bulk order error:", err);
        res.status(500).json({ message: "Lỗi server khi tạo đơn hàng" });
      }
    });

    app.get("/bulk-orders", authMiddleware, async (req: AuthRequest, res) => {
      try {
        const [orders] = await pool.query(
          "SELECT * FROM bulk_orders WHERE userId = ? ORDER BY createdAt DESC",
          [req.userId],
        ) as [any[], any];

        const ordersWithItems = await Promise.all(
          (orders as any[]).map(async (order) => {
            const [items] = await pool.query(
              "SELECT * FROM bulk_order_items WHERE bulkOrderId = ?",
              [order.id],
            ) as [any[], any];
            const invoiceSent = Boolean(order.invoiceSentAt);
            return {
              ...order,
              invoiceSent,
              totalPrice: invoiceSent ? order.totalPrice : 0,
              items: (Array.isArray(items) ? items : []).map((item: any) => invoiceSent
                ? item
                : { ...item, pricePerKg: null, subtotal: null }),
            };
          }),
        );

        res.json({ orders: ordersWithItems });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
      }
    });

    app.get(
      "/admin/bulk-orders",
      authMiddleware,
      adminMiddleware,
      async (req, res) => {
        try {
          const status = req.query.status ? String(req.query.status) : undefined;

          let query = `
          SELECT bo.*, u.name as userName,
                 u.phone as userPhone, u.email as userEmail
          FROM bulk_orders bo
          JOIN users u ON bo.userId = u.id
        `;
          const params: any[] = [];

          if (status) {
            query += " WHERE bo.status = ?";
            params.push(status);
          }

          query += " ORDER BY bo.createdAt DESC";

          const [orders] = await pool.query(query, params) as [any[], any];

          const ordersWithItems = await Promise.all(
            (orders as any[]).map(async (order) => {
              const [items] = await pool.query(
                "SELECT * FROM bulk_order_items WHERE bulkOrderId = ?",
                [order.id],
              ) as [any[], any];
              return { ...order, items: (Array.isArray(items) ? items : []) };
            }),
          );

          res.json({ orders: ordersWithItems });
        } catch (err) {
          console.error(err);
          res.status(500).json({ message: "Lỗi server" });
        }
      },
    );

    app.put(
      "/admin/bulk-orders/:id/status",
      authMiddleware,
      adminMiddleware,
      async (req, res) => {
        try {
          const { id } = req.params;
          const { status } = req.body;

          const validStatuses = [
            "pending",
            "confirmed",
            "delivering",
            "delivered",
            "cancelled",
          ];
          if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ message: "Trạng thái không hợp lệ" });
          }

          await pool.query("UPDATE bulk_orders SET status = ? WHERE id = ?", [
            status,
            id as string,
          ]);

          res.json({ message: "Cập nhật trạng thái thành công" });
        } catch (err) {
          console.error(err);
          res.status(500).json({ message: "Lỗi server" });
        }
      },
    );

    // ── ADMIN: ORDERS ────────────────────────────────────────

    app.put(
      "/admin/bulk-orders/:id/pricing",
      authMiddleware,
      adminMiddleware,
      async (req, res) => {
        try {
          const { id } = req.params;
          const items = req.body?.items;
          if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: "Phải nhập đơn giá cho sản phẩm" });
          const [storedItems] = await pool.query("SELECT * FROM bulk_order_items WHERE bulkOrderId = ?", [id as string]) as [any[], any];
          if (!storedItems.length) return res.status(404).json({ message: "Không tìm thấy đơn sỉ" });
          const prices = new Map<number, number>();
          for (const item of items) {
            const itemId = Number(item?.id);
            const price = Number(item?.pricePerKg);
            if (!Number.isInteger(itemId) || !Number.isFinite(price) || price <= 0) return res.status(400).json({ message: "Đơn giá phải là số lớn hơn 0" });
            prices.set(itemId, price);
          }
          if (storedItems.some(item => !prices.has(Number(item.id)))) return res.status(400).json({ message: "Vui lòng nhập đủ đơn giá cho tất cả sản phẩm" });
          let totalPrice = 0;
          for (const item of storedItems) {
            const pricePerKg = prices.get(Number(item.id))!;
            const subtotal = Number(item.kg) * pricePerKg;
            totalPrice += subtotal;
            await pool.query("UPDATE bulk_order_items SET pricePerKg = ?, subtotal = ? WHERE id = ? AND bulkOrderId = ?", [pricePerKg, subtotal, item.id, id as string]);
          }
          await pool.query("UPDATE bulk_orders SET totalPrice = ?, invoiceSentAt = NULL WHERE id = ?", [totalPrice, id as string]);
          const [orders] = await pool.query(`SELECT bo.*, u.name as userName, u.phone as userPhone, u.email as userEmail FROM bulk_orders bo JOIN users u ON bo.userId = u.id WHERE bo.id = ?`, [id as string]) as [any[], any];
          const [updatedItems] = await pool.query("SELECT * FROM bulk_order_items WHERE bulkOrderId = ?", [id as string]) as [any[], any];
          res.json({ message: "Đã lưu đơn giá và tính tổng hóa đơn", order: { ...orders[0], items: updatedItems } });
        } catch (err) {
          console.error(err);
          res.status(500).json({ message: "Lỗi server khi tính giá đơn sỉ" });
        }
      },
    );

    app.put(
      "/admin/bulk-orders/:id/send-invoice",
      authMiddleware,
      adminMiddleware,
      async (req, res) => {
        try {
          const { id } = req.params;
          const [orders] = await pool.query(
            `SELECT bo.*, u.name as userName, u.phone as userPhone, u.email as userEmail
             FROM bulk_orders bo JOIN users u ON bo.userId = u.id WHERE bo.id = ?`,
            [id as string],
          ) as [any[], any];
          if (!orders.length) return res.status(404).json({ message: "Không tìm thấy đơn sỉ" });

          const [items] = await pool.query(
            "SELECT * FROM bulk_order_items WHERE bulkOrderId = ?",
            [id as string],
          ) as [any[], any];
          if (!items.length || items.some((item: any) => Number(item.pricePerKg) <= 0)) {
            return res.status(400).json({ message: "Vui lòng nhập và lưu đủ đơn giá trước khi gửi hóa đơn" });
          }

          await pool.query("UPDATE bulk_orders SET invoiceSentAt = NOW() WHERE id = ?", [id as string]);
          const invoiceSentAt = new Date().toISOString();
          res.json({
            message: "Đã gửi hóa đơn cho người đặt",
            order: { ...orders[0], invoiceSentAt, invoiceSent: true, items },
          });
        } catch (err) {
          console.error(err);
          res.status(500).json({ message: "Lỗi server khi gửi hóa đơn" });
        }
      },
    );

    app.get(
      "/admin/orders",
      authMiddleware,
      adminMiddleware,
      async (req, res) => {
        try {
          const status = req.query.status ? String(req.query.status) : undefined;
          const limit = req.query.limit ? parseInt(String(req.query.limit)) : 50;

          let query = `
          SELECT o.*, u.name as userName, u.phone as userPhone, u.email as userEmail
          FROM orders o
          LEFT JOIN users u ON o.userId = u.id
        `;
          const params: any[] = [];

          if (status) {
            query += " WHERE o.status = ?";
            params.push(status);
          }

          query += " ORDER BY o.createdAt DESC LIMIT ?";
          params.push(limit);

          const [orders] = await pool.query(query, params) as [any[], any];

          const ordersWithItems = await Promise.all(
            (orders as any[]).map(async (order) => {
              const [items] = await pool.query(
                "SELECT * FROM order_items WHERE orderId = ?",
                [order.id],
              ) as [any[], any];
              return { ...order, items: (Array.isArray(items) ? items : []) };
            }),
          );

          res.json({ orders: ordersWithItems });
        } catch (err) {
          console.error(err);
          res.status(500).json({ message: "Lỗi server" });
        }
      },
    );

    // ✅ THÊM: xem chi tiết 1 đơn hàng (còn thiếu trong bản TS gốc)
    app.get(
      "/admin/orders/:orderId",
      authMiddleware,
      adminMiddleware,
      async (req, res) => {
        try {
          const { orderId } = req.params;

          const [orders] = await pool.query(
            `SELECT o.*, u.name as userName, u.phone as userPhone, u.email as userEmail
           FROM orders o
           LEFT JOIN users u ON o.userId = u.id
           WHERE o.id = ?`,
            [orderId as string],
          ) as [any[], any];

          if (!Array.isArray(orders) || orders.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
          }

          const [items] = await pool.query(
            "SELECT * FROM order_items WHERE orderId = ?",
            [orderId as string],
          ) as [any[], any];

          res.json({ order: { ...(orders as any[])[0], items: (Array.isArray(items) ? items : []) } });
        } catch (err) {
          console.error(err);
          res.status(500).json({ message: "Lỗi server" });
        }
      },
    );

    app.put(
      "/admin/orders/:orderId/status",
      authMiddleware,
      adminMiddleware,
      async (req, res) => {
        try {
          const { orderId } = req.params;
          const { status } = req.body;

          const validStatuses = [
            "pending",
            "confirmed",
            "preparing",
            "on_the_way",
            "delivered",
            "cancelled",
          ];
          if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ message: "Trạng thái không hợp lệ" });
          }

          const [orderCheck] = await pool.query(
            "SELECT id, userId, totalAmount, status FROM orders WHERE id = ?",
            [orderId as string],
          ) as [any[], any];
          if (!Array.isArray(orderCheck) || orderCheck.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
          }

          const existingOrder = (orderCheck as any[])[0];
          const prevStatus = existingOrder.status as string;
          const targetUserId = existingOrder.userId ? Number(existingOrder.userId) : null;
          const orderTotal = Number(existingOrder.totalAmount ?? 0);

          await pool.query(
            "UPDATE orders SET status = ?, updatedAt = NOW() WHERE id = ?",
            [status, orderId as string],
          );

          // Chỉ cộng điểm VIP/doanh thu một lần, đúng lúc đơn CHUYỂN sang "delivered",
          // và chỉ khi đơn có chủ tài khoản (không áp dụng cho khách vãng lai)
          if (status === "delivered" && prevStatus !== "delivered" && targetUserId) {
            await updateVipAfterOrder(targetUserId, orderTotal);
          }

          const [orders] = await pool.query(
            `SELECT o.*, u.name as userName, u.phone as userPhone, u.email as userEmail
           FROM orders o LEFT JOIN users u ON o.userId = u.id
           WHERE o.id = ?`,
            [orderId as string],
          ) as [any[], any];
          const [items] = await pool.query(
            "SELECT * FROM order_items WHERE orderId = ?",
            [orderId as string],
          ) as [any[], any];

          res.json({
            message: "Cập nhật trạng thái thành công",
            order: { ...(orders as any[])[0], items: (Array.isArray(items) ? items : []) },
          });
        } catch (err) {
          console.error(err);
          res.status(500).json({ message: "Lỗi server" });
        }
      },
    );

    app.get(
      "/admin/stats",
      authMiddleware,
      adminMiddleware,
      async (req, res) => {
        try {
          const [[{ total }]] = await pool.query(
            "SELECT COUNT(*) as total FROM orders",
          ) as any;
          const [[{ pending }]] = await pool.query(
            "SELECT COUNT(*) as pending FROM orders WHERE status = 'pending'",
          ) as any;
          const [[{ confirmed }]] = await pool.query(
            "SELECT COUNT(*) as confirmed FROM orders WHERE status = 'confirmed'",
          ) as any;
          const [[{ delivered }]] = await pool.query(
            "SELECT COUNT(*) as delivered FROM orders WHERE status = 'delivered'",
          ) as any;
          const [[{ cancelled }]] = await pool.query(
            "SELECT COUNT(*) as cancelled FROM orders WHERE status = 'cancelled'",
          ) as any;
          const [[{ revenue }]] = await pool.query(
            "SELECT COALESCE(SUM(totalAmount), 0) as revenue FROM orders WHERE status = 'delivered'",
          ) as any;

          res.json({
            total,
            pending,
            confirmed,
            delivered,
            cancelled,
            revenue,
          });
        } catch (err) {
          console.error(err);
          res.status(500).json({ message: "Lỗi server" });
        }
      },
    );

    // ── ADMIN: USERS ─────────────────────────────────────────

    app.get('/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
      try {
        const [rows] = await pool.query('SELECT id, email, name, username, phone, role, banned FROM users ORDER BY id DESC') as [any[], any];
        const users = (rows as any[]).map(r => ({ ...r, banned: !!r.banned }));
        res.json({ users });
      } catch (err) {
        console.error('❌ GET /admin/users error:', err);
        res.status(500).json({ message: 'Lỗi server: ' + String(err) });
      }
    });

    app.post('/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
      try {
        const { name, email, phone, role, banned, password } = req.body;
        const safeEmail = normalizeEmail(email);
        const safeRole = role === 'admin' ? 'admin' : 'user';
        if (!isValidEmail(safeEmail) || String(password ?? '').length < 8) return res.status(400).json({ message: 'Email hợp lệ và mật khẩu từ 8 ký tự là bắt buộc' });
        const pwd = await hashPassword(String(password));
        await pool.query('INSERT INTO users (name, email, phone, password, role, banned) VALUES (?, ?, ?, ?, ?, ?)', [cleanText(name, 100) || null, safeEmail, cleanText(phone, 20) || null, pwd, safeRole, banned ? 1 : 0]);
        const [rows] = await pool.query('SELECT id, email, name, username, phone, role, banned FROM users WHERE email = ?', [safeEmail]) as [any[], any];
        res.status(201).json({ user: { ...(rows as any[])[0], banned: !!(rows as any[])[0].banned } });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
      }
    });

    app.put('/admin/users/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
      try {
        const { id } = req.params;
        const { name, email, phone, role, banned } = req.body;

        const [targetRows] = await pool.query('SELECT id, role FROM users WHERE id = ?', [id as string]) as [any[], any];
        const target = (targetRows as any[])[0];
        if (!target) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        if (target.role === 'admin' && Number(id) !== Number(req.userId) && role && role !== 'admin') {
          return res.status(403).json({ message: 'Không được thay đổi role của admin khác' });
        }

        const updates: any[] = [];
        const params: any[] = [];
        if (name !== undefined) { updates.push('name = ?'); params.push(name); }
        if (email !== undefined) { updates.push('email = ?'); params.push(email); }
        if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
        if (role !== undefined) { updates.push('role = ?'); params.push(role); }
        if (banned !== undefined) { updates.push('banned = ?'); params.push(banned ? 1 : 0); }

        if (updates.length === 0) return res.status(400).json({ message: 'Không có trường để cập nhật' });

        params.push(id as string);
        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        await pool.query(sql, params);

        const [rows] = await pool.query('SELECT id, email, name, username, phone, role, banned FROM users WHERE id = ?', [id as string]) as [any[], any];
        res.json({ user: { ...(rows as any[])[0], banned: !!(rows as any[])[0].banned } });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
      }
    });

    app.delete('/admin/users/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
      try {
        const { id } = req.params;
        const [targetRows] = await pool.query('SELECT id, role FROM users WHERE id = ?', [id as string]) as [any[], any];
        const target = (targetRows as any[])[0];
        if (!target) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        if (Number(id) === Number(req.userId)) {
          return res.status(403).json({ message: 'Không thể tự xóa tài khoản admin đang đăng nhập' });
        }
        if (target.role === 'admin' && Number(id) !== Number(req.userId)) {
          return res.status(403).json({ message: 'Không được xóa admin khác' });
        }
        await pool.query('DELETE FROM users WHERE id = ?', [id as string]);
        res.json({ message: 'Đã xóa người dùng' });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
      }
    });

    app.post('/admin/users/:id/ban', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
      try {
        const { id } = req.params;
        const { banned } = req.body;
        const [targetRows] = await pool.query('SELECT id, role FROM users WHERE id = ?', [id as string]) as [any[], any];
        const target = (targetRows as any[])[0];
        if (!target) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        if (Number(id) === Number(req.userId) && banned) {
          return res.status(403).json({ message: 'Không thể tự khóa tài khoản admin đang đăng nhập' });
        }
        if (target.role === 'admin' && Number(id) !== Number(req.userId)) {
          return res.status(403).json({ message: 'Không được cấm admin khác' });
        }
        await pool.query('UPDATE users SET banned = ? WHERE id = ?', [banned ? 1 : 0, id as string]);
        if (banned) {
          await pool.query('UPDATE users SET session_token = NULL WHERE id = ?', [id as string]);
          for (const [token, userId] of Object.entries(tokenToUserId)) {
            if (Number(userId) === Number(id)) delete tokenToUserId[token];
          }
        }
        res.json({ message: banned ? 'Đã cấm người dùng' : 'Đã bỏ cấm người dùng' });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
      }
    });

    // ── CATEGORIES ───────────────────────────────────────────

    app.get('/categories', async (req, res) => {
      try {
        const [rows] = await pool.query('SELECT * FROM categories ORDER BY id ASC') as [any[], any];
        res.json({ categories: rows });
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server' });
      }
    });

    // ✅ THÊM: CRUD danh mục cho admin (còn thiếu trong bản TS gốc)
    app.get('/admin/categories', authMiddleware, adminMiddleware, async (req, res) => {
      try {
        const [rows] = await pool.query('SELECT * FROM categories ORDER BY id DESC') as [any[], any];
        res.json({ categories: rows });
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + String(err) });
      }
    });

    app.post('/admin/categories', authMiddleware, adminMiddleware, async (req, res) => {
      try {
        const { name, slug, imageUrl } = req.body;
        if (!name || !slug) return res.status(400).json({ message: 'Tên và slug là bắt buộc' });
        const [result] = await pool.query(
          'INSERT INTO categories (name, slug, imageUrl) VALUES (?, ?, ?)',
          [name, slug, imageUrl ?? null],
        ) as [any, any];
        const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [(result as any).insertId]) as [any[], any];
        res.status(201).json({ category: (rows as any[])[0] });
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + String(err) });
      }
    });

    app.put('/admin/categories/:id', authMiddleware, adminMiddleware, async (req, res) => {
      try {
        const { id } = req.params;
        const { name, slug, imageUrl } = req.body;
        await pool.query('UPDATE categories SET name=?, slug=?, imageUrl=? WHERE id=?', [name, slug, imageUrl ?? null, id]);
        const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]) as [any[], any];
        res.json({ category: (rows as any[])[0] });
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + String(err) });
      }
    });

    app.delete('/admin/categories/:id', authMiddleware, adminMiddleware, async (req, res) => {
      try {
        const [result] = await pool.query<ResultSetHeader>(
          'DELETE FROM categories WHERE id = ?',
          [req.params.id],
        );

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Không tìm thấy danh mục' });
        }

        res.json({ message: 'Đã xóa danh mục' });
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + String(err) });
      }
    });

    // ── ADMIN: PRODUCTS ──────────────────────────────────────
    // ✅ THÊM: CRUD sản phẩm đầy đủ cho admin (còn thiếu trong bản TS gốc)

    app.get('/admin/products', authMiddleware, adminMiddleware, async (req, res) => {
      try {
        const [rows] = await pool.query('SELECT * FROM Products ORDER BY id DESC') as [any[], any];
        res.json({ products: rows });
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + String(err) });
      }
    });

    app.post('/admin/products', authMiddleware, adminMiddleware, async (req, res) => {
      try {
        const { name, price, oldPrice, cat, imageUrl, isFlashSale, salePrice, priceValue } = req.body;
        if (!name) return res.status(400).json({ message: 'Tên sản phẩm là bắt buộc' });
        const [result] = await pool.query(
          'INSERT INTO Products (name, price, oldPrice, cat, imageUrl, isFlashSale, salePrice, priceValue) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [name, price ?? null, oldPrice ?? null, cat ?? null, imageUrl ?? null, isFlashSale ? 1 : 0, salePrice ?? null, priceValue ?? 0],
        ) as [any, any];
        const [rows] = await pool.query('SELECT * FROM Products WHERE id = ?', [(result as any).insertId]) as [any[], any];
        res.status(201).json({ product: (rows as any[])[0] });
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + String(err) });
      }
    });

    app.put('/admin/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
      try {
        const { id } = req.params;
        const { name, price, oldPrice, cat, imageUrl, isFlashSale, salePrice, priceValue } = req.body;
        await pool.query(
          'UPDATE Products SET name=?, price=?, oldPrice=?, cat=?, imageUrl=?, isFlashSale=?, salePrice=?, priceValue=? WHERE id=?',
          [name, price ?? null, oldPrice ?? null, cat ?? null, imageUrl ?? null, isFlashSale ? 1 : 0, salePrice ?? null, priceValue ?? 0, id],
        );
        const [rows] = await pool.query('SELECT * FROM Products WHERE id = ?', [id]) as [any[], any];
        res.json({ product: (rows as any[])[0] });
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + String(err) });
      }
    });

    app.delete('/admin/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
      try {
        await pool.query('DELETE FROM Products WHERE id = ?', [req.params.id]);
        res.json({ message: 'Đã xóa sản phẩm' });
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + String(err) });
      }
    });

    // ── PROMOTIONS ───────────────────────────────────────────
    // ✅ THÊM: toàn bộ hệ thống khuyến mãi (còn thiếu trong bản TS gốc)

    app.get('/promotions', async (req, res) => {
      try {
        const [rows] = await pool.query('SELECT * FROM promotions ORDER BY id DESC') as [any[], any];
        res.json({ promotions: (rows as any[]).map(r => ({ ...r, isActive: !!r.isActive })) });
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + String(err) });
      }
    });

    app.get('/promotions/active', async (req, res) => {
      try {
        const [rows] = await pool.query(
          `SELECT * FROM promotions WHERE isActive = 1 AND startDate <= CURDATE() AND endDate >= CURDATE() ORDER BY id DESC`,
        ) as [any[], any];
        res.json({ promotions: rows });
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server' });
      }
    });

    // ✅ SỬA: optionalAuthMiddleware — khách vãng lai vẫn kiểm tra/áp dụng được mã khuyến mãi
    app.post('/promotions/validate', optionalAuthMiddleware, async (req, res) => {
      try {
        const { code, orderTotal } = req.body;
        const [rows] = await pool.query(
          `SELECT * FROM promotions WHERE code = ? AND isActive = 1 AND startDate <= CURDATE() AND endDate >= CURDATE()`,
          [code],
        ) as [any[], any];
        if (!(rows as any[]).length) return res.status(404).json({ message: 'Mã không hợp lệ hoặc đã hết hạn' });
        const promo = (rows as any[])[0];
        if (promo.maxUsage > 0 && promo.usedCount >= promo.maxUsage) {
          return res.status(400).json({ message: 'Mã đã hết lượt sử dụng' });
        }
        if (orderTotal < promo.minOrderValue) {
          return res.status(400).json({ message: `Đơn hàng tối thiểu ${Number(promo.minOrderValue).toLocaleString('vi-VN')}đ` });
        }
        const discount = promo.discountType === 'percent'
          ? Math.round(orderTotal * promo.discountValue / 100)
          : promo.discountValue;
        res.json({ valid: true, promo: { ...promo, isActive: !!promo.isActive }, discount });
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server' });
      }
    });

    // Chỉ người dùng đã đăng nhập mới được ghi nhận lượt sử dụng mã.
    app.post('/promotions/use', authMiddleware, async (req, res) => {
      try {
        const code = cleanText(req.body?.code, 50).toUpperCase();
        if (!code) return res.status(400).json({ message: 'Thiếu mã khuyến mãi' });
        const [rows] = await pool.query(
          `SELECT * FROM promotions WHERE code = ? AND isActive = 1 AND startDate <= CURDATE() AND endDate >= CURDATE()`,
          [code],
        ) as [any[], any];
        if (!(rows as any[]).length) return res.status(404).json({ message: 'Mã không tồn tại' });
        const promo = (rows as any[])[0];
        if (Number(promo.maxUsage) > 0 && Number(promo.usedCount) >= Number(promo.maxUsage)) {
          return res.status(400).json({ message: 'Mã đã hết lượt sử dụng' });
        }
        const [result] = await pool.query(
          `UPDATE promotions SET usedCount = usedCount + 1
           WHERE code = ? AND isActive = 1 AND (maxUsage = 0 OR usedCount < maxUsage)`,
          [code],
        ) as [ResultSetHeader, any];
        if (!result.affectedRows) return res.status(409).json({ message: 'Mã vừa hết lượt sử dụng' });
        res.json({ message: 'Đã ghi nhận sử dụng mã' });
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server' });
      }
    });

    app.get('/admin/promotions', authMiddleware, adminMiddleware, async (req, res) => {
      try {
        const [rows] = await pool.query('SELECT * FROM promotions ORDER BY id DESC') as [any[], any];
        res.json({ promotions: (rows as any[]).map(r => ({ ...r, isActive: !!r.isActive })) });
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + String(err) });
      }
    });

    app.post('/admin/promotions', authMiddleware, adminMiddleware, async (req, res) => {
      try {
        const { code, description, discountType, discountValue, minOrderValue, maxUsage, startDate, endDate, isActive } = req.body;
        if (!code) return res.status(400).json({ message: 'Mã khuyến mãi là bắt buộc' });
        const [result] = await pool.query(
          `INSERT INTO promotions (code, description, discountType, discountValue, minOrderValue, maxUsage, startDate, endDate, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [code, description ?? null, discountType ?? 'percent', discountValue ?? 0, minOrderValue ?? 0, maxUsage ?? 0, startDate ?? null, endDate ?? null, isActive ? 1 : 0],
        ) as [any, any];
        const [rows] = await pool.query('SELECT * FROM promotions WHERE id = ?', [(result as any).insertId]) as [any[], any];
        res.status(201).json({ promotion: { ...(rows as any[])[0], isActive: !!(rows as any[])[0].isActive } });
      } catch (err) {
        if (String(err).includes('Duplicate')) return res.status(400).json({ message: 'Mã khuyến mãi đã tồn tại' });
        res.status(500).json({ message: 'Lỗi server: ' + String(err) });
      }
    });

    app.put('/admin/promotions/:id', authMiddleware, adminMiddleware, async (req, res) => {
      try {
        const { id } = req.params;
        const { code, description, discountType, discountValue, minOrderValue, maxUsage, startDate, endDate, isActive } = req.body;
        await pool.query(
          `UPDATE promotions SET code=?, description=?, discountType=?, discountValue=?, minOrderValue=?, maxUsage=?, startDate=?, endDate=?, isActive=? WHERE id=?`,
          [code, description ?? null, discountType, discountValue, minOrderValue, maxUsage, startDate ?? null, endDate ?? null, isActive ? 1 : 0, id],
        );
        const [rows] = await pool.query('SELECT * FROM promotions WHERE id = ?', [id]) as [any[], any];
        res.json({ promotion: { ...(rows as any[])[0], isActive: !!(rows as any[])[0].isActive } });
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + String(err) });
      }
    });

    app.patch('/admin/promotions/:id/toggle', authMiddleware, adminMiddleware, async (req, res) => {
      try {
        await pool.query('UPDATE promotions SET isActive = NOT isActive WHERE id = ?', [req.params.id]);
        const [rows] = await pool.query('SELECT * FROM promotions WHERE id = ?', [req.params.id]) as [any[], any];
        res.json({ promotion: { ...(rows as any[])[0], isActive: !!(rows as any[])[0].isActive } });
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + String(err) });
      }
    });

    app.delete('/admin/promotions/:id', authMiddleware, adminMiddleware, async (req, res) => {
      try {
        await pool.query('DELETE FROM promotions WHERE id = ?', [req.params.id]);
        res.json({ message: 'Đã xóa khuyến mãi' });
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + String(err) });
      }
    });

    // ── ADMIN: INVENTORY (kho hàng) ───────────────────────────
    // ✅ THÊM: toàn bộ module quản lý kho (còn thiếu trong bản TS gốc)

    app.get('/admin/inventory/stats', authMiddleware, adminMiddleware, async (req, res) => {
      try {
        const [[{ totalProducts }]] = await pool.query('SELECT COUNT(*) as totalProducts FROM Products') as any;
        const [[{ totalStock }]] = await pool.query('SELECT COALESCE(SUM(stock),0) as totalStock FROM Products') as any;
        const [[{ lowStock }]] = await pool.query('SELECT COUNT(*) as lowStock FROM Products WHERE stock < 20') as any;
        const [[{ flashSuggest }]] = await pool.query('SELECT COUNT(*) as flashSuggest FROM Products WHERE stock > 50') as any;

        const [[{ todayImport }]] = await pool.query(
          `SELECT COALESCE(SUM(quantity),0) as todayImport FROM inventory_logs
           WHERE type='import' AND DATE(createdAt)=CURDATE()`,
        ) as any;
        const [[{ todayExport }]] = await pool.query(
          `SELECT COALESCE(SUM(quantity),0) as todayExport FROM inventory_logs
           WHERE type='export' AND DATE(createdAt)=CURDATE()`,
        ) as any;

        const [weekChart] = await pool.query(
          `SELECT DATE(createdAt) as date, type, SUM(quantity) as total
           FROM inventory_logs
           WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
           GROUP BY DATE(createdAt), type
           ORDER BY date ASC`,
        ) as any;

        res.json({ totalProducts, totalStock, lowStock, flashSuggest, todayImport, todayExport, weekChart });
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + String(err) });
      }
    });

    app.get('/admin/inventory/products', authMiddleware, adminMiddleware, async (req, res) => {
      try {
        const [rows] = await pool.query(
          `SELECT p.*,
                  COALESCE(il_in.totalIn, 0)   AS totalIn,
                  COALESCE(il_out.totalOut, 0)  AS totalOut,
                  ifs.discountPct,
                  ifs.isActive AS fsActive
           FROM Products p
           LEFT JOIN (
               SELECT productId, SUM(quantity) as totalIn
               FROM inventory_logs WHERE type='import' GROUP BY productId
           ) il_in ON il_in.productId = p.id
           LEFT JOIN (
               SELECT productId, SUM(quantity) as totalOut
               FROM inventory_logs WHERE type IN ('export','flashsale') GROUP BY productId
           ) il_out ON il_out.productId = p.id
           LEFT JOIN inventory_flashsale ifs ON ifs.productId = p.id
           ORDER BY p.id DESC`,
        ) as [any[], any];
        res.json({ products: rows });
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + String(err) });
      }
    });

    app.post('/admin/inventory/import', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
      try {
        const { productId, quantity, price, supplier, note } = req.body;
        if (!productId || !quantity || quantity < 1) {
          return res.status(400).json({ message: 'productId và quantity là bắt buộc' });
        }
        const [products] = await pool.query('SELECT * FROM Products WHERE id = ?', [productId]) as [any[], any];
        if (!(products as any[]).length) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        await pool.query('UPDATE Products SET stock = stock + ? WHERE id = ?', [quantity, productId]);
        await pool.query(
          `INSERT INTO inventory_logs (productId, productName, type, quantity, price, supplier, note, createdBy)
           VALUES (?, ?, 'import', ?, ?, ?, ?, ?)`,
          [productId, (products as any[])[0].name, quantity, price ?? 0, supplier ?? null, note ?? null, req.userId],
        );
        const [updated] = await pool.query('SELECT * FROM Products WHERE id = ?', [productId]) as [any[], any];
        res.json({ message: `Nhập kho thành công ${quantity} ${(products as any[])[0].name}`, product: (updated as any[])[0] });
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + String(err) });
      }
    });

    app.post('/admin/inventory/export', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
      try {
        const { productId, quantity, receiver, reason, note } = req.body;
        if (!productId || !quantity || quantity < 1) {
          return res.status(400).json({ message: 'productId và quantity là bắt buộc' });
        }
        const [products] = await pool.query('SELECT * FROM Products WHERE id = ?', [productId]) as [any[], any];
        if (!(products as any[]).length) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        if ((products as any[])[0].stock < quantity) {
          return res.status(400).json({ message: `Không đủ hàng! Tồn kho: ${(products as any[])[0].stock}` });
        }
        await pool.query('UPDATE Products SET stock = stock - ? WHERE id = ?', [quantity, productId]);
        await pool.query(
          `INSERT INTO inventory_logs (productId, productName, type, quantity, receiver, note, createdBy)
           VALUES (?, ?, 'export', ?, ?, ?, ?)`,
          [productId, (products as any[])[0].name, quantity, receiver ?? null, `${reason ?? ''}${note ? ' - ' + note : ''}`, req.userId],
        );
        const [updated] = await pool.query('SELECT * FROM Products WHERE id = ?', [productId]) as [any[], any];
        res.json({ message: `Xuất kho thành công ${quantity} ${(products as any[])[0].name}`, product: (updated as any[])[0] });
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + String(err) });
      }
    });

    app.get('/admin/inventory/logs', authMiddleware, adminMiddleware, async (req, res) => {
      try {
        const type = req.query.type ? String(req.query.type) : undefined;
        const productId = req.query.product ? String(req.query.product) : undefined;
        const limit = req.query.limit ? parseInt(String(req.query.limit)) : 50;
        let query = `SELECT il.*, u.name as createdByName
                     FROM inventory_logs il
                     LEFT JOIN users u ON u.id = il.createdBy
                     WHERE 1=1`;
        const params: any[] = [];
        if (type) { query += ' AND il.type = ?'; params.push(type); }
        if (productId) { query += ' AND il.productId = ?'; params.push(productId); }
        query += ' ORDER BY il.createdAt DESC LIMIT ?';
        params.push(limit);
        const [rows] = await pool.query(query, params) as [any[], any];
        res.json({ logs: rows });
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + String(err) });
      }
    });

    app.post('/admin/inventory/flashsale/toggle', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
      try {
        const { productId, discountPct, active } = req.body;
        if (!productId) return res.status(400).json({ message: 'productId là bắt buộc' });
        const [products] = await pool.query('SELECT * FROM Products WHERE id = ?', [productId]) as [any[], any];
        if (!(products as any[]).length) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        await pool.query(
          `INSERT INTO inventory_flashsale (productId, discountPct, isActive, activatedAt)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             discountPct  = VALUES(discountPct),
             isActive     = VALUES(isActive),
             activatedAt  = VALUES(activatedAt)`,
          [productId, discountPct ?? 20, active ? 1 : 0, active ? new Date() : null],
        );
        if (active) {
          const salePrice = Math.round((products as any[])[0].price * (1 - (discountPct ?? 20) / 100));
          await pool.query(
            'UPDATE Products SET isFlashSale=1, salePrice=?, oldPrice=price WHERE id=?',
            [salePrice, productId],
          );
          await pool.query(
            `INSERT INTO inventory_logs (productId, productName, type, quantity, note, createdBy)
             VALUES (?, ?, 'flashsale', 0, ?, ?)`,
            [productId, (products as any[])[0].name, `Kích hoạt Flash Sale -${discountPct ?? 20}%`, req.userId],
          );
        } else {
          await pool.query('UPDATE Products SET isFlashSale=0 WHERE id=?', [productId]);
        }
        res.json({ message: active ? 'Đã kích hoạt Flash Sale' : 'Đã tắt Flash Sale' });
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + String(err) });
      }
    });

    app.put('/admin/inventory/products/:id/stock', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
      try {
        const { id } = req.params;
        const { stock, note } = req.body;
        if (stock === undefined || stock < 0) return res.status(400).json({ message: 'Stock không hợp lệ' });
        const [products] = await pool.query('SELECT * FROM Products WHERE id = ?', [id]) as [any[], any];
        if (!(products as any[]).length) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        const diff = stock - (products as any[])[0].stock;
        await pool.query('UPDATE Products SET stock = ? WHERE id = ?', [stock, id]);
        if (diff !== 0) {
          await pool.query(
            `INSERT INTO inventory_logs (productId, productName, type, quantity, note, createdBy)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, (products as any[])[0].name, diff > 0 ? 'import' : 'export',
             Math.abs(diff), note ?? 'Điều chỉnh thủ công', req.userId],
          );
        }
        const [updated] = await pool.query('SELECT * FROM Products WHERE id = ?', [id]) as [any[], any];
        res.json({ product: (updated as any[])[0] });
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + String(err) });
      }
    });

    // 404 handler
    app.use((req, res) => {
      console.log(`❌ 404: ${req.method} ${req.path}`);
      res.status(404).json({ message: `Endpoint không tìm thấy: ${req.path}` });
    });

    const port = Number(process.env.PORT ?? 3000);
    app.listen(port, "0.0.0.0", () => {
      console.log(`🚀 API đang chạy tại http://0.0.0.0:${port}`);
      console.log("✅ Tất cả routes đã được đăng ký");
    });
  } catch (err) {
    console.error("❌ Lỗi kết nối Supabase PostgreSQL:", (err as any).message);
    console.error("Stack:", (err as any).stack);
    process.exit(1);
  }
}

console.log("🔄 Đang khởi động server...");
startServer();
