const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const VALID_STATUSES = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];

// POST /api/orders  (logged-in users)
// Body: { "items": [ { "menu_item_id": 1, "quantity": 2 }, ... ] }
router.post('/', requireAuth, async (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item' });
  }

  for (const item of items) {
    if (
      !Number.isInteger(item.menu_item_id) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 50
    ) {
      return res.status(400).json({ error: 'Each item needs a valid menu_item_id and a quantity from 1 to 50' });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Look up real prices from the database
    const ids = items.map((i) => i.menu_item_id);
    const menu = await client.query(
      'SELECT id, price FROM menu_items WHERE id = ANY($1) AND available = TRUE',
      [ids]
    );
    const priceCents = new Map(menu.rows.map((m) => [m.id, Math.round(Number(m.price) * 100)]));

    let totalCents = 0;
    for (const item of items) {
      if (!priceCents.has(item.menu_item_id)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Menu item ${item.menu_item_id} is not available` });
      }
      totalCents += priceCents.get(item.menu_item_id) * item.quantity;
    }

    const orderResult = await client.query(
      'INSERT INTO orders (user_id, total) VALUES ($1, $2) RETURNING *',
      [req.user.id, totalCents / 100]
    );
    const order = orderResult.rows[0];

    for (const item of items) {
      await client.query(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [order.id, item.menu_item_id, item.quantity, priceCents.get(item.menu_item_id) / 100]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(order);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// GET /api/orders  (customers see their own orders, admins see all)
router.get('/', requireAuth, async (req, res) => {
  try {
    const result =
      req.user.role === 'admin'
        ? await pool.query('SELECT * FROM orders ORDER BY created_at DESC')
        : await pool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/orders/:id  (the order's owner or an admin)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    const order = orderResult.rows[0];

    if (!order || (order.user_id !== req.user.id && req.user.role !== 'admin')) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const itemsResult = await pool.query(
      `SELECT oi.menu_item_id, m.name, oi.quantity, oi.price
       FROM order_items oi
       JOIN menu_items m ON m.id = oi.menu_item_id
       WHERE oi.order_id = $1`,
      [order.id]
    );

    res.json({ ...order, items: itemsResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/orders/:id/status  (admin only)
router.patch('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/orders/:id/pay  (the order's owner only)
// Body: { "method": "cash" | "card" | "mobile_banking" }
// NOTE: this is a simulated payment. No real money is processed.
router.post('/:id/pay', requireAuth, async (req, res) => {
  try {
    const { method } = req.body;
    const VALID_METHODS = ['cash', 'card', 'mobile_banking'];

    if (!VALID_METHODS.includes(method)) {
      return res.status(400).json({ error: `Payment method must be one of: ${VALID_METHODS.join(', ')}` });
    }

    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    const order = orderResult.rows[0];

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.status === 'cancelled') {
      return res.status(400).json({ error: 'Cancelled orders cannot be paid' });
    }
    if (order.payment_status === 'paid') {
      return res.status(400).json({ error: 'Order is already paid' });
    }

    const result = await pool.query(
      `UPDATE orders SET payment_status = 'paid', payment_method = $1
       WHERE id = $2 RETURNING *`,
      [method, order.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;