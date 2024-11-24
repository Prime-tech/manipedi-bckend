const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Protected routes (require authentication)
router.post('/', authMiddleware, bookingController.createBooking);
router.get('/my-bookings', authMiddleware, bookingController.getUserBookings);
router.get('/:bookingId/responses', authMiddleware, bookingController.getBookingResponses);
router.post('/:bookingId/select/:requestId', authMiddleware, bookingController.selectSalon);
router.post('/requests/:requestId/confirm', authMiddleware, bookingController.confirmQuote);
router.post('/requests/:requestId/reject', authMiddleware, bookingController.rejectQuote);
router.get('/:bookingId/quotes', authMiddleware, bookingController.getQuotes);

module.exports = router;