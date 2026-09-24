import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';
import env from './config/env.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import errorHandler from './middleware/errorHandler.js';
import { AppError } from './utils/AppError.js';
import routes from './routes/index.js';

const app = express();

// Security
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);

// Rate limiting (disabled in test to avoid flaky tests)
if (env.NODE_ENV !== 'test') {
  app.use(generalLimiter);
}

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// NoSQL injection sanitization
app.use(mongoSanitize());

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// API routes
app.use('/api/v1', routes);

// 404 handler
app.all('*', (req, _res, next) => {
  next(new AppError(`Cannot find ${req.method} ${req.originalUrl}`, 404));
});

// Global error handler
app.use(errorHandler);

export default app;
