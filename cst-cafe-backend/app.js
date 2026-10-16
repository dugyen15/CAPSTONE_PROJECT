require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool } = require('./db');

// Fail early with a clear message instead of failing on the first login.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  throw new Error('JWT_SECRET is missing or too short. Set a random value of at least 16 characters in .env');
}

const app = express();

// Middleware
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '100kb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/staff/auth', require('./routes/staffAuth'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/tables', require('./routes/tables'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/settings', require('./routes/settings'));

app.get('/', (req, res) => {
  res.json({ message: 'CST Cafe backend is running' });
});

// Simple health check. Says whether the database answers, without revealing any details.
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: true });
  } catch (err) {
    console.error('Health check failed:', err.message);
    res.status(503).json({ ok: false, database: false });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// One place that turns any thrown error into a clean JSON response.
// (Express 5 sends errors from async routes here automatically.)
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err.status && err.status >= 400 && err.status < 500) {
    const message = err.type === 'entity.parse.failed' ? 'Invalid JSON in request body' : err.message;
    return res.status(err.status).json({ error: message });
  }

  // Database errors we can explain to the user
  switch (err.code) {
    case '23505':
      return res.status(409).json({ error: 'That already exists' });
    case '23503':
      return res.status(409).json({ error: 'That is still in use by other records' });
    case '23P01':
      return res.status(409).json({ error: 'That conflicts with an existing booking' });
    case '22P02':
    case '22003':
    case '22007':
    case '22008':
    case '23514':
    case '23502':
      return res.status(400).json({ error: 'Invalid input' });
    default:
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = app;
