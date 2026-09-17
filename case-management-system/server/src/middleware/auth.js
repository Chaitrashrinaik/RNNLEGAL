const jwt = require('jsonwebtoken');
const { queryOne } = require('../config/db');

const auth = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await queryOne('SELECT id,name,email,role,phone,avatar,firmName,isActive,lastLogin,createdAt,updatedAt FROM users WHERE id = ?', [decoded.id]);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Token is not valid. User not found.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account has been deactivated.' });
    }

    user._id = user.id;
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired.' });
    }
    res.status(500).json({ success: false, message: 'Server error during authentication.' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
    }
    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await queryOne('SELECT id,name,email,role,phone,avatar,firmName,isActive,lastLogin,createdAt,updatedAt FROM users WHERE id = ?', [decoded.id]);

    if (user && user.isActive) {
      user._id = user.id;
      req.user = user;
      req.token = token;
    }
    next();
  } catch (error) {
    next();
  }
};

module.exports = { auth, authorize, optionalAuth };
