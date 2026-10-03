const express = require('express');
const auth = require('../middleware/auth');
const router = express.Router();
const resourceController = require('../controllers/resource.controller');
const { actionLimiter } = require('../middleware/rateLimiter');

router.post('/upload-url', auth, actionLimiter, resourceController.getUploadUrl);
router.post('/:id/download', auth, actionLimiter, resourceController.downloadResource);
router.post('/:id/report', auth, actionLimiter, resourceController.report);
router.post('/upload-url', auth, resourceController.getUploadUrl);
router.post('/confirm', auth, resourceController.confirmUpload);
router.post('/:id/download', auth, resourceController.downloadResource);
router.put('/:id/like', auth, resourceController.like);
router.delete('/:id/like', auth, resourceController.unlike);
router.post('/:id/report', auth, resourceController.report);
router.get('/', auth, resourceController.listResources);

module.exports = router;