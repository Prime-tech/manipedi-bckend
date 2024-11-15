const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const adminMiddleware = require('../middleware/admin.middleware');

// Booking Management Routes
router.get('/bookings', adminController.getAllBookings);
router.get('/bookings/pending', adminController.getPendingBookings);
router.get('/bookings/completed', adminController.getCompletedBookings);
router.get('/bookings/cancelled', adminController.getCancelledBookings);

// Add this new route
router.get('/dashboard/stats', adminController.getDashboardStats);

// Business Management Routes
router.get('/businesses', adminController.getAllBusinesses);
router.post('/businesses', adminController.createBusiness);
router.get('/businesses/:id', adminController.getBusinessById);
router.put('/businesses/:id', adminController.updateBusiness);
router.delete('/businesses/:id', adminController.deleteBusiness);

module.exports = router;