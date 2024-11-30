const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendSalonResponseEmail } = require('../services/email.service');

exports.acceptBookingRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { price, notes } = req.body;

    const result = await prisma.bookingRequest.update({
      where: { id: requestId },
      data: {
        status: 'ACCEPTED',
        price,
        notes
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

    // Send notification to customer about new quote
    await sendSalonResponseEmail(
      result.booking.user.email,
      {
        bookingId: result.booking.id,
        businessName: result.business.name,
        price,
        notes
      }
    );

    console.log('✅ BOOKING REQUEST ACCEPTED:', {
      requestId,
      businessId: result.business.id,
      price,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      message: 'Response sent successfully',
      bookingRequest: result
    });

  } catch (error) {
    console.error('❌ ACCEPT BOOKING REQUEST ERROR:', error);
    res.status(500).json({ message: 'Internal server error' });
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

exports.handleEmailAccept = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Verify the request exists and is still pending
    const request = await prisma.bookingRequest.findUnique({
      where: { id: requestId },
      include: { booking: true }
    });

    if (!request) {
      return res.redirect(`${process.env.FRONTEND_URL}/error?message=Invalid request`);
    }

    if (request.status !== 'PENDING') {
      return res.redirect(`${process.env.FRONTEND_URL}/error?message=Request already processed`);
    }

    // Redirect to the quote form
    res.redirect(`${process.env.FRONTEND_URL}/business/quote/${requestId}`);

  } catch (error) {
    console.error('❌ EMAIL ACCEPT ERROR:', error);
    res.redirect(`${process.env.FRONTEND_URL}/error?message=Something went wrong`);
  }
};

exports.handleEmailDecline = async (req, res) => {
  try {
    const { requestId } = req.params;

    // Verify the request exists and is still pending
    const request = await prisma.bookingRequest.findUnique({
      where: { id: requestId }
    });

    if (!request || request.status !== 'PENDING') {
      return res.redirect(`${process.env.FRONTEND_URL}/error?message=Invalid or already processed request`);
    }

    // Update the booking request status
    await prisma.bookingRequest.update({
      where: { id: requestId },
      data: { status: 'DECLINED' }
    });

    // Redirect to confirmation page
    res.redirect(`${process.env.FRONTEND_URL}/business/declined?requestId=${requestId}`);

  } catch (error) {
    console.error('❌ EMAIL DECLINE ERROR:', error);
    res.redirect(`${process.env.FRONTEND_URL}/error?message=Something went wrong`);
  }
};