const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { uploadAvatar, handleUploadError } = require('../middleware/upload');
const { sendOtpEmail, sendPasswordResetSuccess } = require('../utils/email');
const { authLimiter, otpLimiter } = require('../middleware/security');
const { logFromRequest } = require('../utils/activityLogger');

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
};

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['client']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { name, email, password, role, phone, company, panNumber } = req.body;

      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }

      const user = await User.create({ name, email, password, role: role || 'client', phone, company, panNumber });
      const token = generateToken(user.id);
      const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

      res.status(201).json({ success: true, data: { user, token, refreshToken } });
      logFromRequest(req, { action: 'user_registered', entity: 'user', userId: user.id, module: 'Auth', details: `New user registered: ${user.name} (${user.role})` });
    } catch (error) {
      console.error('Register error:', error.message, error.stack);
      res.status(500).json({ success: false, message: 'Server error during registration' });
    }
  }
);

router.post(
  '/login', authLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    body('role').optional().isIn(['admin', 'advocate']).withMessage('Invalid login type'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email, password, role } = req.body;

      const user = await User.findByEmail(email);
      if (!user || !user.isActive) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      if (role && user.role !== role) {
        const tabLabel = role === 'admin' ? 'Admin' : 'Junior Advocate';
        return res.status(401).json({ success: false, message: `This account is not a ${tabLabel}. Please use the correct login tab.` });
      }

      const isMatch = await User.comparePassword(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      await User.updateById(user.id, { lastLogin: new Date().toISOString() });

      const safeUser = await User.findById(user.id);
      const token = generateToken(user.id);
      const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

      res.json({ success: true, data: { user: safeUser, token, refreshToken } });
      logFromRequest(req, { action: 'user_login', entity: 'user', userId: user.id, module: 'Auth', details: `User logged in: ${user.email}` });
    } catch (error) {
      console.error('Login error:', error.message);
      res.status(500).json({ success: false, message: 'Server error during login' });
    }
  }
);

router.post('/logout', auth, async (req, res) => {
  try {
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during logout' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    const newToken = generateToken(user.id);
    const newRefreshToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({ success: true, data: { token: newToken, refreshToken: newRefreshToken } });
  } catch (error) {
    console.error('Refresh token error:', error.message);
    res.status(500).json({ success: false, message: 'Server error refreshing token' });
  }
});

router.post('/google', async (req, res) => {
  try {
    const { email, name, googleId, avatar } = req.body;
    if (!email || !googleId) {
      return res.status(400).json({ success: false, message: 'Email and Google ID are required' });
    }
    let user = await User.findByEmail(email);
    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        password: crypto.randomBytes(16).toString('hex'),
        role: 'client',
        avatar: avatar || '',
      });
    }
    if (!user.googleId) {
      await User.updateById(user.id, { googleId });
    }
    const safeUser = await User.findById(user.id);
    const token = generateToken(user.id);
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, data: { user: safeUser, token, refreshToken } });
  } catch (error) {
    console.error('Google auth error:', error.message);
    res.status(500).json({ success: false, message: 'Server error during Google authentication' });
  }
});

router.post('/client-login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { email, password } = req.body;
    const user = await User.findByEmail(email);
    if (!user || user.role !== 'client') {
      return res.status(401).json({ success: false, message: 'Invalid credentials or not a client account' });
    }
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }
    const isMatch = await User.comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    await User.updateById(user.id, { lastLogin: new Date().toISOString() });
    const safeUser = await User.findById(user.id);
    const token = generateToken(user.id);
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, data: { user: safeUser, token, refreshToken } });
    logFromRequest(req, { action: 'client_login', entity: 'user', userId: user.id, module: 'Auth', details: `Client logged in: ${user.email}` });
  } catch (error) {
    console.error('Client login error:', error.message);
    res.status(500).json({ success: false, message: 'Server error during client login' });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/update-profile', auth, async (req, res) => {
  try {
    const { name, phone, firmName } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (firmName !== undefined) updates.firmName = firmName;

    const user = await User.updateById(req.user._id, updates);
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
});

router.post(
  '/change-password',
  auth,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;

      const user = await User.findByIdRaw(req.user._id);
      const isMatch = await User.comparePassword(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }

      await User.updatePassword(req.user._id, newPassword);
      res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error.message);
      res.status(500).json({ success: false, message: 'Server error changing password' });
    }
  }
);

router.post('/forgot-password', otpLimiter, [body('email').isEmail().withMessage('Valid email is required')], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const user = await User.findByEmail(req.body.email);
    if (!user) {
      return res.json({ success: true, message: 'If email exists, an OTP has been sent' });
    }

    const otp = String(crypto.randomInt(100000, 999999));
    const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await User.updateById(user.id, { passwordResetToken: otp, passwordResetExpires: expiry });

    console.log(`[FORGOT PASSWORD] OTP sent to ${user.email}`);

    await sendOtpEmail(user.email, user.name, otp);

    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (error) {
    console.error('Forgot password error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/verify-otp', otpLimiter, [body('email').isEmail(), body('otp').notEmpty()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, otp } = req.body;
    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    if (!user.passwordResetToken || user.passwordResetToken !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (user.passwordResetExpires && new Date(user.passwordResetExpires) < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/reset-password', [body('email').isEmail(), body('otp').notEmpty(), body('password').isLength({ min: 6 })], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, otp, password } = req.body;
    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    if (!user.passwordResetToken || user.passwordResetToken !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (user.passwordResetExpires && new Date(user.passwordResetExpires) < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    await User.updatePassword(user.id, password);
    await User.updateById(user.id, { passwordResetToken: null, passwordResetExpires: null });

    const safeUser = await User.findById(user.id);
    const token = generateToken(user.id);

    res.json({ success: true, data: { user: safeUser, token }, message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/upload-avatar', auth, uploadAvatar, handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await User.updateById(req.user.id, { avatar: avatarUrl });
    const user = await User.findById(req.user.id);
    res.json({ success: true, data: { user, avatar: avatarUrl } });
  } catch (error) {
    console.error('Upload avatar error:', error.message);
    res.status(500).json({ success: false, message: 'Server error uploading avatar' });
  }
});

module.exports = router;
