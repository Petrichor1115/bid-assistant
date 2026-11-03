const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const reportController = require('../controllers/reportController');

const router = express.Router();

router.post('/projects/:id/archive', auth, requireRole('bidder'), reportController.archive);
router.get('/projects/:id/report', auth, reportController.getReport);
router.get('/projects/:id/report/pdf', auth, reportController.getPdf);

module.exports = router;
