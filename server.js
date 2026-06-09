require('dotenv').config();
const { connectDB, disconnectDB } = require('./src/config/db');
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

let server;

const start = async () => {
  await connectDB();
  server = app.listen(PORT, () => {
    console.log(`🚀 BONDS API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
};

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  if (server) server.close(async () => {
    await disconnectDB();
    console.log('Server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err.message);
  shutdown('unhandledRejection');
});

start();
