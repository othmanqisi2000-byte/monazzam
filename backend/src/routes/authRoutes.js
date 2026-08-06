const express = require('express');
const { login, me, register, updateProfile } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, me);
router.patch('/me', requireAuth, updateProfile);

module.exports = router;
