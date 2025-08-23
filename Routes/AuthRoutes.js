// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { signup, login, verify, resendVerification, me } = require('../controllers/authController');
const auth = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);
router.get('/verify', verify);
router.post('/resend-verification', resendVerification);
router.get('/me', auth, me);

// simple logout endpoint to avoid client 404s; does not need server-side invalidation unless you use refresh tokens
router.post('/logout', (req, res) => {
  return res.json({ ok: true, message: 'Logged out' });
});

module.exports = router;
