// Public cafe settings the frontend needs (for example the takeaway fee).
const express = require('express');
const { pool } = require('../db');

const router = express.Router();

// GET /api/settings
router.get('/', async (req, res) => {
  const result = await pool.query("SELECT value FROM settings WHERE key = 'takeaway_fee'");
  const fee = Number(result.rows[0]?.value);
  res.json({ takeawayFee: Number.isFinite(fee) ? fee : 0 });
});

module.exports = router;
