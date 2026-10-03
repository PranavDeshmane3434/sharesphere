// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');

// // Global fix: Prisma returns BigInt for BigInt columns, but JSON.stringify
// // can't serialize BigInt natively. This teaches JSON.stringify (and every
// // res.json() call) how to convert BigInt to a string automatically.
// BigInt.prototype.toJSON = function () {
//   return this.toString();
// };

// const authRoutes = require('./src/routes/auth.routes');
// const resourceRoutes = require('./src/routes/resource.routes');

// const auth = require('./src/middleware/auth');
// const requireAdmin = require('./src/middleware/requireAdmin');
// const errorHandler = require('./src/middleware/errorHandler');
// const adminRoutes = require('./src/routes/admin.routes');
// const app = express();

// app.use(cors({
//   origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
//   credentials: true,
// }));

// app.use(express.json());

// app.get('/health', (req, res) => res.json({ ok: true }));

// app.use('/api/auth', authRoutes);
// app.use('/api/admin', adminRoutes);
// app.use('/api/resources', resourceRoutes);

// // Temporary test routes — delete once Phase 4+ adds real protected routes
// app.get('/api/protected-test', auth, (req, res) => res.json({ youAre: req.user }));
// app.get('/api/admin-test', auth, requireAdmin, (req, res) => res.json({ ok: true }));

// app.use(errorHandler);

// const PORT = process.env.PORT || 4000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));




const app = require('./src/app');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});