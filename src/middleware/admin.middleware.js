const jwt = require('jsonwebtoken');

const adminMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add admin check here (you'll need to add isAdmin field to User model)
    if (!decoded.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error('🔒 Admin Middleware Error:', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = adminMiddleware;