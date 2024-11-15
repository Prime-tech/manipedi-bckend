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

    // Start a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Create the booking
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

      // 2. Find nearby businesses (based on zipCode)
      const businesses = await prisma.business.findMany({
        where: {
          zipCode: zipCode
        }
      });

      // 3. Create booking requests for each business
      const bookingRequests = await Promise.all(
        businesses.map(async (business) => {
          const request = await prisma.bookingRequest.create({
            data: {
              bookingId: booking.id,
              businessId: business.id,
              status: 'PENDING'
            }
          });

          // 4. Send email to each business
          try {
            await sendBookingRequestEmail(business.email, {
              bookingId: booking.id,
              customerName: booking.user.fullName,
              serviceType: booking.serviceType,
              dateTime: booking.dateTime,
              zipCode: booking.zipCode,
              requestId: request.id // Add this for tracking
            });
          } catch (emailError) {
            console.error('❌ Failed to send email to business:', {
              businessId: business.id,
              error: emailError.message
            });
            // Continue with other businesses even if email fails
          }

          return request;
        })
      );

      return { booking, bookingRequests };
    });

    console.log('✅ BOOKING CREATED:', {
      bookingId: result.booking.id,
      requestsSent: result.bookingRequests.length,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      booking: result.booking,
      message: `Booking created and sent to ${result.bookingRequests.length} businesses`
    });

  } catch (error) {
    console.error('❌ CREATE BOOKING ERROR:', error);
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