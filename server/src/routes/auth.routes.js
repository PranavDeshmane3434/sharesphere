const express = require('express');
const authController = require('../controllers/auth.controller');
const { authLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;