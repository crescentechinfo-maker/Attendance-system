require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./src/routes/auth');
const employeeRoutes = require('./src/routes/employees');
const attendanceRoutes = require('./src/routes/attendance');
const leaveRoutes = require('./src/routes/leaves');
const reportRoutes = require('./src/routes/reports');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');
const logger = require('./src/config/logger');
const { query } = require('./src/config/database');
const bcrypt = require('bcryptjs');

const app = express();

// Security
app.use(helmet());
app.set('trust proxy', 1);

// CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Compression & parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.info(msg.trim()) },
    })
  );
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use('/api/', limiter);

// Auth rate limiter (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/reports', reportRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

const initAdmin = async () => {
  try {
    const existing = await query('SELECT id FROM users WHERE email = $1', ['admin123@gmail.com']);
    if (existing.rows.length === 0) {
      const hash = await bcrypt.hash('Admin123', 12);
      await query(
        `INSERT INTO users (email, password_hash, full_name, role, department, position, employee_id, is_active)
         VALUES ($1, $2, 'System Administrator', 'admin', 'IT', 'System Admin', 'EMP0001', true)`,
        ['admin123@gmail.com', hash]
      );
      logger.info('Admin account initialised.');
    }
  } catch (err) {
    logger.warn('Admin init skipped: ' + err.message);
  }
};

const PORT = parseInt(process.env.PORT) || 5000;

if (require.main === module) {
  app.listen(PORT, async () => {
    logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    await initAdmin();
  });
} else {
  initAdmin();
}

module.exports = app;
