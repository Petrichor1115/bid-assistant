const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const agentController = require('../controllers/agentController');

const router = express.Router();

router.post('/projects/:id/agent/run', auth, requireRole('bidder'), agentController.runAll);
router.post('/projects/:id/agent/:name/run', auth, requireRole('bidder'), agentController.runSingle);
router.get('/projects/:id/agent/runs', auth, agentController.listRuns);
router.get('/agent/runs/:runId', auth, agentController.getRun);
router.post('/agent/runs/:runId/retry', auth, requireRole('bidder'), agentController.retry);

module.exports = router;
