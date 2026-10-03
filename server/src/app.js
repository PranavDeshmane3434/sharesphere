require('dotenv').config();
const express = require('express');
const cors = require('cors');

BigInt.prototype.toJSON = function () { return this.toString(); };

const authRoutes = require('./routes/auth.routes');
const resourceRoutes = require('./routes/resource.routes');
const adminRoutes = require('./routes/admin.routes');
const auth = require('./middleware/auth');
const requireAdmin = require('./middleware/requireAdmin');
const errorHandler = require('./middleware/errorHandler');
const userController = require('../src/controllers/user.controller');
const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/admin', adminRoutes);
// app.get('/api/protected-test', auth, (req, res) => res.json({ youAre: req.user }));
app.get('/api/admin-test', auth, requireAdmin, (req, res) => res.json({ ok: true }));
app.get('/api/me', auth, userController.getMe);
app.get('/api/me/transactions', auth, userController.getMyTransactions);
app.use(errorHandler);

module.exports = app;