const express = require('express');
const auth = require('../middleware/auth');
const resourceController = require('../controllers/resource.controller');

const router = express.Router();

router.post('/upload-url', auth, resourceController.getUploadUrl);
router.post('/confirm', auth, resourceController.confirmUpload);

module.exports = router;