const User = require('../models/User');

const READ_ACTIONS = ['view', 'list', 'read', 'get'];

const checkPermission = (feature, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }

      if (req.user.role === 'admin' || req.user.role === 'manager') {
        return next();
      }

      if (req.user.role === 'client') {
        if (READ_ACTIONS.includes(action)) {
          return next();
        }
        return res.status(403).json({ success: false, message: 'Access denied: clients cannot modify data' });
      }

      const fullUser = await User.findById(req.user._id);
      if (!fullUser || !fullUser.permissions) {
        return res.status(403).json({ success: false, message: `Access denied: ${feature} not configured` });
      }

      const featurePerms = fullUser.permissions[feature];
      if (!featurePerms) {
        return res.status(403).json({ success: false, message: `Access denied: ${feature} not permitted` });
      }

      if (typeof featurePerms === 'boolean') {
        if (!featurePerms) {
          return res.status(403).json({ success: false, message: `Access denied: ${feature} not permitted` });
        }
        return next();
      }

      if (!featurePerms[action]) {
        return res.status(403).json({ success: false, message: `Access denied: ${action} not permitted on ${feature}` });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error.message);
      res.status(500).json({ success: false, message: 'Server error checking permissions' });
    }
  };
};

module.exports = { checkPermission };
