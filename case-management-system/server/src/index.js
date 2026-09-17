const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const logger = require('./utils/logger');

const validateEnv = () => {
  if (process.env.NODE_ENV === 'production') {
    const required = ['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'CLIENT_URL'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required production env vars: ${missing.join(', ')}`);
    }
  }
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    logger.warn('JWT_SECRET is less than 32 characters. Consider using a longer secret for production.');
  }
};

const { initDB } = require('./config/db');
const { startAllCronJobs } = require('./services/cronJobs');
const { auth } = require('./middleware/auth');
const { apiLimiter, sanitizeInput, securityHeaders, compressResponse } = require('./middleware/security');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const caseRoutes = require('./routes/cases');
const clientRoutes = require('./routes/clients');
const documentRoutes = require('./routes/documents');
const invoiceRoutes = require('./routes/invoices');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');
const dashboardRoutes = require('./routes/dashboard');
const clientPortalRoutes = require('./routes/client-portal');
const clientDataRoutes = require('./routes/client-data');
const hearingRoutes = require('./routes/hearings');
const taskRoutes = require('./routes/tasks');
const activityLogRoutes = require('./routes/activityLogs');
const searchRoutes = require('./routes/search');
const ecourtsRoutes = require('./routes/ecourts');
const paymentRoutes = require('./routes/payments');
const caseUpdateRoutes = require('./routes/caseUpdates');
const assignmentRoutes = require('./routes/assignments');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const startServer = async () => {
  try {
    validateEnv();
    await initDB();
    logger.info('Database initialized successfully');

    app.use(securityHeaders);
    app.use(compressResponse);

    const isProd = process.env.NODE_ENV === 'production';
    const allowedOrigins = [];
    if (process.env.CLIENT_URL) allowedOrigins.push(process.env.CLIENT_URL);
    if (!isProd) {
      allowedOrigins.push('http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174');
      // Allow local network access
      const os = require('os');
      const interfaces = os.networkInterfaces();
      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
          if (iface.family === 'IPv4' && !iface.internal) {
            allowedOrigins.push(`http://${iface.address}:5173`);
          }
        }
      }
    }

    app.use(cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    }));

    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    app.use(sanitizeInput);
    app.use('/api', (req, res, next) => { if (req.path === '/api/health') return next(); apiLimiter(req, res, next); });

    app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

    const clientDist = path.join(__dirname, '../../client/dist');
    if (isProd && require('fs').existsSync(clientDist)) {
      app.use(express.static(clientDist));
    }

    app.use('/api/auth', authRoutes);
    app.use('/api/cases', caseRoutes);
    app.use('/api/clients', clientRoutes);
    app.use('/api/documents', documentRoutes);
    app.use('/api/invoices', invoiceRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/notifications', notificationRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/client-portal', clientPortalRoutes);
    app.use('/api/client', clientDataRoutes);
    app.use('/api/hearings', hearingRoutes);
    app.use('/api/tasks', taskRoutes);
    app.use('/api/activity-logs', activityLogRoutes);
    app.use('/api/search', searchRoutes);
    app.use('/api/ecourts', ecourtsRoutes);
    app.use('/api/payments', paymentRoutes);
    app.use('/api/case-updates', caseUpdateRoutes);
    app.use('/api/assignments', assignmentRoutes);

    app.get('/api/team', auth, async (req, res) => {
      try {
        const { queryAll, queryOne } = require('./config/db');
        const members = await queryAll(
          "SELECT id, name, email, role, phone, avatar, firmName, advocateId, createdAt FROM users WHERE role IN ('advocate','staff','manager') AND isActive = 1 ORDER BY name"
        );
        const enriched = await Promise.all(members.map(async (m) => {
          const casesResult = await queryOne('SELECT COUNT(*) as c FROM case_advocates WHERE userId = ?', [m.id]);
          return { ...m, _id: m.id, joinedAt: m.createdAt, casesCount: casesResult?.c || 0 };
        }));
        res.json({ success: true, data: enriched });
      } catch (error) {
        logger.error('Get team error:', error.message);
        res.json({ success: true, data: [] });
      }
    });

    app.post('/api/team/invite', auth, async (req, res) => {
      try {
        const User = require('./models/User');
        const { name, email, role, phone, password } = req.body;
        if (!name || !email) {
          return res.status(400).json({ success: false, message: 'Name and email are required' });
        }
        if (!password || password.length < 6) {
          return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }
        const existing = await User.findByEmail(email);
        if (existing) {
          return res.status(400).json({ success: false, message: 'Email already registered' });
        }
        const roleMap = { 'Admin': 'admin', 'Advocate': 'advocate', 'Paralegal': 'staff', 'Accountant': 'staff', 'Intern': 'staff' };
        const user = await User.create({
          name, email, password,
          role: roleMap[role] || 'staff', phone: phone || null, firmName: '',
        });
        res.status(201).json({ success: true, data: { id: user.id, email }, message: 'Team member created' });
      } catch (error) {
        logger.error('Invite team member error:', error.message);
        res.status(500).json({ success: false, message: 'Server error creating team member' });
      }
    });

    app.get('/api/health', (req, res) => {
      res.json({
        success: true,
        message: 'Case Management System API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
      });
    });

    app.post('/api/admin/backup', auth, async (req, res) => {
      try {
        const { backup } = require('./utils/backup');
        const result = backup();
        res.json(result);
      } catch (error) {
        res.status(500).json({ success: false, message: 'Backup failed' });
      }
    });

    app.use((req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
      }
      const clientDist = path.join(__dirname, '../../client/dist');
      if (require('fs').existsSync(clientDist)) {
        return res.sendFile(path.join(clientDist, 'index.html'));
      }
      res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
    });

    app.use(errorHandler);

    app.listen(PORT, HOST, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Host: ${HOST} (0.0.0.0 = all interfaces, accessible from LAN)`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Local access:   http://localhost:${PORT}/api/health`);
      const os = require('os');
      const interfaces = os.networkInterfaces();
      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
          if (iface.family === 'IPv4' && !iface.internal) {
            logger.info(`LAN access:     http://${iface.address}:${PORT}/api/health`);
          }
        }
      }
      startAllCronJobs();
    });
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
