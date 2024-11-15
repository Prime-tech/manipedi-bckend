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

// Export the controller
module.exports = {
  ...adminController,
  getDashboardStats
}; 