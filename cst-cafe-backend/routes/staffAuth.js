// Staff accounts: sign up (needs the cafe's invite code), log in, own profile.
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { HttpError, str, pick } = require('../lib/http');
const { requireAuth, requireStaff } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

function publicStaff(row) {
  return { id: row.id, name: row.name, email: row.email, avatarUrl: row.avatar_url ?? null, role: 'staff' };
}

function createToken(id) {
  return jwt.sign({ id, role: 'staff' }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function inviteCodeMatches(given) {
  const expected = process.env.STAFF_INVITE_CODE;
  const a = Buffer.from(String(given ?? ''));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// POST /api/staff/auth/signup   { name, email, password, inviteCode }
// Anyone can open the staff signup page, so signing up needs the secret invite code
// that the cafe manager sets in STAFF_INVITE_CODE. Without it, nobody can become staff.
router.post('/signup', authLimiter, async (req, res) => {
  if (!process.env.STAFF_INVITE_CODE) {
    throw new HttpError(403, 'Staff signup is turned off. Ask the cafe manager to set an invite code.');
  }

  const body = req.body ?? {};
  const name = str(body.name);
  const email = str(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const inviteCode = pick(body, 'inviteCode', 'invite_code');

  if (!name || !email || !password) {
    throw new HttpError(400, 'Name, email and password are required');
  }
  if (name.length > 100) throw new HttpError(400, 'Name is too long');
  if (!EMAIL_RE.test(email) || email.length > 255) throw new HttpError(400, 'Enter a valid email address');
  if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
  if (password.length > 72) throw new HttpError(400, 'Password must be 72 characters or fewer');
  if (!inviteCodeMatches(inviteCode)) {
    throw new HttpError(403, 'Invalid invite code');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const result = await pool.query(
      `INSERT INTO staff (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, avatar_url`,
      [name, email, passwordHash]
    );
    const user = publicStaff(result.rows[0]);
    res.status(201).json({ user, token: createToken(user.id) });
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'Email is already registered');
    throw err;
  }
});

// POST /api/staff/auth/login   { email, password }
router.post('/login', authLimiter, async (req, res) => {
  const body = req.body ?? {};
  const email = str(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    throw new HttpError(400, 'Email and password are required');
  }

  const result = await pool.query('SELECT * FROM staff WHERE email = $1', [email]);
  const row = result.rows[0];
  const ok = await bcrypt.compare(password, row ? row.password_hash : DUMMY_HASH);

  if (!row || !ok) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const user = publicStaff(row);
  res.json({ user, token: createToken(user.id) });
});

// GET /api/staff/auth/me
router.get('/me', requireAuth, requireStaff, async (req, res) => {
  const result = await pool.query('SELECT id, name, email, avatar_url FROM staff WHERE id = $1', [req.user.id]);
  if (result.rows.length === 0) throw new HttpError(401, 'Account no longer exists');
  res.json(publicStaff(result.rows[0]));
});

// PATCH /api/staff/auth/me   { name?, avatarUrl? }
router.patch('/me', requireAuth, requireStaff, async (req, res) => {
  const body = req.body ?? {};
  const sets = [];
  const params = [];

  if (body.name !== undefined) {
    const name = str(body.name);
    if (!name || name.length > 100) throw new HttpError(400, 'Name must be 1 to 100 characters');
    params.push(name);
    sets.push(`name = $${params.length}`);
  }
  const avatar = pick(body, 'avatarUrl', 'avatar_url');
  if (avatar !== undefined) {
    const url = str(avatar) || null;
    if (url && url.length > 2000) throw new HttpError(400, 'Avatar URL is too long');
    params.push(url);
    sets.push(`avatar_url = $${params.length}`);
  }
  if (sets.length === 0) throw new HttpError(400, 'Nothing to update');

  params.push(req.user.id);
  const result = await pool.query(
    `UPDATE staff SET ${sets.join(', ')} WHERE id = $${params.length}
     RETURNING id, name, email, avatar_url`,
    params
  );
  if (result.rows.length === 0) throw new HttpError(401, 'Account no longer exists');
  res.json(publicStaff(result.rows[0]));
});

module.exports = router;
