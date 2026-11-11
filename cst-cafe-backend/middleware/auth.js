const jwt = require('jsonwebtoken');

// Checks whether the request contains a valid login token.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Login required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (
      !Number.isInteger(payload.id) ||
      !['customer', 'staff', 'admin'].includes(payload.role)
    ) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = {
      id: payload.id,
      role: payload.role,
    };

    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Invalid or expired token',
    });
  }
}

// Customer-only access
function requireCustomer(req, res, next) {
  if (req.user?.role !== 'customer') {
    return res.status(403).json({
      error: 'Customer account required',
    });
  }

  next();
}

// Staff-only access
function requireStaff(req, res, next) {
  if (req.user?.role !== 'staff') {
    return res.status(403).json({
      error: 'Staff access required',
    });
  }

  next();
}

// Admin-only access
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