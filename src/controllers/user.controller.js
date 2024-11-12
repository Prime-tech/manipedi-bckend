const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get current user details
exports.getCurrentUser = async (req, res) => {
  console.log('📍 GET USER DETAILS REQUEST:', {
    userId: req.userId,
    timestamp: new Date().toISOString()
  });

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('✅ GET USER DETAILS SUCCESS:', {
      userId: user.id,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      user: {
        id: user.id,
        name: user.fullName,
        email: user.email,
        phone: user.phone || undefined
      }
    });
  } catch (error) {
    console.error('❌ GET USER DETAILS ERROR:', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update user details
exports.updateUser = async (req, res) => {
  console.log('📍 UPDATE USER REQUEST:', {
    userId: req.userId,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  try {
    const { name, phone } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: {
        fullName: name,
        phone: phone,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true
      }
    });

    console.log('✅ UPDATE USER SUCCESS:', {
      userId: updatedUser.id,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      user: {
        id: updatedUser.id,
        name: updatedUser.fullName,
        email: updatedUser.email,
        phone: updatedUser.phone || undefined
      }
    });
  } catch (error) {
    console.error('❌ UPDATE USER ERROR:', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ message: 'Internal server error' });
  }
};