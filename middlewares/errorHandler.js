// middlewares/errorHandler.js
module.exports = function errorHandler(err, _req, res, _next) {
  // Normalize CORS errors into a clean JSON response
  if (err && typeof err.message === 'string' && err.message.toLowerCase().includes('cors')) {
    return res.status(403).json({ error: 'CORS blocked: origin not allowed' });
  }
  const status = err.status || 500;
  if (process.env.NODE_ENV === 'production') {
    return res.status(status).json({ error: 'Internal Server Error' });
  }
  return res.status(status).json({ error: err.message || 'Internal Error', stack: err.stack });
};
