const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

// Booking Management
router.get('/bookings', adminController.getAllBookings);
router.get('/bookings/pending', adminController.getPendingBookings);
router.get('/bookings/completed', adminController.getCompletedBookings);
router.get('/bookings/cancelled', adminController.getCancelledBookings);

module.exports = router;