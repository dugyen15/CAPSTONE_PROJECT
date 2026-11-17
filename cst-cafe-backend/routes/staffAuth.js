
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
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url ?? null,
    role: 'staff',
  };
}

function createToken(id) {
  return jwt.sign({ id, role: 'staff' }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

// POST /api/staff/auth/signup
// Staff registration using an admin invitation.
router.post('/signup', authLimiter, async (req, res) => {
  const body = req.body ?? {};
  const name = str(body.name);
  const email = str(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const inviteCode = str(pick(body, 'inviteCode', 'invite_code')).toUpperCase();

  if (!name || !email || !password || !inviteCode) {
    throw new HttpError(400, 'Name, email, password and invitation code are required');
  }

  if (name.length > 100) {
    throw new HttpError(400, 'Name is too long');
  }

  if (!EMAIL_RE.test(email) || email.length > 255) {
    throw new HttpError(400, 'Enter a valid email address');
  }

  if (password.length < 8) {
    throw new HttpError(400, 'Password must be at least 8 characters');
  }

  if (password.length > 72) {
    throw new HttpError(400, 'Password must be 72 characters or fewer');
  }

  if (!/^[A-F0-9]{12}$/.test(inviteCode)) {
    throw new HttpError(403, 'Invalid invitation code');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const invitationResult = await client.query(
      `SELECT id
       FROM staff_invitations
       WHERE email = $1
         AND code_hash = $2
         AND used_at IS NULL
         AND expires_at > NOW()
       FOR UPDATE`,
      [email, hashCode(inviteCode)]
    );

    if (invitationResult.rows.length === 0) {
      throw new HttpError(403, 'Invalid, expired or already used invitation code');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await client.query(
      `INSERT INTO staff (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, avatar_url`,
      [name, email, passwordHash]
    );

    const user = publicStaff(result.rows[0]);

    await client.query(
      `UPDATE staff_invitations
       SET used_at = NOW()
       WHERE id = $1`,
      [invitationResult.rows[0].id]
    );

    // Record the new staff member's authenticated session.
    await client.query(
      `INSERT INTO staff_activity (staff_id)
       VALUES ($1)`,
      [user.id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      user,
      token: createToken(user.id),
    });
  } catch (err) {
    await client.query('ROLLBACK');

    if (err.code === '23505') {
      throw new HttpError(409, 'Email is already registered');
    }

    throw err;
  } finally {
    client.release();
  }
});

// POST /api/staff/auth/login
router.post('/login', authLimiter, async (req, res) => {
  const body = req.body ?? {};
  const email = str(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    throw new HttpError(400, 'Email and password are required');
  }

  const result = await pool.query(
    'SELECT * FROM staff WHERE email = $1',
    [email]
  );

  const row = result.rows[0];

  const ok = await bcrypt.compare(
    password,
    row ? row.password_hash : DUMMY_HASH
  );

  if (!row || !ok) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const user = publicStaff(row);

  // Record every successful login.
  await pool.query(
    `INSERT INTO staff_activity (staff_id)
     VALUES ($1)`,
    [user.id]
  );

  res.json({
    user,
    token: createToken(user.id),
  });
});

// POST /api/staff/auth/logout
router.post('/logout', requireAuth, requireStaff, async (req, res) => {
  // Close the latest login session that has not been logged out.
  const result = await pool.query(
    `UPDATE staff_activity
     SET logout_at = NOW()
     WHERE id = (
       SELECT id
       FROM staff_activity
       WHERE staff_id = $1
         AND logout_at IS NULL
       ORDER BY login_at DESC
       LIMIT 1
     )
     RETURNING logout_at`,
    [req.user.id]
  );

  res.json({
    message: 'Logged out successfully',
    logoutAt: result.rows[0]?.logout_at ?? null,
  });
});

// GET /api/staff/auth/me
router.get('/me', requireAuth, requireStaff, async (req, res) => {
  const result = await pool.query(
    'SELECT id, name, email, avatar_url FROM staff WHERE id = $1',
    [req.user.id]
  );

  if (result.rows.length === 0) {
    throw new HttpError(401, 'Account no longer exists');
  }

  res.json({
    user: publicStaff(result.rows[0]),
  });
});

// PATCH /api/staff/auth/me
router.patch('/me', requireAuth, requireStaff, async (req, res) => {
  const body = req.body ?? {};
  const sets = [];
  const params = [];

  if (body.name !== undefined) {
    const name = str(body.name);

    if (!name || name.length > 100) {
      throw new HttpError(400, 'Name must be 1 to 100 characters');
    }

    params.push(name);
    sets.push(`name = $${params.length}`);
  }

  const avatar = pick(body, 'avatarUrl', 'avatar_url');

  if (avatar !== undefined) {
    const url = str(avatar) || null;

    if (url && url.length > 2000) {
      throw new HttpError(400, 'Avatar URL is too long');
    }

    params.push(url);
    sets.push(`avatar_url = $${params.length}`);
  }

  if (sets.length === 0) {
    throw new HttpError(400, 'Nothing to update');
  }

  params.push(req.user.id);

  const result = await pool.query(
    `UPDATE staff
     SET ${sets.join(', ')}
     WHERE id = $${params.length}
     RETURNING id, name, email, avatar_url`,
    params
  );

  if (result.rows.length === 0) {
    throw new HttpError(401, 'Account no longer exists');
  }

  res.json({
    user: publicStaff(result.rows[0]),
  });
});

module.exports = router;
