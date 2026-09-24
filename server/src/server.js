import app from './app.js';
import env from './config/env.js';
import connectDB from './config/db.js';

const startServer = async () => {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.log(`EventForge API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err);
    server.close(() => process.exit(1));
  });
};

startServer();
