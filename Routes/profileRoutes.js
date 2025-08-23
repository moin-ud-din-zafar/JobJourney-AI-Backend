// routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const auth = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

console.log('routes/profileRoutes.js: loaded');

// prepare upload dir and multer
const UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads');
try {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log('routes/profileRoutes.js: created upload dir', UPLOAD_DIR);
  }
} catch (err) {
  console.warn('routes/profileRoutes.js: could not ensure upload dir', err && err.message);
}

// safe filename helper
function safeFilename(original = 'file') {
  return original
    .toString()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_.-]/g, '');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const userId = (req && req.userId) ? String(req.userId) : 'anon';
    const ts = Date.now();
    const safe = safeFilename(file && file.originalname ? file.originalname : 'file');
    cb(null, `${userId}-${ts}-${safe}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 12 * 1024 * 1024 } });

// Lightweight unauthenticated ping (useful to verify the router is reachable from client)
router.get('/ping', (req, res) => {
  res.json({ ok: true, route: '/api/profile/ping' });
});

// Protected routes
router.get('/', auth, profileController.getProfile);
router.put('/', auth, profileController.updateProfile);
router.post('/document', auth, upload.single('file'), profileController.uploadDocument);

// New: download document (protected)
// client: GET /api/profile/document/:docId/download
router.get('/document/:docId/download', auth, profileController.downloadDocument);

router.delete('/document/:docId', auth, profileController.deleteDocument);

module.exports = router;

/* debug: list what's on this router (printed on require) */
(function listRouterStack() {
  try {
    console.log('routes/profileRoutes.js: listing router.stack:');
    router.stack.forEach((layer, i) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods || {}).map(m => m.toUpperCase()).join(',');
        console.log(`  [router] ${i}: ROUTE ${methods}  ${layer.route.path}`);
      } else {
        console.log(`  [router] ${i}: middleware name=${layer.name} regexp=${layer.regexp && layer.regexp.toString()}`);
      }
    });
  } catch (e) {
    console.warn('routes/profileRoutes.js: failed to inspect router.stack', e && e.stack ? e.stack : e);
  }
})();
