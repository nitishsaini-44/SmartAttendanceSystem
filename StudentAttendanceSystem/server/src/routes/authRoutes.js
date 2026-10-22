const express = require('express');
const { register, login, getMe, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// Public
router.post('/login', login);
// Locked — returns 403
router.post('/register', register);

// Private (all roles)
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, changePassword);

module.exports = router;