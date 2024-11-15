const { PrismaClient } = require('@prisma/client');
const { sendBookingRequestEmail } = require('../services/email.service');
const prisma = new PrismaClient();

const createBooking = async (req, res) => {
  const startTime = new Date();
  console.log('📍 NEW BOOKING REQUEST STARTED:', {
    userId: req.userId,
    body: req.body,
    timestamp: startTime.toISOString()
  });

  try {
    const { serviceType, dateTime, zipCode } = req.body;

    // 1. Create booking first
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

    // 2. Find ALL businesses first (remove zipCode filter temporarily)
    const businesses = await prisma.business.findMany();

    console.log('📍 FOUND BUSINESSES IN DB:', {
      bookingId: booking.id,
      businessCount: businesses.length,
      businesses: businesses.map(b => ({
        id: b.id,
        name: b.name,
        email: b.email,
        zipCode: b.zipCode
      })),
      timestamp: new Date().toISOString(),
      timeElapsed: `${new Date() - startTime}ms`
    });

    if (businesses.length === 0) {
      console.warn('⚠️ NO BUSINESSES FOUND IN DATABASE');
      // Consider sending an admin notification here
    }

    // 3. Create booking requests and send emails
    const emailPromises = [];
    const requestPromises = businesses.map(async (business) => {
      // Create booking request
      const request = await prisma.bookingRequest.create({
        data: {
          bookingId: booking.id,
          businessId: business.id,
          status: 'PENDING'
        }
      });

      console.log('📧 ATTEMPTING TO SEND EMAIL:', {
        requestId: request.id,
        businessId: business.id,
        businessEmail: business.email,
        businessName: business.name,
        timestamp: new Date().toISOString()
      });

      // Queue email sending with detailed logging
      const emailPromise = sendBookingRequestEmail(business.email, {
        bookingId: booking.id,
        requestId: request.id,
        customerName: booking.user.fullName,
        serviceType: booking.serviceType,
        dateTime: booking.dateTime,
        zipCode: booking.zipCode
      }).then(() => {
        console.log('✅ EMAIL SENT SUCCESSFULLY:', {
          requestId: request.id,
          businessEmail: business.email,
          businessName: business.name,
          timestamp: new Date().toISOString()
        });
      }).catch((error) => {
        console.error('❌ EMAIL SENDING FAILED:', {
          requestId: request.id,
          businessEmail: business.email,
          businessName: business.name,
          error: error.message,
          errorStack: error.stack,
          timestamp: new Date().toISOString()
        });
        throw error; // Re-throw to be caught by Promise.all
      });

      emailPromises.push(emailPromise);
      return request;
    });

    // Wait for all booking requests to be created
    const bookingRequests = await Promise.all(requestPromises);

    // Wait for all emails to be sent (but don't block the response)
    Promise.all(emailPromises)
      .then(() => {
        console.log('✅ ALL EMAILS SENT SUCCESSFULLY:', {
          bookingId: booking.id,
          totalBusinesses: businesses.length,
          timestamp: new Date().toISOString(),
          totalTimeElapsed: `${new Date() - startTime}ms`
        });
      })
      .catch((error) => {
        console.error('❌ SOME EMAILS FAILED TO SEND:', {
          bookingId: booking.id,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      });

    res.status(201).json({
      booking,
      message: `Booking created and notifications sent to ${bookingRequests.length} businesses`,
      requestsSent: bookingRequests.length
    });

  } catch (error) {
    console.error('❌ BOOKING CREATION ERROR:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      timeElapsed: `${new Date() - startTime}ms`
    });
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getUserBookings = async (req, res) => {
  console.log('📍 GET USER BOOKINGS REQUEST:', {
    userId: req.userId,
    timestamp: new Date().toISOString()
  });

  try {
    const bookings = await prisma.booking.findMany({
      where: {
        userId: req.userId
      },
      include: {
        requests: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            }
          }
        }
      },
      orderBy: {
        dateTime: 'desc'
      }
    });

    console.log('✅ USER BOOKINGS RETRIEVED:', {
      userId: req.userId,
      bookingsCount: bookings.length,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ bookings });
  } catch (error) {
    console.error('❌ GET USER BOOKINGS ERROR:', {
      userId: req.userId,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createBooking,
  getUserBookings
};