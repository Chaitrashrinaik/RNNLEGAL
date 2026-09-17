const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, { stack: err.stack });

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request entity too large' });
  }

  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: err.message });
  }

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
};

module.exports = errorHandler;
