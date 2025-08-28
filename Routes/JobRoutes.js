// routes/jobRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware'); // uses the middleware above
const jobController = require('../controllers/jobController');

router.post('/', auth, jobController.createJob);
router.get('/', auth, jobController.getJobs);
router.get('/:id', auth, jobController.getJob);
router.put('/:id', auth, jobController.updateJob);
router.delete('/:id', auth, jobController.deleteJob);

module.exports = router;
