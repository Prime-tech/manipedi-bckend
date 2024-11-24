const { PrismaClient } = require('@prisma/client');
const { sendBookingRequestEmail, sendBookingConfirmationEmail, sendBusinessConfirmationEmail, sendQuoteRejectionEmail } = require('../services/email.service');
const prisma = new PrismaClient();

const calculateBookingDateTime = (timePreference) => {
  const now = new Date();
  
  switch (timePreference) {
    case 'asap':
      // Add 1 hour to current time for ASAP bookings
      return new Date(now.getTime() + 60 * 60 * 1000);
      
    case 'between':
      // Set time to 9 AM if current time is before 9 AM, otherwise use current time
      const nineAM = new Date(now).setHours(9, 0, 0, 0);
      return new Date(Math.max(now, nineAM));
      
    case 'after':
      // Set time to 12 PM if current time is before noon, otherwise use current time
      const noon = new Date(now).setHours(12, 0, 0, 0);
      return new Date(Math.max(now, noon));
      
    default:
      throw new Error('Invalid time preference');
  }
};

const createBooking = async (req, res) => {
  const startTime = new Date();
  console.log('📍 NEW BOOKING REQUEST STARTED:', {
    userId: req.userId,
    body: req.body,
    timestamp: startTime.toISOString()
  });

  try {
    const { serviceType, zipCode, timePreference } = req.body;

    // Calculate booking datetime based on timePreference
    const dateTime = calculateBookingDateTime(timePreference);

    // Create booking with calculated datetime
    const booking = await prisma.booking.create({
      data: {
        userId: req.userId,
        serviceType,
        dateTime,
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
        requestId: request.id,
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

// Get all responses for a booking
const getBookingResponses = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const responses = await prisma.bookingRequest.findMany({
      where: {
        bookingId,
        status: 'ACCEPTED'
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            zipCode: true
          }
        }
      }
    });

    res.status(200).json({ responses });
  } catch (error) {
    console.error('❌ GET BOOKING RESPONSES ERROR:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Select a salon for booking
const selectSalon = async (req, res) => {
  try {
    const { bookingId, requestId } = req.params;

    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CONFIRMED',
        selectedRequestId: requestId
      },
      include: {
        selectedRequest: {
          include: {
            business: true
          }
        },
        user: true
      }
    });

    // Send confirmation emails
    await Promise.all([
      sendBookingConfirmationEmail(booking.user.email, {
        bookingId: booking.id,
        businessName: booking.selectedRequest.business.name,
        serviceType: booking.serviceType,
        dateTime: booking.dateTime,
        price: booking.selectedRequest.price
      }),
      sendBusinessConfirmationEmail(booking.selectedRequest.business.email, {
        bookingId: booking.id,
        customerName: booking.user.fullName,
        customerPhone: booking.user.phone,
        serviceType: booking.serviceType,
        dateTime: booking.dateTime,
        price: booking.selectedRequest.price
      })
    ]);

    res.status(200).json({
      message: 'Salon selected successfully',
      booking
    });
  } catch (error) {
    console.error('❌ SELECT SALON ERROR:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all quotes for a booking
const getQuotes = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const quotes = await prisma.bookingRequest.findMany({
      where: {
        bookingId,
        status: 'ACCEPTED'
      },
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
    });

    res.status(200).json({ quotes });
  } catch (error) {
    console.error('❌ GET QUOTES ERROR:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Confirm a quote
const confirmQuote = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { message } = req.body;

    // Update the booking request
    const result = await prisma.bookingRequest.update({
      where: { id: requestId },
      data: {
        status: 'CONFIRMED',
        userResponse: message,
        confirmedAt: new Date()
      },
      include: {
        booking: {
          include: {
            user: true
          }
        },
        business: true
      }
    });

    // Update the main booking status
    await prisma.booking.update({
      where: { id: result.bookingId },
      data: {
        status: 'CONFIRMED',
        selectedRequestId: requestId
      }
    });

    // Send confirmation emails
    await Promise.all([
      sendBookingConfirmationEmail(result.booking.user.email, {
        bookingId: result.booking.id,
        businessName: result.business.name,
        price: result.price,
        dateTime: result.booking.dateTime,
        message: message || ''
      }),
      sendBusinessConfirmationEmail(result.business.email, {
        bookingId: result.booking.id,
        customerName: result.booking.user.fullName,
        customerPhone: result.booking.user.phone,
        price: result.price,
        dateTime: result.booking.dateTime,
        message: message || ''
      })
    ]);

    res.status(200).json({
      message: 'Quote confirmed successfully',
      booking: result
    });
  } catch (error) {
    console.error('❌ CONFIRM QUOTE ERROR:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Reject a quote
const rejectQuote = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;

    const result = await prisma.bookingRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        userResponse: reason
      },
      include: {
        business: true
      }
    });

    // Notify business of rejection
    await sendQuoteRejectionEmail(result.business.email, {
      businessName: result.business.name,
      reason: reason || 'No reason provided'
    });

    res.status(200).json({
      message: 'Quote rejected successfully'
    });
  } catch (error) {
    console.error('❌ REJECT QUOTE ERROR:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createBooking,
  getUserBookings,
  getBookingResponses,
  selectSalon,
  getQuotes,
  confirmQuote,
  rejectQuote
};