const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Protected routes (require authentication)
router.post('/', authMiddleware, bookingController.createBooking);
router.get('/my-bookings', authMiddleware, bookingController.getUserBookings);
router.get('/:bookingId/responses', authMiddleware, bookingController.getBookingResponses);
router.post('/:bookingId/select/:requestId', authMiddleware, bookingController.selectSalon);

module.exports = router;