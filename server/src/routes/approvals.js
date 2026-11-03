const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const approvalController = require('../controllers/approvalController');

const router = express.Router();

router.post('/projects/:id/submit-approval', auth, requireRole('bidder'), approvalController.submitApproval);
router.get('/projects/:id/approvals', auth, approvalController.listApprovals);

module.exports = router;
