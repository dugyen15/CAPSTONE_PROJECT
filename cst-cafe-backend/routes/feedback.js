// Anonymous feedback: anyone can send it, staff can read it.
const express = require('express');
const { pool } = require('../db');
const { HttpError, str } = require('../lib/http');
const { requireAuth, requireStaff } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// POST /api/feedback  Body: { rating: 1-5, comment? }
router.post('/', authLimiter, async (req, res) => {
  const rating = Number(req.body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new HttpError(400, 'Rating must be a whole number from 1 to 5');
  }
  const comment = str(req.body?.comment);
  if (comment.length > 1000) throw new HttpError(400, 'Comment is too long');
  const result = await pool.query(
    'INSERT INTO feedback (rating, comment) VALUES ($1, $2) RETURNING id',
    [rating, comment || null]
  );
  res.status(201).json({ id: result.rows[0].id, message: 'Thank you for your feedback!' });
});

// GET /api/feedback  (staff)
router.get('/', requireAuth, requireStaff, async (req, res) => {
  const [list, stats] = await Promise.all([
    pool.query('SELECT id, rating, comment, created_at AS "createdAt" FROM feedback ORDER BY created_at DESC LIMIT 200'),
    pool.query('SELECT COUNT(*)::int AS count, ROUND(AVG(rating), 2) AS average FROM feedback'),
  ]);
  res.json({
    count: stats.rows[0].count,
    average: stats.rows[0].average === null ? null : Number(stats.rows[0].average),
    items: list.rows,
  });
});

module.exports = router;
