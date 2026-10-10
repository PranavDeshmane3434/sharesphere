const express = require('express');
const auth = require('../middleware/auth');
const { actionLimiter } = require('../middleware/rateLimiter');
const resourceController = require('../controllers/resource.controller');

const router = express.Router();

router.get('/', auth, resourceController.listResources);
// '/filters' must stay above '/:id', or "filters" would be read as an id
router.get('/filters', auth, resourceController.getFilterOptions);
router.get('/:id', auth, resourceController.getResource);
router.post('/upload-url', auth, actionLimiter, resourceController.getUploadUrl);
router.post('/confirm', auth, resourceController.confirmUpload);
router.post('/:id/download', auth, actionLimiter, resourceController.downloadResource);
router.put('/:id/like', auth, resourceController.like);
router.delete('/:id/like', auth, resourceController.unlike);
router.post('/:id/report', auth, actionLimiter, resourceController.report);

module.exports = router;