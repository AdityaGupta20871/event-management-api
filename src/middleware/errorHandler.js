/**
 * Centralised error-handling middleware.
 * Express recognises a 4-argument function as an error handler.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);

  const status  = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({ success: false, message });
}

module.exports = errorHandler;
