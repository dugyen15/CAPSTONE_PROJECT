// Customer accounts: sign up, log in, view/update own profile.
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { HttpError, str } = require('../lib/http');
const { requireAuth, requireCustomer } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Used so a login for an unknown email takes as long as one for a real email.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

function publicCustomer(row) {
  return { id: row.id, name: row.name, email: row.email, phone: row.phone ?? null, role: 'customer' };
}

function createToken(id) {
  return jwt.sign({ id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/signup   { name, email, password, phone? }
router.post('/signup', authLimiter, async (req, res) => {
  const body = req.body ?? {};
  const name = str(body.name);
  const email = str(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const phone = str(body.phone) || null;

  if (!name || !email || !password) {
    throw new HttpError(400, 'Name, email and password are required');
  }
  if (name.length > 100) throw new HttpError(400, 'Name is too long');
  if (!EMAIL_RE.test(email) || email.length > 255) throw new HttpError(400, 'Enter a valid email address');
  if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
  if (password.length > 72) throw new HttpError(400, 'Password must be 72 characters or fewer');
  if (phone && phone.length > 30) throw new HttpError(400, 'Phone number is too long');

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const result = await pool.query(
      `INSERT INTO customers (name, email, password_hash, phone)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, phone`,
      [name, email, passwordHash, phone]
    );
    const user = publicCustomer(result.rows[0]);
    res.status(201).json({ user, token: createToken(user.id) });
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'Email is already registered');
    throw err;
  }
});

// POST /api/auth/login   { email, password }
router.post('/login', authLimiter, async (req, res) => {
  const body = req.body ?? {};
  const email = str(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    throw new HttpError(400, 'Email and password are required');
  }

  const result = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);
  const row = result.rows[0];
  const ok = await bcrypt.compare(password, row ? row.password_hash : DUMMY_HASH);

  // Same message for both cases so attackers can't tell which emails exist
  if (!row || !ok) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const user = publicCustomer(row);
  res.json({ user, token: createToken(user.id) });
});

// GET /api/auth/me
router.get('/me', requireAuth, requireCustomer, async (req, res) => {
  const result = await pool.query('SELECT id, name, email, phone, created_at FROM customers WHERE id = $1', [req.user.id]);
  if (result.rows.length === 0) throw new HttpError(401, 'Account no longer exists');
  const row = result.rows[0];
  res.json({ ...publicCustomer(row), memberSince: row.created_at });
});

// PATCH /api/auth/me   { name?, phone? }
router.patch('/me', requireAuth, requireCustomer, async (req, res) => {
  const body = req.body ?? {};
  const sets = [];
  const params = [];

  if (body.name !== undefined) {
    const name = str(body.name);
    if (!name || name.length > 100) throw new HttpError(400, 'Name must be 1 to 100 characters');
    params.push(name);
    sets.push(`name = $${params.length}`);
  }
  if (body.phone !== undefined) {
    const phone = str(body.phone) || null;
    if (phone && phone.length > 30) throw new HttpError(400, 'Phone number is too long');
    params.push(phone);
    sets.push(`phone = $${params.length}`);
  }
  if (sets.length === 0) throw new HttpError(400, 'Nothing to update');

  params.push(req.user.id);
  const result = await pool.query(
    `UPDATE customers SET ${sets.join(', ')} WHERE id = $${params.length}
     RETURNING id, name, email, phone`,
    params
  );
  if (result.rows.length === 0) throw new HttpError(401, 'Account no longer exists');
  res.json(publicCustomer(result.rows[0]));
});

module.exports = router;
