const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    user: req.user?.id,
  });

  if (err.code === '23505') {
    return res.status(409).json({ error: 'Duplicate entry. Record already exists.' });
  }

  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced record not found.' });
  }

  if (err.code === '22P02') {
    return res.status(400).json({ error: 'Invalid data format.' });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

const notFound = (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
};

module.exports = { errorHandler, notFound };
