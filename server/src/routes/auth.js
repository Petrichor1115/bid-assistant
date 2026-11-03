const express = require('express');
const { auth } = require('../middleware/auth');
const { login, me, logout } = require('../controllers/authController');

const router = express.Router();

router.post('/auth/login', login);
router.get('/auth/me', auth, me);
router.post('/auth/logout', auth, logout);

module.exports = router;
