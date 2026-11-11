const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { pool } = require('../db');
const { HttpError, str } = require('../lib/http');

const { requireAuth, requireAdmin } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

function createToken(id) {
  return jwt.sign(
    { id, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function publicAdmin(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: 'admin',
  };
}

function hashCode(code) {
  return crypto
    .createHash('sha256')
    .update(code)
    .digest('hex');
}

// ======================================
// ADMIN LOGIN
// POST /api/admin/auth/login
// ======================================

router.post('/login', authLimiter, async (req, res) => {
  const body = req.body ?? {};

  const email = str(body.email).toLowerCase();
  const password =
    typeof body.password === 'string'
      ? body.password
      : '';

  if (!email || !password) {
    throw new HttpError(400, 'Email and password are required');
  }

  const result = await pool.query(
    `SELECT id, name, email, password_hash
     FROM admins
     WHERE email = $1`,
    [email]
  );

  const row = result.rows[0];

  const validPassword = await bcrypt.compare(
    password,
    row ? row.password_hash : DUMMY_HASH
  );

  if (!row || !validPassword) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const user = publicAdmin(row);

  res.json({
    message: 'Admin login successful',
    user,
    token: createToken(user.id),
  });
});

// ======================================
// VERIFY ADMIN SESSION
// GET /api/admin/auth/me
// ======================================

router.get(
  '/me',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const result = await pool.query(
      `SELECT id, name, email
       FROM admins
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      throw new HttpError(401, 'Admin account no longer exists');
    }

    res.json({
      user: publicAdmin(result.rows[0]),
    });
  }
);

// ======================================
// GENERATE STAFF INVITATION
// POST /api/admin/auth/invitations
// ADMIN ONLY
// ======================================

router.post(
  '/invitations',
  requireAuth,
  requireAdmin,
  authLimiter,
  async (req, res) => {
    const email = str(req.body?.email).toLowerCase();

    if (!email || !EMAIL_RE.test(email) || email.length > 255) {
      throw new HttpError(400, 'Enter a valid email address');
    }

    // Check whether the email already belongs to staff.
    const existing = await pool.query(
      'SELECT id FROM staff WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      throw new HttpError(
        409,
        'This email is already registered as staff'
      );
    }

    // Generate a random 12-character invitation code.
    const invitationCode = crypto
      .randomBytes(6)
      .toString('hex')
      .toUpperCase();

    const codeHash = hashCode(invitationCode);

    // Remove previous unused invitations for this email.
    await pool.query(
      `DELETE FROM staff_invitations
       WHERE email = $1
       AND used_at IS NULL`,
      [email]
    );

    // Store only the hashed invitation code.
    await pool.query(
      `INSERT INTO staff_invitations
       (email, code_hash, created_by, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '15 minutes')`,
      [email, codeHash, req.user.id]
    );

    // Return the original code only once.
    res.status(201).json({
      message: 'Invitation code generated successfully.',
      email,
      invitationCode,
      expiresInMinutes: 15,
    });
  }
);

module.exports = router;