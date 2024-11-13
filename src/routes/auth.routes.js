const express = require('express');
const router = express.Router();
const { 
  signup, 
  verifySignup, 
  login, 
  verifyLogin 
} = require('../controllers/auth.controller');

// Auth routes
router.post('/signup', signup);
router.post('/verify-signup', verifySignup);
router.post('/login', login);
router.post('/verify-login', verifyLogin);

module.exports = router;