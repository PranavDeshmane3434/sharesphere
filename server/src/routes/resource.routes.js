const express = require('express');
const auth = require('../middleware/auth');
const resourceController = require('../controllers/resource.controller');

const router = express.Router();

router.post('/upload-url', auth, resourceController.getUploadUrl);
router.post('/confirm', auth, resourceController.confirmUpload);
router.post('/:id/download', auth, resourceController.downloadResource);
router.put('/:id/like', auth, resourceController.like);
router.delete('/:id/like', auth, resourceController.unlike);
router.post('/:id/report', auth, resourceController.report);

module.exports = router;