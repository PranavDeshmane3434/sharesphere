function errorHandler(err, req, res, next) {
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message || 'Invalid input' } });
  }
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: { code: status === 500 ? 'INTERNAL_ERROR' : 'ERROR', message: err.message } });
}

module.exports = errorHandler;


