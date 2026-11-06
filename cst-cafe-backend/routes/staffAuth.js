
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

// Hash invitation codes before storing them.
function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

// POST /api/staff/auth/invitations
// Existing authenticated staff can generate an invitation.
router.post('/invitations', requireAuth, requireStaff, authLimiter, async (req, res) => {
  const body = req.body ?? {};
  const email = str(body.email).toLowerCase();

  if (!email || !EMAIL_RE.test(email) || email.length > 255) {
    throw new HttpError(400, 'Enter a valid email address');
  }

  // Check whether this email already belongs to a staff member.
  const existing = await pool.query(
    'SELECT id FROM staff WHERE email = $1',
    [email]
  );

  if (existing.rows.length > 0) {
    throw new HttpError(409, 'This email is already registered as staff');
  }

  // Generate a random 12-character invitation code.
  const invitationCode = crypto.randomBytes(6).toString('hex').toUpperCase();
  const codeHash = hashCode(invitationCode);

  // Remove previous unused invitations for this email.
  await pool.query(
    `DELETE FROM staff_invitations
     WHERE email = $1 AND used_at IS NULL`,
    [email]
  );

  // Save the hashed invitation code, not the original code.
  await pool.query(
    `INSERT INTO staff_invitations
      (email, code_hash, created_by, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '15 minutes')`,
    [email, codeHash, req.user.id]
  );

  // The code is returned to the dashboard for manual sharing.
  res.status(201).json({
    message: 'Invitation code generated successfully.',
    email,
    invitationCode,
    expiresInMinutes: 15,
  });
});

// POST /api/staff/auth/signup
// New staff register using their individual invitation code.
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

    // Lock the invitation row to prevent the same code being used twice.
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

    // Mark the invitation as used.
    await client.query(
      `UPDATE staff_invitations
       SET used_at = NOW()
       WHERE id = $1`,
      [invitationResult.rows[0].id]
    );

    await client.query('COMMIT');

    const user = publicStaff(result.rows[0]);

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

  res.json({
    user,
    token: createToken(user.id),
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

  res.json(publicStaff(result.rows[0]));
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

  res.json(publicStaff(result.rows[0]));
});

module.exports = router;
