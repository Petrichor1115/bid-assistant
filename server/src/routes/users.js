const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();

router.get('/users', auth, requireRole('admin'), userController.list);
router.post('/users', auth, requireRole('admin'), userController.create);
router.get('/users/:id', auth, requireRole('admin'), userController.get);
router.put('/users/:id', auth, requireRole('admin'), userController.update);
router.delete('/users/:id', auth, requireRole('admin'), userController.remove);

module.exports = router;
