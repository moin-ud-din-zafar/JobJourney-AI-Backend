const express = require('express');
const router = express.Router();
const { signup, login, verify, resendVerification, me } = require('../controllers/authController');
const auth = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);
router.get('/verify', verify);
router.post('/resend-verification', resendVerification);
router.get('/me', auth, me);

module.exports = router;
