const rateLimit = require('express-rate-limit');

// Slows down password guessing on login and signup.
// Set RATE_LIMIT_DISABLED=true in .env while running automated tests.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.RATE_LIMIT_DISABLED === 'true',
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
});

module.exports = { authLimiter };
