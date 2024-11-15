const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create controller object
const adminController = {
  // Get all bookings with pagination and filters
  getAllBookings: async (req, res) => {
    console.log('📍 GET ALL BOOKINGS REQUEST:', {
      query: req.query,
      timestamp: new Date().toISOString()
    });

    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const status = req.query.status;

      const [bookings, total] = await Promise.all([
        prisma.booking.findMany({
          skip,
          take: limit,
          where: status ? { status } : undefined,
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
          orderBy: {
            dateTime: 'desc'
          }
        }),
        prisma.booking.count({
          where: status ? { status } : undefined
        })
      ]);

      res.status(200).json({
        bookings,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          currentPage: page,
          perPage: limit
        }
      });

    } catch (error) {
      console.error('❌ GET BOOKINGS ERROR:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Get pending bookings
  getPendingBookings: async (req, res) => {
    try {
      const bookings = await prisma.booking.findMany({
        where: {
          status: 'PENDING'
        },
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
        orderBy: {
          dateTime: 'desc'
        }
      });

      res.status(200).json({ bookings });
    } catch (error) {
      console.error('❌ GET PENDING BOOKINGS ERROR:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Get completed bookings
  getCompletedBookings: async (req, res) => {
    try {
      const bookings = await prisma.booking.findMany({
        where: {
          status: 'COMPLETED'
        },
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
        orderBy: {
          dateTime: 'desc'
        }
      });

      res.status(200).json({ bookings });
    } catch (error) {
      console.error('❌ GET COMPLETED BOOKINGS ERROR:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Get cancelled bookings
  getCancelledBookings: async (req, res) => {
    try {
      const bookings = await prisma.booking.findMany({
        where: {
          status: 'CANCELLED'
        },
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
        orderBy: {
          dateTime: 'desc'
        }
      });

      res.status(200).json({ bookings });
    } catch (error) {
      console.error('❌ GET CANCELLED BOOKINGS ERROR:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

// Add this new controller method
const getDashboardStats = async (req, res) => {
  console.log('📍 GET DASHBOARD STATS REQUEST');

  try {
    const [usersCount, businessesCount, bookingsStats] = await Promise.all([
      // Get total users
      prisma.user.count({
        where: {
          isAdmin: false // Exclude admin users
        }
      }),
      // Get total businesses
      prisma.business.count(),
      // Get bookings by status
      prisma.booking.groupBy({
        by: ['status'],
        _count: {
          id: true
        }
      })
    ]);

    // Convert booking stats array to object
    const bookingsByStatus = bookingsStats.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {});

    // Calculate total bookings
    const totalBookings = Object.values(bookingsByStatus).reduce((a, b) => a + b, 0);

    console.log('✅ DASHBOARD STATS SUCCESS:', {
      users: usersCount,
      businesses: businessesCount,
      totalBookings,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      stats: {
        users: {
          total: usersCount
        },
        businesses: {
          total: businessesCount
        },
        bookings: {
          total: totalBookings,
          ...bookingsByStatus
        }
      }
    });

  } catch (error) {
    console.error('❌ DASHBOARD STATS ERROR:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all businesses with pagination and search
const getAllBusinesses = async (req, res) => {
  console.log('📍 GET ALL BUSINESSES REQUEST:', {
    query: req.query,
    timestamp: new Date().toISOString()
  });

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { zipCode: { contains: search } }
      ]
    } : {};

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          bookingRequests: {
            select: {
              id: true,
              status: true,
              createdAt: true
            }
          }
        }
      }),
      prisma.business.count({ where })
    ]);

    console.log('✅ GET BUSINESSES SUCCESS:', {
      count: businesses.length,
      total,
      page,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      businesses,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        perPage: limit
      }
    });

  } catch (error) {
    console.error('❌ GET BUSINESSES ERROR:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create new business
const createBusiness = async (req, res) => {
  console.log('📍 CREATE BUSINESS REQUEST:', {
    body: req.body,
    timestamp: new Date().toISOString()
  });

  try {
    const { name, email, contactPerson, phone, zipCode } = req.body;

    // Check if business with email already exists
    const existingBusiness = await prisma.business.findUnique({
      where: { email }
    });

    if (existingBusiness) {
      return res.status(400).json({ message: 'Business with this email already exists' });
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
    console.error('❌ CREATE BUSINESS ERROR:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get business by ID
const getBusinessById = async (req, res) => {
  console.log('📍 GET BUSINESS REQUEST:', {
    businessId: req.params.id,
    timestamp: new Date().toISOString()
  });

  try {
    const business = await prisma.business.findUnique({
      where: { id: req.params.id },
      include: {
        bookingRequests: {
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
            }
          }
        }
      }
    });

    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    res.status(200).json({ business });

  } catch (error) {
    console.error('❌ GET BUSINESS ERROR:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update business
const updateBusiness = async (req, res) => {
  console.log('📍 UPDATE BUSINESS REQUEST:', {
    businessId: req.params.id,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  try {
    const { name, contactPerson, phone, zipCode } = req.body;

    const business = await prisma.business.update({
      where: { id: req.params.id },
      data: {
        name,
        contactPerson,
        phone,
        zipCode
      }
    });

    console.log('✅ BUSINESS UPDATED:', {
      businessId: business.id,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ business });

  } catch (error) {
    console.error('❌ UPDATE BUSINESS ERROR:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Business not found' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete business
const deleteBusiness = async (req, res) => {
  console.log('📍 DELETE BUSINESS REQUEST:', {
    businessId: req.params.id,
    timestamp: new Date().toISOString()
  });

  try {
    await prisma.business.delete({
      where: { id: req.params.id }
    });

    console.log('✅ BUSINESS DELETED:', {
      businessId: req.params.id,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ message: 'Business deleted successfully' });

  } catch (error) {
    console.error('❌ DELETE BUSINESS ERROR:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Business not found' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Export the controller
module.exports = {
  ...adminController,
  getDashboardStats,
  getAllBusinesses,
  createBusiness,
  getBusinessById,
  updateBusiness,
  deleteBusiness
}; 