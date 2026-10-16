const jwt = require('jsonwebtoken');

// Checks that the request carries a valid login token and remembers who it is.
// Tokens look like { id, role } where role is 'customer' or 'staff'.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Login required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!Number.isInteger(payload.id) || !['customer', 'staff'].includes(payload.role)) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Use after requireAuth.
function requireCustomer(req, res, next) {
  if (req.user?.role !== 'customer') {
    return res.status(403).json({ error: 'Customer account required' });
  }
  next();
}

function requireStaff(req, res, next) {
  if (req.user?.role !== 'staff') {
    return res.status(403).json({ error: 'Staff access required' });
  }
  next();
}

module.exports = { requireAuth, requireCustomer, requireStaff };
