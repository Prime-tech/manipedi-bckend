const { PrismaClient } = require('@prisma/client');
const { sendBookingRequestEmail } = require('../services/email.service');

const prisma = new PrismaClient();

exports.createBooking = async (req, res) => {
  console.log('📍 CREATE BOOKING REQUEST:', {
    userId: req.userId,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  try {
    const { serviceType, dateTime, zipCode } = req.body;

    // Validate input
    if (!serviceType || !dateTime || !zipCode) {
      return res.status(400).json({ 
        message: 'Service type, date/time, and zip code are required' 
      });
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        userId: req.userId,
        serviceType,
        dateTime: new Date(dateTime),
        zipCode,
        status: 'PENDING'
      },
      include: {
        user: true
      }
    });

    // Find nearby businesses
    const nearbyBusinesses = await prisma.business.findMany({
      where: {
        zipCode: zipCode // For now, exact match. We'll improve this later
      },
      take: 5
    });

    // Create booking requests for each business
    const bookingRequests = await Promise.all(
      nearbyBusinesses.map(business => 
        prisma.bookingRequest.create({
          data: {
            bookingId: booking.id,
            businessId: business.id,
            status: 'PENDING'
          }
        })
      )
    );

    // Send emails to businesses
    await Promise.all(
      nearbyBusinesses.map(business =>
        sendBookingRequestEmail(business.email, {
          bookingId: booking.id,
          customerName: booking.user.fullName,
          serviceType,
          dateTime,
          zipCode
        })
      )
    );

    console.log('✅ BOOKING CREATED:', {
      bookingId: booking.id,
      businessCount: nearbyBusinesses.length,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      message: 'Booking created successfully',
      booking: {
        id: booking.id,
        serviceType,
        dateTime,
        zipCode,
        status: booking.status
      }
    });

  } catch (error) {
    console.error('❌ CREATE BOOKING ERROR:', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getUserBookings = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        userId: req.userId
      },
      include: {
        requests: {
          include: {
            business: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.status(200).json({ bookings });
  } catch (error) {
    console.error('❌ GET USER BOOKINGS ERROR:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};