const express = require('express');
const router = express.Router();
const { 
  signup, 
  verifySignup, 
  login, 
  verifyLogin,
  adminLogin,
  verifyAdminLogin
} = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Auth routes
router.post('/signup', signup);
router.post('/verify-signup', verifySignup);
router.post('/login', login);
router.post('/verify-login', verifyLogin);

// New admin check route
router.get('/check-admin', authMiddleware, checkAdminStatus);

// Admin specific routes
router.post('/admin/login', adminLogin);
router.post('/admin/verify-login', verifyAdminLogin);

module.exports = router;