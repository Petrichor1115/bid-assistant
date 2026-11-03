const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const resultController = require('../controllers/resultController');

const router = express.Router();

router.get('/projects/:id/results', auth, resultController.results);
router.get('/projects/:id/results/pdf', auth, resultController.resultsPdf);
router.get('/projects/:id/issues', auth, resultController.listIssues);
router.put('/issues/:id', auth, requireRole('bidder'), resultController.updateIssue);

module.exports = router;
