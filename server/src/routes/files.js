const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const fileController = require('../controllers/fileController');

const router = express.Router();

router.get('/files/:id', auth, fileController.download);
router.delete('/files/:id', auth, requireRole('bidder'), fileController.remove);
router.post('/files/identify', auth, requireRole('bidder'), fileController.upload.array('files', 20), fileController.identifyFiles);
router.post('/projects/:id/modify-bid', auth, requireRole('bidder'), fileController.modifyBid);

module.exports = router;
