const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const libraryController = require('../controllers/libraryController');

const router = express.Router();

router.get('/projects/:id/competitor-library', auth, libraryController.getLibrary);
router.post('/projects/:id/competitor-library/match', auth, requireRole('bidder'), libraryController.match);
router.get('/projects/:id/competitor-recommendations', auth, libraryController.getRecommendations);
router.put('/recommendations/:id/adopt', auth, requireRole('bidder'), libraryController.adopt);
router.put('/recommendations/:id/dismiss', auth, requireRole('bidder'), libraryController.dismiss);

module.exports = router;
