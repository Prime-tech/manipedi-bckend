const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Business Management
exports.createBusiness = async (req, res) => {
  console.log('📍 CREATE BUSINESS REQUEST:', {
    body: req.body,
    timestamp: new Date().toISOString()
  });

  try {
    const { name, email, contactPerson, phone, zipCode } = req.body;

    // Validate input
    if (!name || !email || !contactPerson || !phone || !zipCode) {
      return res.status(400).json({ 
        message: 'All fields are required: name, email, contactPerson, phone, zipCode' 
      });
    }

    const business = await prisma.business.create({
      data: {
        name,
        email,
        contactPerson,
        phone,
        zipCode
      }
    });

    console.log('✅ BUSINESS CREATED:', {
      businessId: business.id,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({ business });
  } catch (error) {
    console.error('❌ CREATE BUSINESS ERROR:', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getAllBusinesses = async (req, res) => {
  try {
    const businesses = await prisma.business.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ businesses });
  } catch (error) {
    console.error('❌ GET BUSINESSES ERROR:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, contactPerson, phone, zipCode } = req.body;

    const business = await prisma.business.update({
      where: { id },
      data: {
        name,
        email,
        contactPerson,
        phone,
        zipCode
      }
    });

    res.status(200).json({ business });
  } catch (error) {
    console.error('❌ UPDATE BUSINESS ERROR:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.business.delete({ where: { id } });
    res.status(200).json({ message: 'Business deleted successfully' });
  } catch (error) {
    console.error('❌ DELETE BUSINESS ERROR:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Booking Management
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true
          }
        },
        requests: {
          include: {
            business: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ bookings });
  } catch (error) {
    console.error('❌ GET BOOKINGS ERROR:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getAllBookingRequests = async (req, res) => {
  try {
    const bookingRequests = await prisma.bookingRequest.findMany({
      include: {
        booking: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true
              }
            }
          }
        },
        business: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ bookingRequests });
  } catch (error) {
    console.error('❌ GET BOOKING REQUESTS ERROR:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}; 