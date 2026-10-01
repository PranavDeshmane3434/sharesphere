const express = require('express');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const adminController = require('../controllers/admin.controller');

const router = express.Router();

router.get('/reports', auth, requireAdmin, adminController.listReports);
router.post('/reports/:id/resolve', auth, requireAdmin, adminController.resolveReport);

module.exports = router;