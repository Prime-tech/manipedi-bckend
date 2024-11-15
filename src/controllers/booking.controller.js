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

    console.log('✅ BOOKING CREATED:', {
      bookingId: booking.id,
      timestamp: new Date().toISOString(),
      timeElapsed: `${new Date() - startTime}ms`
    });

    // 2. Find nearby businesses immediately
    const businesses = await prisma.business.findMany({
      where: {
        zipCode: zipCode // For now using exact match, will implement radius later
      }
    });

    console.log('📍 FOUND NEARBY BUSINESSES:', {
      bookingId: booking.id,
      businessCount: businesses.length,
      zipCode,
      timestamp: new Date().toISOString(),
      timeElapsed: `${new Date() - startTime}ms`
    });

    // 3. Create booking requests and send emails concurrently
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

      console.log('✅ BOOKING REQUEST CREATED:', {
        requestId: request.id,
        businessId: business.id,
        businessName: business.name,
        timestamp: new Date().toISOString()
      });

      // Queue email sending
      const emailPromise = sendBookingRequestEmail(business.email, {
        bookingId: booking.id,
        requestId: request.id,
        customerName: booking.user.fullName,
        serviceType: booking.serviceType,
        dateTime: booking.dateTime,
        zipCode: booking.zipCode
      }).then(() => {
        console.log('✅ NOTIFICATION EMAIL SENT:', {
          requestId: request.id,
          businessEmail: business.email,
          businessName: business.name,
          timestamp: new Date().toISOString(),
          timeElapsed: `${new Date() - startTime}ms`
        });
      }).catch((error) => {
        console.error('❌ EMAIL SENDING FAILED:', {
          requestId: request.id,
          businessEmail: business.email,
          businessName: business.name,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      });

      emailPromises.push(emailPromise);
      return request;
    });

    // Wait for all booking requests to be created
    const bookingRequests = await Promise.all(requestPromises);

    // Wait for all emails to be sent (but don't block the response)
    Promise.all(emailPromises).then(() => {
      console.log('✅ ALL NOTIFICATIONS COMPLETED:', {
        bookingId: booking.id,
        totalBusinesses: businesses.length,
        timestamp: new Date().toISOString(),
        totalTimeElapsed: `${new Date() - startTime}ms`
      });
    });

    // 4. Send immediate response to user
    const endTime = new Date();
    console.log('✅ BOOKING PROCESS COMPLETED:', {
      bookingId: booking.id,
      requestsSent: bookingRequests.length,
      processingTime: `${endTime - startTime}ms`,
      timestamp: endTime.toISOString()
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