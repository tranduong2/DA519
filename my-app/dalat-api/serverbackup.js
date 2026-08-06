const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "123456",
  database: "DalatShop",
};

let pool;
const tokenToUserId = {}; // Store: token → userId

function createToken() {
  return crypto.randomUUID();
}

function mapUser(row, token) {
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? row.username ?? null,
    username: row.username ?? row.name ?? null,
    phone: row.phone ?? null,
    role: row.role ?? "user",
    token,
  };
}

// ✅ Middleware kiểm tra token
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token không hợp lệ" });
  }
  const token = authHeader.substring(7);
  const userId = tokenToUserId[token];
  if (!userId) {
    return res.status(401).json({ message: "Token không hợp lệ hoặc hết hạn" });
  }
  req.userId = userId;
  req.token = token;
  next();
}

// ✅ Middleware kiểm tra quyền admin
async function adminMiddleware(req, res, next) {
  try {
    const [rows] = await pool.query("SELECT role FROM users WHERE id = ?", [
      req.userId,
    ]);
    if (!rows[0] || rows[0].role !== "admin") {
      return res.status(403).json({ message: "Không có quyền admin" });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
}

async function startServer() {
  try {
    pool = await mysql.createPool(dbConfig);
    console.log("✅ Kết nối MySQL thành công!");
      // Ensure necessary user columns exist (role, banned)
      try {
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS banned TINYINT(1) DEFAULT 0");
        console.log('✅ Ensured user columns: role, banned');
      } catch (merr) {
        console.warn('Could not run user-column migrations:', merr.message);
      }

    // ✅ LOGIN
    app.post("/auth/login", async (req, res) => {
      try {
        const { email, password } = req.body;

        const [rows] = await pool.query(
          "SELECT * FROM users WHERE email = ? AND password = ?",
          [email, password],
        );

        if (rows.length === 0) {
          return res.status(401).json({ message: "Sai email hoặc mật khẩu" });
        }

        const token = createToken();
        tokenToUserId[token] = rows[0].id;

        console.log("🔐 /auth/login - db row:", rows[0]);
        const mappedUser = mapUser(rows[0], token);
        console.log("🔐 /auth/login - mapped user sent to client:", mappedUser);

        res.json({
          message: "Đăng nhập thành công",
          token,
          user: mappedUser,
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
      }
    });

    // ✅ REGISTER
    app.post("/auth/register", async (req, res) => {
      try {
        const { name, email, phone, password } = req.body;

        const [exist] = await pool.query(
          "SELECT id FROM users WHERE email = ?",
          [email],
        );

        if (exist.length > 0) {
          return res.status(400).json({ message: "Email đã tồn tại" });
        }

        await pool.query(
          "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)",
          [name, email, phone ?? "", password, "user"],
        );

        const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
          email,
        ]);
        const token = createToken();
        tokenToUserId[token] = rows[0].id;

        console.log("🆕 /auth/register - db row:", rows[0]);
        const mappedNewUser = mapUser(rows[0], token);
        console.log(
          "🆕 /auth/register - mapped user sent to client:",
          mappedNewUser,
        );

        res.json({
          message: "Đăng ký thành công",
          token,
          user: mappedNewUser,
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
      }
    });

    // ✅ LOGOUT
    app.post("/auth/logout", (req, res) => {
      const token = req.token;
      delete tokenToUserId[token];
      res.json({ message: "Đăng xuất thành công" });
    });

    // ✅ UPDATE PROFILE
    app.put("/auth/update-profile", async (req, res) => {
      try {
        const { email, username, address, phone } = req.body;

        await pool.query(
          `UPDATE users SET username = ?, address = ?, phone = ?, is_verified = true WHERE email = ?`,
          [username, address, phone, email],
        );

        res.json({ message: "Cập nhật thành công" });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi update profile" });
      }
    });

    // ✅ GET USER
    app.get("/user/:email", async (req, res) => {
      try {
        const { email } = req.params;

        const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
          email,
        ]);

        if (!rows[0]) {
          return res.status(404).json({ message: "Không tìm thấy user" });
        }

        res.json(rows[0]);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
      }
    });

    // ✅ PRODUCTS
    app.get("/products/flashsale", async (req, res) => {
      const [rows] = await pool.query(
        "SELECT * FROM Products WHERE isFlashSale = 1 ORDER BY RAND()",
      );
      res.json(rows);
    });

    app.get("/products/cat/:cat", async (req, res) => {
      const [rows] = await pool.query("SELECT * FROM Products WHERE cat = ?", [
        req.params.cat,
      ]);
      res.json(rows);
    });

    app.get("/products", async (req, res) => {
      const [rows] = await pool.query("SELECT * FROM Products");
      res.json(rows);
    });

    app.get("/products/:id", async (req, res) => {
      const [rows] = await pool.query("SELECT * FROM Products WHERE id = ?", [
        req.params.id,
      ]);
      if (!rows[0]) return res.status(404).json({ error: "Không tìm thấy" });
      res.json(rows[0]);
    });

    app.post("/products", async (req, res) => {
      const { name, price, oldPrice, cat, imageUrl } = req.body;
      const [result] = await pool.query(
        "INSERT INTO Products (name, price, oldPrice, cat, imageUrl) VALUES (?, ?, ?, ?, ?)",
        [name, price, oldPrice, cat, imageUrl],
      );
      const [rows] = await pool.query("SELECT * FROM Products WHERE id = ?", [
        result.insertId,
      ]);
      res.json(rows[0]);
    });

    // ✅ GET USER ORDERS
    app.get("/orders", authMiddleware, async (req, res) => {
      try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 20;
        const status = req.query.status;

        let query = "SELECT * FROM orders WHERE userId = ?";
        let params = [req.userId];

        if (status) {
          query += " AND status = ?";
          params.push(status);
        }

        query += " ORDER BY createdAt DESC LIMIT ?";
        params.push(limit);

        const [orders] = await pool.query(query, params);

        const ordersWithItems = await Promise.all(
          orders.map(async (order) => {
            const [items] = await pool.query(
              "SELECT * FROM order_items WHERE orderId = ?",
              [order.id],
            );
            return { ...order, items: items || [] };
          }),
        );

        res.json({ orders: ordersWithItems });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
      }
    });

    // ✅ GET ORDER BY ID
    app.get("/orders/:orderId", authMiddleware, async (req, res) => {
      try {
        const { orderId } = req.params;

        const [orders] = await pool.query(
          "SELECT * FROM orders WHERE id = ? AND userId = ?",
          [orderId, req.userId],
        );

        if (!orders || orders.length === 0) {
          return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
        }

        const [items] = await pool.query(
          "SELECT * FROM order_items WHERE orderId = ?",
          [orderId],
        );

        res.json({ order: { ...orders[0], items: items || [] } });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
      }
    });

    // ✅ CREATE ORDER
    app.post("/orders", authMiddleware, async (req, res) => {
      try {
        const {
          orderCode,
          items,
          totalAmount,
          paymentMethod,
          shippingAddress,
          estimatedDelivery,
        } = req.body;

        if (!items || items.length === 0) {
          return res.status(400).json({ message: "Đơn hàng phải có sản phẩm" });
        }

        const [result] = await pool.query(
          `INSERT INTO orders (userId, orderCode, totalAmount, status, paymentMethod, shippingAddress, estimatedDelivery, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            req.userId,
            orderCode,
            totalAmount,
            "pending",
            paymentMethod,
            shippingAddress,
            estimatedDelivery || null,
          ],
        );

        const orderId = result.insertId;

        for (const item of items) {
          await pool.query(
            `INSERT INTO order_items (orderId, productId, productName, price, quantity, note)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              orderId,
              item.productId,
              item.productName,
              item.price,
              item.quantity,
              item.note || null,
            ],
          );
        }

        const [orders] = await pool.query("SELECT * FROM orders WHERE id = ?", [
          orderId,
        ]);
        const [orderItems] = await pool.query(
          "SELECT * FROM order_items WHERE orderId = ?",
          [orderId],
        );

        res.status(201).json({
          message: "Đơn hàng được tạo thành công",
          order: { ...orders[0], items: orderItems },
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
      }
    });

    // ✅ UPDATE ORDER STATUS (user)
    app.put("/orders/:orderId", authMiddleware, async (req, res) => {
      try {
        const { orderId } = req.params;
        const { status, estimatedDelivery } = req.body;

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
        );

        if (!orderCheck || orderCheck.length === 0) {
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
        ]);
        const [items] = await pool.query(
          "SELECT * FROM order_items WHERE orderId = ?",
          [orderId],
        );

        res.json({
          message: "Cập nhật đơn hàng thành công",
          order: { ...orders[0], items },
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
      }
    });

    // ✅ CANCEL ORDER
    app.put("/orders/:orderId/cancel", authMiddleware, async (req, res) => {
      try {
        const { orderId } = req.params;

        const [orders] = await pool.query(
          "SELECT * FROM orders WHERE id = ? AND userId = ?",
          [orderId, req.userId],
        );

        if (!orders || orders.length === 0) {
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
        );
        const [items] = await pool.query(
          "SELECT * FROM order_items WHERE orderId = ?",
          [orderId],
        );

        res.json({
          message: "Đơn hàng đã được hủy",
          order: { ...updatedOrders[0], items },
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
      }
    });

    // ========================================
    // ✅ BULK ORDERS
    // ========================================

    // ✅ User tạo đơn hàng số lượng lớn
    app.post("/bulk-orders", authMiddleware, async (req, res) => {
      try {
        const { orderCode, orderDate, items, totalPrice } = req.body;

        if (!items || items.length === 0) {
          return res.status(400).json({ message: "Đơn hàng phải có sản phẩm" });
        }

        const [result] = await pool.query(
          `INSERT INTO bulk_orders (userId, orderCode, orderDate, totalPrice, status, createdAt)
           VALUES (?, ?, ?, ?, 'pending', NOW())`,
          [req.userId, orderCode, orderDate, totalPrice],
        );

        const bulkOrderId = result.insertId;

        for (const item of items) {
          await pool.query(
            `INSERT INTO bulk_order_items (bulkOrderId, productId, productName, kg, pricePerKg, subtotal, note)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              bulkOrderId,
              item.productId,
              item.productName,
              item.kg,
              item.pricePerKg,
              item.subtotal,
              item.note || null,
            ],
          );
        }

        const [orders] = await pool.query(
          "SELECT * FROM bulk_orders WHERE id = ?",
          [bulkOrderId],
        );
        const [orderItems] = await pool.query(
          "SELECT * FROM bulk_order_items WHERE bulkOrderId = ?",
          [bulkOrderId],
        );

        res.status(201).json({
          message: "Đơn hàng số lượng lớn đã được gửi đến Admin",
          order: { ...orders[0], items: orderItems },
        });
      } catch (err) {
        console.error("Bulk order error:", err);
        res.status(500).json({ message: "Lỗi server khi tạo đơn hàng" });
      }
    });

    // ✅ User xem danh sách bulk orders của mình
    app.get("/bulk-orders", authMiddleware, async (req, res) => {
      try {
        const [orders] = await pool.query(
          "SELECT * FROM bulk_orders WHERE userId = ? ORDER BY createdAt DESC",
          [req.userId],
        );

        const ordersWithItems = await Promise.all(
          orders.map(async (order) => {
            const [items] = await pool.query(
              "SELECT * FROM bulk_order_items WHERE bulkOrderId = ?",
              [order.id],
            );
            return { ...order, items: items || [] };
          }),
        );

        res.json({ orders: ordersWithItems });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
      }
    });

    // ✅ ADMIN - Xem tất cả bulk orders
    app.get(
      "/admin/bulk-orders",
      authMiddleware,
      adminMiddleware,
      async (req, res) => {
        try {
          const status = req.query.status;

          let query = `
          SELECT bo.*, u.name as userName, u.phone as userPhone, u.email as userEmail
          FROM bulk_orders bo
          JOIN users u ON bo.userId = u.id
        `;
          const params = [];

          if (status) {
            query += " WHERE bo.status = ?";
            params.push(status);
          }

          query += " ORDER BY bo.createdAt DESC";

          const [orders] = await pool.query(query, params);

          const ordersWithItems = await Promise.all(
            orders.map(async (order) => {
              const [items] = await pool.query(
                "SELECT * FROM bulk_order_items WHERE bulkOrderId = ?",
                [order.id],
              );
              return { ...order, items: items || [] };
            }),
          );

          res.json({ orders: ordersWithItems });
        } catch (err) {
          console.error(err);
          res.status(500).json({ message: "Lỗi server" });
        }
      },
    );

    // ✅ ADMIN - Cập nhật trạng thái bulk order
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
            id,
          ]);

          res.json({ message: "Cập nhật trạng thái thành công" });
        } catch (err) {
          console.error(err);
          res.status(500).json({ message: "Lỗi server" });
        }
      },
    );

    // ========================================
    // ✅ ADMIN ROUTES
    // ========================================

    // ✅ ADMIN - Lấy tất cả đơn hàng (có filter theo status)
    app.get(
      "/admin/orders",
      authMiddleware,
      adminMiddleware,
      async (req, res) => {
        try {
          const status = req.query.status;
          const limit = req.query.limit ? parseInt(req.query.limit) : 50;

          let query = `
          SELECT o.*, u.name as userName, u.phone as userPhone, u.email as userEmail
          FROM orders o
          JOIN users u ON o.userId = u.id
        `;
          const params = [];

          if (status) {
            query += " WHERE o.status = ?";
            params.push(status);
          }

          query += " ORDER BY o.createdAt DESC LIMIT ?";
          params.push(limit);

          const [orders] = await pool.query(query, params);

          const ordersWithItems = await Promise.all(
            orders.map(async (order) => {
              const [items] = await pool.query(
                "SELECT * FROM order_items WHERE orderId = ?",
                [order.id],
              );
              return { ...order, items: items || [] };
            }),
          );

          res.json({ orders: ordersWithItems });
        } catch (err) {
          console.error(err);
          res.status(500).json({ message: "Lỗi server" });
        }
      },
    );

    // ✅ ADMIN - Lấy chi tiết 1 đơn hàng
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
           JOIN users u ON o.userId = u.id
           WHERE o.id = ?`,
            [orderId],
          );

          if (!orders || orders.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
          }

          const [items] = await pool.query(
            "SELECT * FROM order_items WHERE orderId = ?",
            [orderId],
          );

          res.json({ order: { ...orders[0], items: items || [] } });
        } catch (err) {
          console.error(err);
          res.status(500).json({ message: "Lỗi server" });
        }
      },
    );

    // ✅ ADMIN - Cập nhật trạng thái đơn hàng
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
            "SELECT id FROM orders WHERE id = ?",
            [orderId],
          );
          if (!orderCheck || orderCheck.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
          }

          await pool.query(
            "UPDATE orders SET status = ?, updatedAt = NOW() WHERE id = ?",
            [status, orderId],
          );

          const [orders] = await pool.query(
            `SELECT o.*, u.name as userName, u.phone as userPhone, u.email as userEmail
           FROM orders o JOIN users u ON o.userId = u.id
           WHERE o.id = ?`,
            [orderId],
          );
          const [items] = await pool.query(
            "SELECT * FROM order_items WHERE orderId = ?",
            [orderId],
          );

          res.json({
            message: "Cập nhật trạng thái thành công",
            order: { ...orders[0], items },
          });
        } catch (err) {
          console.error(err);
          res.status(500).json({ message: "Lỗi server" });
        }
      },
    );

    // ✅ ADMIN - Thống kê tổng quan
    app.get(
      "/admin/stats",
      authMiddleware,
      adminMiddleware,
      async (req, res) => {
        try {
          const [[{ total }]] = await pool.query(
            "SELECT COUNT(*) as total FROM orders",
          );
          const [[{ pending }]] = await pool.query(
            "SELECT COUNT(*) as pending FROM orders WHERE status = 'pending'",
          );
          const [[{ confirmed }]] = await pool.query(
            "SELECT COUNT(*) as confirmed FROM orders WHERE status = 'confirmed'",
          );
          const [[{ delivered }]] = await pool.query(
            "SELECT COUNT(*) as delivered FROM orders WHERE status = 'delivered'",
          );
          const [[{ cancelled }]] = await pool.query(
            "SELECT COUNT(*) as cancelled FROM orders WHERE status = 'cancelled'",
          );
          const [[{ revenue }]] = await pool.query(
            "SELECT COALESCE(SUM(totalAmount), 0) as revenue FROM orders WHERE status = 'delivered'",
          );

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

    // ==========================
    // ADMIN - User management
    // ==========================

    // GET all users
    app.get('/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
      try {
        const [rows] = await pool.query('SELECT id, email, name, username, phone, role, banned FROM users ORDER BY id DESC');
        // normalize banned to boolean
        const users = rows.map(r => ({ ...r, banned: !!r.banned }));
        res.json({ users });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
      }
    });

    // POST create user
    app.post('/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
      try {
        const { name, email, phone, role, banned, password } = req.body;
        if (!email) return res.status(400).json({ message: 'Email là bắt buộc' });
        const pwd = password ?? '';
        await pool.query('INSERT INTO users (name, email, phone, password, role, banned) VALUES (?, ?, ?, ?, ?, ?)', [name ?? null, email, phone ?? null, pwd, role ?? 'user', banned ? 1 : 0]);
        const [rows] = await pool.query('SELECT id, email, name, username, phone, role, banned FROM users WHERE email = ?', [email]);
        res.status(201).json({ user: { ...rows[0], banned: !!rows[0].banned } });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
      }
    });

    // PUT update user
    app.put('/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
      try {
        const { id } = req.params;
        const { name, email, phone, role, banned } = req.body;

        const [[target]] = await pool.query('SELECT id, role FROM users WHERE id = ?', [id]);
        if (!target) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

        // Prevent changing other admins' role
        if (target.role === 'admin' && Number(id) !== Number(req.userId) && role && role !== 'admin') {
          return res.status(403).json({ message: 'Không được thay đổi role của admin khác' });
        }

      // ✅ Sửa thành
const updates = [];
const params = [];
        if (name !== undefined) { updates.push('name = ?'); params.push(name); }
        if (email !== undefined) { updates.push('email = ?'); params.push(email); }
        if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
        if (role !== undefined) { updates.push('role = ?'); params.push(role); }
        if (banned !== undefined) { updates.push('banned = ?'); params.push(banned ? 1 : 0); }

        if (updates.length === 0) return res.status(400).json({ message: 'Không có trường để cập nhật' });

        params.push(id);
        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        await pool.query(sql, params);

        const [rows] = await pool.query('SELECT id, email, name, username, phone, role, banned FROM users WHERE id = ?', [id]);
        res.json({ user: { ...rows[0], banned: !!rows[0].banned } });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
      }
    });

    // DELETE user
    app.delete('/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
      try {
        const { id } = req.params;
        const [[target]] = await pool.query('SELECT id, role FROM users WHERE id = ?', [id]);
        if (!target) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        if (target.role === 'admin' && Number(id) !== Number(req.userId)) {
          return res.status(403).json({ message: 'Không được xóa admin khác' });
        }
        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'Đã xóa người dùng' });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
      }
    });

    // POST ban/unban user
    app.post('/admin/users/:id/ban', authMiddleware, adminMiddleware, async (req, res) => {
      try {
        const { id } = req.params;
        const { banned } = req.body;
        const [[target]] = await pool.query('SELECT id, role FROM users WHERE id = ?', [id]);
        if (!target) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        if (target.role === 'admin' && Number(id) !== Number(req.userId)) {
          return res.status(403).json({ message: 'Không được cấm admin khác' });
        }
        await pool.query('UPDATE users SET banned = ? WHERE id = ?', [banned ? 1 : 0, id]);
        res.json({ message: banned ? 'Đã cấm người dùng' : 'Đã bỏ cấm người dùng' });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
      }
    });

    // 404 handler
    app.use((req, res) => {
      console.log(`❌ 404: ${req.method} ${req.path}`);
      res.status(404).json({ message: `Endpoint không tìm thấy: ${req.path}` });
    });

    app.listen(3000, "0.0.0.0", () => {
      console.log("🚀 API đang chạy tại http://0.0.0.0:3000");
      console.log("✅ Tất cả routes đã được đăng ký");
    });
  } catch (err) {
    console.error("❌ Lỗi kết nối MySQL:", err.message);
    console.error("Stack:", err.stack);
    process.exit(1);
  }
}

console.log("🔄 Đang khởi động server...");
startServer();
