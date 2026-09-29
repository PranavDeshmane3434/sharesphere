require('dotenv').config();

module.exports = {
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: '24h',
  bcryptCost: 12,
};