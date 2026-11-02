const winston = require('winston');
const path = require('path');
const fs = require('fs');

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const isDev = process.env.NODE_ENV !== 'production';

const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      const stackStr = stack ? `\n${stack}` : '';
      return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}${stackStr}`;
    })
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    }),
  ],
});

// Always log to stdout as well: hosted platforms (Render, Docker, etc.) collect
// logs from the process output, so without this production errors are invisible.
logger.add(new winston.transports.Console({
  format: winston.format.combine(
    isDev ? winston.format.colorize() : winston.format.uncolorize(),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      const stackStr = stack ? `\n${stack}` : '';
      return `[${timestamp}] ${level}: ${message}${stackStr}`;
    })
  ),
}));

module.exports = logger;
