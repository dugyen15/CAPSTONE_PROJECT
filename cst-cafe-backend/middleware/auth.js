
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      error: 'Login required',
    });
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (
      !Number.isInteger(payload.id) ||
      !['customer', 'staff', 'admin'].includes(payload.role)
    ) {
      return res.status(401).json({
        error: 'Invalid token',
      });
    }

    // Check whether a staff account still exists.
    // This invalidates old tokens after account deletion.
    if (payload.role === 'staff') {
      const result = await pool.query(
        'SELECT id FROM staff WHERE id = $1',
        [payload.id]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          error: 'Staff account no longer exists',
        });
      }
    }

    req.user = {
      id: payload.id,
      role: payload.role,
    };

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' ||
        err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Invalid or expired token',
      });
    }

    next(err);
  }
}

function requireCustomer(req, res, next) {
  if (req.user?.role !== 'customer') {
    return res.status(403).json({
      error: 'Customer access required',
    });
  }

  next();
}

function requireStaff(req, res, next) {
  if (req.user?.role !== 'staff') {
    return res.status(403).json({
      error: 'Staff access required',
    });
  }

  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required',
    });
  }

  next();
}

module.exports = {
  requireAuth,
  requireCustomer,
  requireStaff,
  requireAdmin,
};
