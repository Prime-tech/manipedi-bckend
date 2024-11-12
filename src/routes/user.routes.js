const express = require('express');
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Protected routes (require authentication)
router.get('/me', authMiddleware, userController.getCurrentUser);
router.put('/me', authMiddleware, userController.updateUser);

module.exports = router;