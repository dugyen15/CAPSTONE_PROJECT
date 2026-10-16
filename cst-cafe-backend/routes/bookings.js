// Table bookings. The database refuses overlapping bookings for one table
// (exclusion constraint), which the error handler turns into a 409.
const express = require('express');
const { pool } = require('../db');
const { HttpError, parseId, str, pick, parseDate } = require('../lib/http');
const { requireAuth, requireCustomer, requireStaff } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const SELECT = `
  SELECT b.id, b.table_id AS "tableId", t.label AS "tableLabel", b.party_size AS "partySize",
         b.booking_time AS "time", b.duration_min AS "durationMin", b.booking_end AS "endTime",
         b.status, b.notes, b.customer_id AS "customerId", c.name AS "customerName",
         b.created_at AS "createdAt"
  FROM bookings b
  JOIN cafe_tables t ON t.id = b.table_id
  JOIN customers c ON c.id = b.customer_id`;

const STATUSES = ['booked', 'seated', 'completed', 'cancelled', 'no_show'];
const NEXT = {
  booked: ['seated', 'cancelled', 'no_show'],
  seated: ['completed'],
};

// POST /api/bookings  (customer)
// Body: { tableId, partySize, time, durationMin?, notes? }
router.post('/', requireCustomer, async (req, res) => {
  const body = req.body ?? {};
  const tableId = parseId(pick(body, 'tableId', 'table_id'), 'tableId');
  const partySize = parseId(pick(body, 'partySize', 'party_size'), 'partySize');
  const start = parseDate(pick(body, 'time', 'bookingTime', 'booking_time'), 'time');
  const duration = pick(body, 'durationMin', 'duration_min', 'duration') ?? 60;
  if (!Number.isInteger(duration) || duration < 15 || duration > 240) {
    throw new HttpError(400, 'Duration must be a whole number of minutes from 15 to 240');
  }
  if (start.getTime() < Date.now() - 5 * 60 * 1000) {
    throw new HttpError(400, 'Booking time must be in the future');
  }
  const notes = str(body.notes);
  if (notes.length > 500) throw new HttpError(400, 'Notes are too long');

  const table = await pool.query('SELECT capacity, is_active FROM cafe_tables WHERE id = $1', [tableId]);
  if (table.rows.length === 0 || !table.rows[0].is_active) throw new HttpError(404, 'Table not found');
  if (partySize > table.rows[0].capacity) {
    throw new HttpError(400, `That table seats ${table.rows[0].capacity} people at most`);
  }

  let inserted;
  try {
    inserted = await pool.query(
      `INSERT INTO bookings (customer_id, table_id, party_size, booking_time, duration_min, booking_end, notes)
       VALUES ($1, $2, $3, $4, $5, $4::timestamptz + make_interval(mins => $5), $6) RETURNING id`,
      [req.user.id, tableId, partySize, start.toISOString(), duration, notes || null]
    );
  } catch (err) {
    if (err.code === '23P01') throw new HttpError(409, 'That table is already booked at that time');
    throw err;
  }
  const result = await pool.query(`${SELECT} WHERE b.id = $1`, [inserted.rows[0].id]);
  res.status(201).json(result.rows[0]);
});

// GET /api/bookings  (customer: own bookings; staff: all, optional ?date=YYYY-MM-DD&status=)
router.get('/', async (req, res) => {
  const where = [];
  const params = [];
  if (req.user.role === 'customer') {
    params.push(req.user.id);
    where.push(`b.customer_id = $${params.length}`);
  } else {
    const status = str(req.query.status);
    if (status) {
      if (!STATUSES.includes(status)) throw new HttpError(400, 'Unknown status');
      params.push(status);
      where.push(`b.status = $${params.length}`);
    }
    const date = str(req.query.date);
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, 'date must be YYYY-MM-DD');
      params.push(date);
      where.push(`(b.booking_time AT TIME ZONE 'Asia/Thimphu')::date = $${params.length}::date`);
    }
  }
  const sql = `${SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY b.booking_time DESC LIMIT 200`;
  const result = await pool.query(sql, params);
  res.json(result.rows);
});

// POST /api/bookings/:id/cancel  (customer, own booking, only while still "booked")
router.post('/:id/cancel', requireCustomer, async (req, res) => {
  const id = parseId(req.params.id);
  const result = await pool.query(
    `UPDATE bookings SET status = 'cancelled'
     WHERE id = $1 AND customer_id = $2 AND status = 'booked' RETURNING id`,
    [id, req.user.id]
  );
  if (result.rows.length === 0) {
    const exists = await pool.query('SELECT status FROM bookings WHERE id = $1 AND customer_id = $2', [id, req.user.id]);
    if (exists.rows.length === 0) throw new HttpError(404, 'Booking not found');
    throw new HttpError(409, 'Only a booking that has not started can be cancelled');
  }
  const row = await pool.query(`${SELECT} WHERE b.id = $1`, [id]);
  res.json(row.rows[0]);
});

// PATCH /api/bookings/:id/status  (staff) Body: { status }
router.patch('/:id/status', requireStaff, async (req, res) => {
  const id = parseId(req.params.id);
  const status = str(req.body?.status);
  if (!STATUSES.includes(status)) throw new HttpError(400, 'Unknown status');
  const current = await pool.query('SELECT status FROM bookings WHERE id = $1', [id]);
  if (current.rows.length === 0) throw new HttpError(404, 'Booking not found');
  const from = current.rows[0].status;
  if (!(NEXT[from] || []).includes(status)) {
    throw new HttpError(409, `A ${from} booking cannot become ${status}`);
  }
  await pool.query('UPDATE bookings SET status = $1 WHERE id = $2', [status, id]);
  const row = await pool.query(`${SELECT} WHERE b.id = $1`, [id]);
  res.json(row.rows[0]);
});

module.exports = router;
