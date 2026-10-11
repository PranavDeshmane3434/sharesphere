const express = require('express');
const auth = require('../middleware/auth');
const { actionLimiter } = require('../middleware/rateLimiter');
const resourceController = require('../controllers/resource.controller');

const router = express.Router();

router.get('/', auth, resourceController.listResources);
// '/filters' and '/saved' must stay above '/:id', or they would be read as ids
router.get('/filters', auth, resourceController.getFilterOptions);
router.get('/saved', auth, resourceController.listSaved);
router.get('/:id', auth, resourceController.getResource);
router.post('/upload-url', auth, actionLimiter, resourceController.getUploadUrl);
router.post('/confirm', auth, resourceController.confirmUpload);
router.post('/:id/download', auth, actionLimiter, resourceController.downloadResource);
router.put('/:id/like', auth, resourceController.like);
router.delete('/:id/like', auth, resourceController.unlike);
router.put('/:id/save', auth, resourceController.save);
router.delete('/:id/save', auth, resourceController.unsave);
router.put('/:id/rating', auth, actionLimiter, resourceController.rate);
router.post('/:id/report', auth, actionLimiter, resourceController.report);

module.exports = router;