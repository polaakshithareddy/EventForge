import env from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const handleCastError = (err) => {
  return new AppError(`Invalid ${err.path}: ${err.value}`, 400);
};

const handleDuplicateKey = (err) => {
  const field = Object.keys(err.keyValue)[0];
  return new AppError(
    `Duplicate value for field '${field}'. Please use another value.`,
    409,
  );
};

const handleMongooseValidation = (err) => {
  const errors = Object.values(err.errors).map((e) => ({
    field: e.path,
    message: e.message,
  }));
  return new AppError('Validation failed', 400, errors);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again.', 401);

const handleJWTExpiredError = () =>
  new AppError('Token expired. Please log in again.', 401);

const errorHandler = (err, _req, res, _next) => {
  let error = { ...err, message: err.message, stack: err.stack };

  if (err.name === 'CastError') error = handleCastError(err);
  if (err.code === 11000) error = handleDuplicateKey(err);
  if (err.name === 'ValidationError' && !err.isOperational)
    error = handleMongooseValidation(err);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  const statusCode = error.statusCode || 500;

  const response = {
    success: false,
    message: error.message || 'Internal server error',
  };

  if (error.errors) response.errors = error.errors;
  if (error.details) response.details = error.details;
  if (env.NODE_ENV === 'development') response.stack = error.stack;

  if (statusCode >= 500) {
    console.error('Server Error:', err);
  }

  res.status(statusCode).json(response);
};

export default errorHandler;
