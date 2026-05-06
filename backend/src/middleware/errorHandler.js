/**
 * Global Error Handling Middleware
 */
export const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Ichki server xatosi yuz berdi';

  // Log error for developers
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.url} - Error: ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  res.status(status).json({
    success: false,
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};
