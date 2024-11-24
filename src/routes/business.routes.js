const express = require('express');
const router = express.Router();
const businessController = require('../controllers/business.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Business response to booking requests
router.post('/booking-requests/:requestId/accept', authMiddleware, businessController.acceptBookingRequest);
router.post('/booking-requests/:requestId/decline', authMiddleware, businessController.declineBookingRequest);
router.get('/accept/:requestId', businessController.handleEmailAccept);
router.get('/decline/:requestId', businessController.handleEmailDecline);

module.exports = router;