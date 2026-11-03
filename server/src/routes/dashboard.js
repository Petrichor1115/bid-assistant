const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const { dashboard, adminDashboard, adminFiles, adminApprovals } = require('../controllers/dashboardController');

const router = express.Router();

router.get('/dashboard', auth, dashboard);
router.get('/admin/dashboard', auth, requireRole('admin'), adminDashboard);
router.get('/admin/files', auth, requireRole('admin'), adminFiles);
router.get('/admin/approvals', auth, requireRole('admin'), adminApprovals);

module.exports = router;
