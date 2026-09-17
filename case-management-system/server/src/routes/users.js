const express = require('express');
const { body, validationResult } = require('express-validator');
const { queryAll, queryOne } = require('../config/db');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const { paginationHelper, paginateResults } = require('../utils/helpers');
const { DEFAULT_PERMISSIONS } = require('../models/User');
const { logFromRequest } = require('../utils/activityLogger');

const router = express.Router();

router.use(auth);

router.get('/activity', async (req, res) => {
  try {
    const users = await queryAll(
      'SELECT id,name,email,lastLogin FROM users WHERE isActive = 1 ORDER BY lastLogin DESC LIMIT 20'
    );

    const activityData = await Promise.all(
      users.map(async (user) => {
        const casesAssignedResult = await queryOne('SELECT COUNT(*) as c FROM case_advocates WHERE userId = ?', [user.id]);
        const casesAssigned = casesAssignedResult?.c || 0;
        const recentCases = (await queryAll(
          `SELECT c.id,c.caseNumber,c.caseTitle,c.status,c.updatedAt
           FROM cases c JOIN case_advocates ca ON c.id = ca.caseId
           WHERE ca.userId = ? ORDER BY c.updatedAt DESC LIMIT 3`,
          [user.id]
        )).map(c => { c._id = c.id; return c; });

        return {
          user: { id: user.id, _id: user.id, name: user.name, email: user.email },
          lastLogin: user.lastLogin,
          casesAssigned,
          recentActivity: recentCases,
        };
      })
    );

    res.json({ success: true, data: activityData });
  } catch (error) {
    console.error('Get activity error:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching activity' });
  }
});

router.use(authorize('admin', 'manager'));

router.put('/:id/permissions', [
  body('permissions').isObject().withMessage('Permissions must be an object'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { permissions } = req.body;
    const actions = ['view', 'add', 'edit', 'delete'];
    const cleanPermissions = {};
    for (const [feature, perms] of Object.entries(permissions)) {
      if (DEFAULT_PERMISSIONS[feature]) {
        cleanPermissions[feature] = {};
        for (const action of actions) {
          cleanPermissions[feature][action] = !!perms[action];
        }
      }
    }

    const updated = await User.updateById(req.params.id, { permissions: cleanPermissions });
    res.json({ success: true, data: updated, message: 'Permissions updated successfully' });
    logFromRequest(req, { action: 'user_permissions_updated', entity: 'user', entityId: req.params.id, module: 'Users', details: 'User permissions updated' });
  } catch (error) {
    console.error('Update permissions error:', error.message);
    res.status(500).json({ success: false, message: 'Server error updating permissions' });
  }
});

router.post('/', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'manager', 'advocate', 'staff', 'client']).withMessage('Valid role is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { name, email, password, role, phone, firmName, company, panNumber } = req.body;
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    const user = await User.create({ name, email, password, role, phone, firmName, company, panNumber });
    const safeUser = await User.findById(user.id);
    res.status(201).json({ success: true, data: safeUser, message: `${role} created successfully` });
    logFromRequest(req, { action: 'user_created', entity: 'user', entityId: user.id, module: 'Users', details: `User created: ${req.body.name} (${req.body.role})` });
  } catch (error) {
    console.error('Create user error:', error.message);
    res.status(500).json({ success: false, message: 'Server error creating user' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { page, limit, skip } = paginationHelper(req.query.page, req.query.limit);
    const total = await User.count();
    const users = await User.findAll({ sort: { createdAt: -1 }, skip, limit });
    res.json({
      success: true,
      data: users,
      pagination: paginateResults(total, page, limit),
    });
  } catch (error) {
    console.error('Get users error:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching users' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const casesAssignedResult = await queryOne('SELECT COUNT(*) as c FROM case_advocates WHERE userId = ?', [req.params.id]);
    const casesAssigned = casesAssignedResult?.c || 0;
    res.json({ success: true, data: { ...user, casesAssigned } });
  } catch (error) {
    console.error('Get user error:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching user' });
  }
});

router.put(
  '/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('email').optional().isEmail(),
    body('phone').optional().trim(),
    body('role').optional().isIn(['admin', 'manager', 'advocate', 'staff', 'client']),
    body('isActive').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (req.body.email && req.body.email !== user.email) {
        const existing = await queryOne('SELECT id FROM users WHERE email = ? AND id != ?', [req.body.email.toLowerCase(), req.params.id]);
        if (existing) {
          return res.status(400).json({ success: false, message: 'Email already in use' });
        }
      }

      const updates = {};
      const allowedFields = ['name', 'email', 'phone', 'role', 'isActive', 'firmName', 'password'];
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      const updated = await User.updateById(req.params.id, updates);
      res.json({ success: true, data: updated });
      logFromRequest(req, { action: 'user_updated', entity: 'user', entityId: req.params.id, module: 'Users', details: 'User profile updated' });
    } catch (error) {
      console.error('Update user error:', error.message);
      res.status(500).json({ success: false, message: 'Server error updating user' });
    }
  }
);

router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.id === req.user._id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    if (user.role === 'admin') {
      const adminCount = await User.count({ role: 'admin', isActive: 1 });
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot delete the last active admin' });
      }
    }

    await User.updateById(req.params.id, { isActive: 0 });
    res.json({ success: true, message: 'User deactivated successfully' });
    logFromRequest(req, { action: 'user_deactivated', entity: 'user', entityId: req.params.id, module: 'Users', details: 'User deactivated' });
  } catch (error) {
    console.error('Delete user error:', error.message);
    res.status(500).json({ success: false, message: 'Server error deleting user' });
  }
});

router.put('/:id/role', [body('role').isIn(['admin', 'manager', 'advocate', 'staff', 'client'])], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.id === req.user._id) {
      return res.status(400).json({ success: false, message: 'Cannot change your own role' });
    }

    const updated = await User.updateById(req.params.id, { role: req.body.role });
    res.json({ success: true, data: updated, message: `Role updated to ${req.body.role}` });
    logFromRequest(req, { action: 'user_role_changed', entity: 'user', entityId: req.params.id, module: 'Users', details: `Role changed to ${req.body.role}`, newValue: { role: req.body.role } });
  } catch (error) {
    console.error('Update role error:', error.message);
    res.status(500).json({ success: false, message: 'Server error updating role' });
  }
});

module.exports = router;
