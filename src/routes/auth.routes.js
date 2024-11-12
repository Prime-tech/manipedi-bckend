const express = require('express');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Auth routes
router.post('/signup', authController.signup);
router.post('/verify-signup', authController.verifySignupOTP);
router.post('/login', authController.login);
router.post('/verify-login', authController.verifyLoginOTP);

module.exports = router;