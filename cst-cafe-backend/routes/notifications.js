// Staff notifications (new orders, cancellations, delays, sold-out items).
const express = require('express');
const { pool } = require('../db');
const { HttpError, parseId } = require('../lib/http');
const { requireAuth, requireStaff } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireStaff);

const SELECT = `
  SELECT n.id, n.kind, n.title, n.message, n.read, n.created_at AS "createdAt",
         n.order_id AS "orderId", o.order_code AS "orderCode", n.menu_item_id AS "menuItemId"
  FROM staff_notifications n
  LEFT JOIN orders o ON o.id = n.order_id`;

// GET /api/notifications  (?unread=true for only unread)
router.get('/', async (req, res) => {
  const unreadOnly = req.query.unread === 'true';
  const [list, count] = await Promise.all([
    pool.query(`${SELECT} ${unreadOnly ? 'WHERE NOT n.read' : ''} ORDER BY n.created_at DESC, n.id DESC LIMIT 100`),
    pool.query('SELECT COUNT(*)::int AS n FROM staff_notifications WHERE NOT read'),
  ]);
  res.json({ unread: count.rows[0].n, items: list.rows });
});

// POST /api/notifications/read-all   (declared before /:id so it is not read as an id)
router.post('/read-all', async (req, res) => {
  const result = await pool.query('UPDATE staff_notifications SET read = TRUE WHERE NOT read');
  res.json({ updated: result.rowCount });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  const id = parseId(req.params.id);
  const result = await pool.query('UPDATE staff_notifications SET read = TRUE WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) throw new HttpError(404, 'Notification not found');
  res.json({ id, read: true });
});

module.exports = router;
