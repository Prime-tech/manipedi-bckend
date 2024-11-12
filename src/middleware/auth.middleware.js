const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error('🔒 Auth Middleware Error:', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;