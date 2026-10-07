const express = require('express');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const adminController = require('../controllers/admin.controller');

const router = express.Router();

router.get('/reports', auth, requireAdmin, adminController.listReports);
router.post('/reports/:id/resolve', auth, requireAdmin, adminController.resolveReport);
router.get('/resources', auth, requireAdmin, adminController.listModeratedResources);
router.patch('/resources/:id/status', auth, requireAdmin, adminController.setResourceStatus);

module.exports = router;