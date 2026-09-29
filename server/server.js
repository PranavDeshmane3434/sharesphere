require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/auth.routes');
const auth = require('./src/middleware/auth');
const requireAdmin = require('./src/middleware/requireAdmin');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);

// Temporary test routes — delete once Phase 4+ adds real protected routes
app.get('/api/protected-test', auth, (req, res) => res.json({ youAre: req.user }));
app.get('/api/admin-test', auth, requireAdmin, (req, res) => res.json({ ok: true }));

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));