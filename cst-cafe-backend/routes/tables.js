// Cafe tables, and which ones are free at a given time.
const express = require('express');
const { pool } = require('../db');
const { HttpError, parseId, parseDate } = require('../lib/http');

const router = express.Router();

// GET /api/tables
// GET /api/tables?time=2026-10-15T12:30:00+06:00&duration=60&partySize=3
// With a time, each table also says whether it is free then ("available")
// and whether it is big enough for the party ("fits").
router.get('/', async (req, res) => {
  const tables = await pool.query('SELECT id, label, capacity FROM cafe_tables WHERE is_active ORDER BY id');

  if (!req.query.time) {
    return res.json(tables.rows);
  }

  const start = parseDate(req.query.time, 'time');
  const duration = req.query.duration === undefined ? 60 : Number(req.query.duration);
  if (!Number.isInteger(duration) || duration < 15 || duration > 240) {
    throw new HttpError(400, 'duration must be a whole number of minutes from 15 to 240');
  }
  const partySize = req.query.partySize === undefined ? null : parseId(req.query.partySize, 'partySize');

  const busy = await pool.query(
    `SELECT DISTINCT table_id FROM bookings
     WHERE status IN ('booked', 'seated')
       AND tstzrange(booking_time, booking_end, '[)') &&
           tstzrange($1::timestamptz, $1::timestamptz + make_interval(mins => $2), '[)')`,
    [start.toISOString(), duration]
  );
  const busyIds = new Set(busy.rows.map((r) => r.table_id));

  res.json(
    tables.rows.map((t) => ({
      ...t,
      available: !busyIds.has(t.id),
      fits: partySize === null ? true : t.capacity >= partySize,
    }))
  );
});

module.exports = router;
