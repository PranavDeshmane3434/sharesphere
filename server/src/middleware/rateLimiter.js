const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts, try again later' } },
});

const actionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down' } },
});

module.exports = { authLimiter, actionLimiter };