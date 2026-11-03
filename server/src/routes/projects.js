const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const projectController = require('../controllers/projectController');
const fileController = require('../controllers/fileController');

const router = express.Router();

router.get('/projects', auth, projectController.list);
router.post('/projects', auth, requireRole('bidder'), projectController.create);
router.get('/projects/:id', auth, projectController.get);
router.put('/projects/:id', auth, requireRole('bidder'), projectController.update);
router.delete('/projects/:id', auth, requireRole('bidder'), projectController.remove);
router.get('/projects/:id/timeline', auth, projectController.timeline);
router.get('/projects/:id/diff', auth, fileController.diff);
router.post('/projects/:id/files', auth, requireRole('bidder'), fileController.upload.single('file'), fileController.uploadFile);
router.get('/projects/:id/files', auth, fileController.list);

module.exports = router;
