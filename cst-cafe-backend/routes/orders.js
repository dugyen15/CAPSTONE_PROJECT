const express = require('express');
const { pool, tx } = require('../db');
const { HttpError, parseId, str, pick } = require('../lib/http');
const { requireAuth, requireCustomer, requireStaff } = require('../middleware/auth');

const router = express.Router();

// Orders move forward one step at a time. "Delayed" is a flag (see /delayed), not a step.
const NEXT_STATUSES = {
  waiting: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

// Which timestamp column to fill in when an order reaches a status.
const STATUS_TIMESTAMP = {
  preparing: 'confirmed_at',
  ready: 'ready_at',
  completed: 'completed_at',
  cancelled: 'cancelled_at',
};

// One order, in the same shape the frontend uses (id is the "ORD-0142" code).
// A delayed order reports status "delayed", like the frontend's status badges expect.
const ORDER_SELECT = `
  SELECT o.id AS "dbId",
         o.order_code AS id,
         o.queue_number AS "queueNumber",
         CASE WHEN o.is_delayed THEN 'delayed' ELSE o.status::text END AS status,
         o.status::text AS "rawStatus",
         o.is_delayed AS "isDelayed",
         o.order_type::text AS "orderType",
         o.table_id AS "tableId",
         t.label AS "table",
         o.subtotal,
         o.takeaway_fee AS "takeawayFee",
         o.total,
         o.is_paid AS "isPaid",
         o.notes,
         o.created_at AS "createdAt",
         o.confirmed_at AS "confirmedAt",
         o.ready_at AS "readyAt",
         o.completed_at AS "completedAt",
         o.cancelled_at AS "cancelledAt",
         c.id AS "customerId",
         c.name AS customer,
         (SELECT COUNT(*)::int FROM orders o2
           WHERE o.status IN ('waiting', 'preparing')
             AND o2.status IN ('waiting', 'preparing')
             AND o2.created_at < o.created_at) AS "aheadInQueue",
         COALESCE((
           SELECT json_agg(json_build_object(
                    'id', oi.id,
                    'menuItemId', oi.menu_item_id,
                    'name', oi.item_name,
                    'price', oi.unit_price,
                    'qty', oi.qty) ORDER BY oi.id)
           FROM order_items oi WHERE oi.order_id = o.id
         ), '[]'::json) AS items
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  LEFT JOIN cafe_tables t ON t.id = o.table_id`;

async function fetchOrders(db, whereSql, params, orderBy = 'o.created_at DESC', limit = 200) {
  const result = await db.query(
    `${ORDER_SELECT} ${whereSql ? `WHERE ${whereSql}` : ''} ORDER BY ${orderBy} LIMIT ${limit}`,
    params
  );
  return result.rows;
}

// Orders can be looked up by their code ("ORD-0142") or by plain number.
function orderKey(param) {
  const s = str(param);
  if (/^\d+$/.test(s)) return { sql: 'o.id = $1', value: parseId(s, 'order id') };
  if (/^ORD-\d+$/i.test(s)) return { sql: 'o.order_code = $1', value: s.toUpperCase() };
  throw new HttpError(400, 'Invalid order id');
}

function normaliseItems(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new HttpError(400, 'Order must contain at least one item');
  }
  if (raw.length > 50) throw new HttpError(400, 'Too many items in one order');

  const merged = new Map();
  for (const item of raw) {
    const id = pick(item, 'menuItemId', 'menu_item_id', 'id');
    const quantity = pick(item, 'quantity', 'qty');
    if (!Number.isInteger(id) || id < 1 || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      throw new HttpError(400, 'Each item needs a menuItemId and a quantity from 1 to 50');
    }
    merged.set(id, (merged.get(id) || 0) + quantity);
  }
  for (const [, quantity] of merged) {
    if (quantity > 50) throw new HttpError(400, 'You can order at most 50 of one item');
  }
  return [...merged].map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
}

// POST /api/orders   (customers)
// Body: { items: [{ menuItemId, quantity }], orderType: "dine-in" | "takeaway", tableId?, notes? }
// Prices, the takeaway fee, the queue number and the order code are all decided here
// on the server, never taken from the browser.
router.post('/', requireAuth, requireCustomer, async (req, res) => {
  const body = req.body ?? {};
  const orderType = pick(body, 'orderType', 'order_type');
  if (!['dine-in', 'takeaway'].includes(orderType)) {
    throw new HttpError(400, 'orderType must be "dine-in" or "takeaway"');
  }
  const items = normaliseItems(body.items);
  const notes = str(body.notes) || null;
  if (notes && notes.length > 500) throw new HttpError(400, 'Notes are too long');
  const tableIdRaw = pick(body, 'tableId', 'table_id');

  const orderDbId = await tx(async (client) => {
    // Only one order at a time picks a queue number, so two customers can't get the same one.
    await client.query('SELECT pg_advisory_xact_lock(4242)');

    // Real prices from the database
    const menu = await client.query(
      'SELECT id, price FROM menu_items WHERE id = ANY($1::int[]) AND is_available',
      [items.map((i) => i.menuItemId)]
    );
    const menuById = new Map(menu.rows.map((m) => [m.id, m]));

    let subtotalCents = 0;
    for (const item of items) {
      const m = menuById.get(item.menuItemId);
      if (!m) throw new HttpError(400, `Menu item ${item.menuItemId} is not available`);
      subtotalCents += Math.round(m.price * 100) * item.quantity;
    }

    // Takeaway fee comes from the settings table
    let feeCents = 0;
    if (orderType === 'takeaway') {
      const s = await client.query("SELECT value FROM settings WHERE key = 'takeaway_fee'");
      const fee = Number(s.rows[0]?.value);
      feeCents = Number.isFinite(fee) && fee > 0 ? Math.round(fee * 100) : 0;
    }

    // Dine-in needs a table: the one passed in, or the one this customer has booked right now
    let table = null;
    if (orderType === 'dine-in') {
      if (tableIdRaw !== undefined && tableIdRaw !== null && tableIdRaw !== '') {
        const t = await client.query('SELECT id, label FROM cafe_tables WHERE id = $1 AND is_active', [
          parseId(tableIdRaw, 'tableId'),
        ]);
        if (t.rows.length === 0) throw new HttpError(400, 'That table is not available');
        table = t.rows[0];
      } else {
        const b = await client.query(
          `SELECT t.id, t.label
           FROM bookings b JOIN cafe_tables t ON t.id = b.table_id
           WHERE b.customer_id = $1 AND b.status IN ('booked', 'seated')
             AND now() BETWEEN b.booking_time - interval '30 minutes' AND b.booking_end
           ORDER BY b.booking_time LIMIT 1`,
          [req.user.id]
        );
        if (b.rows.length === 0) {
          throw new HttpError(400, 'Dine-in orders need a table. Book a table first, choose one, or switch to takeaway.');
        }
        table = b.rows[0];
      }
    }

    // Smallest queue number not used by an order that is still active
    const q = await client.query(
      `SELECT g AS n
       FROM generate_series(1, (SELECT COALESCE(MAX(queue_number), 0) + 1 FROM orders
                                WHERE status NOT IN ('completed', 'cancelled'))) g
       WHERE g NOT IN (SELECT queue_number FROM orders WHERE status NOT IN ('completed', 'cancelled'))
       ORDER BY g LIMIT 1`
    );
    const queueNumber = q.rows[0].n;

    // Order code like ORD-0142, built from the order's own id
    const idRow = await client.query("SELECT nextval(pg_get_serial_sequence('orders', 'id')) AS id");
    const orderId = idRow.rows[0].id;
    const orderCode = `ORD-${String(orderId).padStart(4, '0')}`;

    await client.query(
      `INSERT INTO orders (id, order_code, queue_number, customer_id, table_id, order_type,
                           subtotal, takeaway_fee, total, notes)
       VALUES ($1, $2, $3, $4, $5, $6::order_type, $7, $8, $9, $10)`,
      [
        orderId,
        orderCode,
        queueNumber,
        req.user.id,
        table ? table.id : null,
        orderType,
        subtotalCents / 100,
        feeCents / 100,
        (subtotalCents + feeCents) / 100,
        notes,
      ]
    );

    // Copy the name and price into the order, so later menu changes don't rewrite history
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, menu_item_id, item_name, unit_price, qty)
         SELECT $1, id, name, price, $3 FROM menu_items WHERE id = $2`,
        [orderId, item.menuItemId, item.quantity]
      );
    }

    // If this customer booked that table, link the booking to the order
    if (table) {
      await client.query(
        `UPDATE bookings SET order_id = $1
         WHERE id = (SELECT id FROM bookings
                     WHERE customer_id = $2 AND table_id = $3 AND status IN ('booked', 'seated')
                       AND order_id IS NULL
                       AND now() BETWEEN booking_time - interval '30 minutes' AND booking_end
                     ORDER BY booking_time LIMIT 1)`,
        [orderId, req.user.id, table.id]
      );
    }

    const count = items.reduce((sum, i) => sum + i.quantity, 0);
    await client.query(
      `INSERT INTO staff_notifications (kind, title, message, order_id)
       VALUES ('new_order', 'New order', $1, $2)`,
      [`${orderCode} placed for ${table ? table.label : 'takeaway'} — ${count} ${count === 1 ? 'item' : 'items'}.`, orderId]
    );

    return orderId;
  });

  const [order] = await fetchOrders(pool, 'o.id = $1', [orderDbId]);
  res.status(201).json(order);
});

// GET /api/orders
// Customers see their own orders (newest first). Staff see the live queue (oldest first).
// Add ?scope=all to include finished orders, or ?scope=active for only unfinished ones.
router.get('/', requireAuth, async (req, res) => {
  const isStaff = req.user.role === 'staff';
  const scope = str(req.query.scope) || (isStaff ? 'active' : 'all');
  if (!['active', 'all'].includes(scope)) throw new HttpError(400, 'scope must be "active" or "all"');

  const where = [];
  const params = [];
  if (!isStaff) {
    params.push(req.user.id);
    where.push(`o.customer_id = $${params.length}`);
  }
  if (scope === 'active') where.push("o.status NOT IN ('completed', 'cancelled')");

  const orders = await fetchOrders(
    pool,
    where.join(' AND '),
    params,
    isStaff && scope === 'active' ? 'o.created_at ASC' : 'o.created_at DESC'
  );
  res.json(orders);
});

// GET /api/orders/:id   (the order's owner, or staff)
router.get('/:id', requireAuth, async (req, res) => {
  const key = orderKey(req.params.id);
  const params = [key.value];
  let where = key.sql;
  if (req.user.role === 'customer') {
    params.push(req.user.id);
    where += ` AND o.customer_id = $${params.length}`;
  }
  const [order] = await fetchOrders(pool, where, params);
  // Someone else's order looks the same as one that doesn't exist
  if (!order) throw new HttpError(404, 'Order not found');
  res.json(order);
});

// PATCH /api/orders/:id/status   (staff)   { status: "preparing" | "ready" | "completed" | "cancelled" }
router.patch('/:id/status', requireAuth, requireStaff, async (req, res) => {
  const key = orderKey(req.params.id);
  const next = str(req.body?.status);
  if (!Object.keys(STATUS_TIMESTAMP).includes(next)) {
    throw new HttpError(400, 'status must be one of: preparing, ready, completed, cancelled');
  }

  const orderDbId = await tx(async (client) => {
    const found = await client.query(`SELECT o.id, o.status::text AS status FROM orders o WHERE ${key.sql} FOR UPDATE`, [
      key.value,
    ]);
    if (found.rows.length === 0) throw new HttpError(404, 'Order not found');
    const current = found.rows[0];

    if (!NEXT_STATUSES[current.status].includes(next)) {
      throw new HttpError(409, `An order that is ${current.status} cannot be changed to ${next}`);
    }

    // The column name comes from the fixed list above, never from the request.
    const column = STATUS_TIMESTAMP[next];
    await client.query(
      `UPDATE orders SET status = $1::order_status, is_delayed = FALSE, ${column} = now() WHERE id = $2`,
      [next, current.id]
    );
    return current.id;
  });

  const [order] = await fetchOrders(pool, 'o.id = $1', [orderDbId]);
  res.json(order);
});

// POST /api/orders/:id/cancel   (the customer who placed it, only while it is still "waiting")
router.post('/:id/cancel', requireAuth, requireCustomer, async (req, res) => {
  const key = orderKey(req.params.id);

  const orderDbId = await tx(async (client) => {
    const found = await client.query(
      `SELECT o.id, o.order_code, o.status::text AS status
       FROM orders o WHERE ${key.sql} AND o.customer_id = $2 FOR UPDATE`,
      [key.value, req.user.id]
    );
    if (found.rows.length === 0) throw new HttpError(404, 'Order not found');
    const current = found.rows[0];

    if (current.status !== 'waiting') {
      throw new HttpError(409, 'The kitchen has already started this order, so it can no longer be cancelled here. Please ask staff.');
    }

    await client.query(
      "UPDATE orders SET status = 'cancelled', is_delayed = FALSE, cancelled_at = now() WHERE id = $1",
      [current.id]
    );
    await client.query(
      `INSERT INTO staff_notifications (kind, title, message, order_id)
       VALUES ('order_cancelled', 'Order cancelled', $1, $2)`,
      [`${current.order_code} was cancelled by the customer.`, current.id]
    );
    return current.id;
  });

  const [order] = await fetchOrders(pool, 'o.id = $1', [orderDbId]);
  res.json(order);
});

// POST /api/orders/:id/pickup   (the customer who placed it, only once it is "ready")
// The customer confirms they have received their order, which completes it.
router.post('/:id/pickup', requireAuth, requireCustomer, async (req, res) => {
  const key = orderKey(req.params.id);

  const orderDbId = await tx(async (client) => {
    const found = await client.query(
      `SELECT o.id, o.status::text AS status
       FROM orders o WHERE ${key.sql} AND o.customer_id = $2 FOR UPDATE`,
      [key.value, req.user.id]
    );
    if (found.rows.length === 0) throw new HttpError(404, 'Order not found');
    const current = found.rows[0];

    if (current.status !== 'ready') {
      throw new HttpError(409, 'This order is not ready for pickup yet.');
    }
    await client.query(
      "UPDATE orders SET status = 'completed', is_delayed = FALSE, completed_at = now() WHERE id = $1",
      [current.id]
    );
    return current.id;
  });

  const [order] = await fetchOrders(pool, 'o.id = $1', [orderDbId]);
  res.json(order);
});

// PATCH /api/orders/:id/delayed   (staff)   { isDelayed: true | false }
router.patch('/:id/delayed', requireAuth, requireStaff, async (req, res) => {
  const key = orderKey(req.params.id);
  const flag = pick(req.body ?? {}, 'isDelayed', 'is_delayed');
  if (typeof flag !== 'boolean') throw new HttpError(400, 'isDelayed must be true or false');

  const orderDbId = await tx(async (client) => {
    const found = await client.query(
      `SELECT o.id, o.order_code, o.status::text AS status, o.is_delayed
       FROM orders o WHERE ${key.sql} FOR UPDATE`,
      [key.value]
    );
    if (found.rows.length === 0) throw new HttpError(404, 'Order not found');
    const current = found.rows[0];

    if (['completed', 'cancelled'].includes(current.status)) {
      throw new HttpError(409, 'Finished orders cannot be marked delayed');
    }

    if (current.is_delayed !== flag) {
      await client.query('UPDATE orders SET is_delayed = $1 WHERE id = $2', [flag, current.id]);
      if (flag) {
        await client.query(
          `INSERT INTO staff_notifications (kind, title, message, order_id)
           VALUES ('order_delayed', 'Order delayed', $1, $2)`,
          [`${current.order_code} is running behind schedule.`, current.id]
        );
      }
    }
    return current.id;
  });

  const [order] = await fetchOrders(pool, 'o.id = $1', [orderDbId]);
  res.json(order);
});

// PATCH /api/orders/:id/payment   (staff)   { isPaid: true | false }
// Staff mark an order as paid at the counter. No real payment is processed.
router.patch('/:id/payment', requireAuth, requireStaff, async (req, res) => {
  const key = orderKey(req.params.id);
  const flag = pick(req.body ?? {}, 'isPaid', 'is_paid');
  if (typeof flag !== 'boolean') throw new HttpError(400, 'isPaid must be true or false');

  const updated = await pool.query(
    `UPDATE orders o SET is_paid = $2
     WHERE ${key.sql} AND o.status <> 'cancelled'
     RETURNING o.id`,
    [key.value, flag]
  );
  if (updated.rows.length === 0) {
    const exists = await pool.query(`SELECT 1 FROM orders o WHERE ${key.sql}`, [key.value]);
    if (exists.rows.length === 0) throw new HttpError(404, 'Order not found');
    throw new HttpError(409, 'Cancelled orders cannot be marked as paid');
  }

  const [order] = await fetchOrders(pool, 'o.id = $1', [updated.rows[0].id]);
  res.json(order);
});

module.exports = router;
