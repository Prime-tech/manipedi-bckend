const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const adminMiddleware = require('../middleware/admin.middleware');

// Business Management
router.post('/businesses', adminMiddleware, adminController.createBusiness);
router.get('/businesses', adminMiddleware, adminController.getAllBusinesses);
router.put('/businesses/:id', adminMiddleware, adminController.updateBusiness);
router.delete('/businesses/:id', adminMiddleware, adminController.deleteBusiness);

// Booking Management
router.get('/bookings', adminMiddleware, adminController.getAllBookings);
router.get('/booking-requests', adminMiddleware, adminController.getAllBookingRequests);

module.exports = router;