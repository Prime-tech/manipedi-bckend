const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.acceptBookingRequest = async (req, res) => {
  console.log('📍 ACCEPT BOOKING REQUEST:', {
    requestId: req.params.requestId,
    timestamp: new Date().toISOString()
  });

  try {
    const { requestId } = req.params;

    // Start a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Get the booking request
      const bookingRequest = await prisma.bookingRequest.findUnique({
        where: { id: requestId },
        include: {
          booking: true,
          business: true
        }
      });

      if (!bookingRequest) {
        throw new Error('Booking request not found');
      }

      if (bookingRequest.status !== 'PENDING') {
        throw new Error('Booking request is no longer pending');
      }

      // Update the current booking request to ACCEPTED
      const updatedRequest = await prisma.bookingRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' },
        include: {
          booking: {
            include: {
              user: true
            }
          },
          business: true
        }
      });

      // Update the booking status to ACCEPTED
      await prisma.booking.update({
        where: { id: bookingRequest.bookingId },
        data: { status: 'ACCEPTED' }
      });

      // Update all other pending requests for this booking to DECLINED
      await prisma.bookingRequest.updateMany({
        where: {
          bookingId: bookingRequest.bookingId,
          id: { not: requestId },
          status: 'PENDING'
        },
        data: { status: 'DECLINED' }
      });

      return updatedRequest;
    });

    // Send confirmation emails
    await Promise.all([
      // Email to customer
      sendBookingConfirmationEmail(
        result.booking.user.email,
        {
          bookingId: result.booking.id,
          businessName: result.business.name,
          serviceType: result.booking.serviceType,
          dateTime: result.booking.dateTime,
          businessPhone: result.business.phone
        }
      ),
      // Email to business
      sendBusinessConfirmationEmail(
        result.business.email,
        {
          bookingId: result.booking.id,
          customerName: result.booking.user.fullName,
          customerPhone: result.booking.user.phone,
          serviceType: result.booking.serviceType,
          dateTime: result.booking.dateTime
        }
      )
    ]);

    console.log('✅ BOOKING REQUEST ACCEPTED:', {
      requestId,
      bookingId: result.bookingId,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      message: 'Booking request accepted successfully',
      bookingRequest: result
    });

  } catch (error) {
    console.error('❌ ACCEPT BOOKING REQUEST ERROR:', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

exports.declineBookingRequest = async (req, res) => {
  console.log('📍 DECLINE BOOKING REQUEST:', {
    requestId: req.params.requestId,
    timestamp: new Date().toISOString()
  });

  try {
    const { requestId } = req.params;

    // Update the booking request status
    const result = await prisma.bookingRequest.update({
      where: { id: requestId },
      data: { status: 'DECLINED' },
      include: {
        booking: {
          include: {
            user: true,
            requests: true
          }
        },
        business: true
      }
    });

    // Check if all requests are declined
    const allRequestsDeclined = result.booking.requests.every(
      request => request.status === 'DECLINED'
    );

    if (allRequestsDeclined) {
      // Update booking status to CANCELLED if all requests are declined
      await prisma.booking.update({
        where: { id: result.booking.id },
        data: { status: 'CANCELLED' }
      });

      // Send notification to customer that no businesses are available
      await sendBookingCancellationEmail(
        result.booking.user.email,
        {
          bookingId: result.booking.id,
          serviceType: result.booking.serviceType,
          dateTime: result.booking.dateTime
        }
      );
    }

    console.log('✅ BOOKING REQUEST DECLINED:', {
      requestId,
      bookingId: result.bookingId,
      allDeclined: allRequestsDeclined,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      message: 'Booking request declined successfully',
      bookingRequest: result
    });

  } catch (error) {
    console.error('❌ DECLINE BOOKING REQUEST ERROR:', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ message: 'Internal server error' });
  }
};