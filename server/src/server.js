import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Start server
    const server = app.listen(env.PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🛍️  Abaya House E-Commerce API                         ║
║                                                           ║
║   Environment: ${env.NODE_ENV.padEnd(43)}║
║   Port: ${String(env.PORT).padEnd(50)}║
║   URL: ${`http://localhost:${env.PORT}`.padEnd(51)}║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const gracefulShutdown = async signal => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        console.log('HTTP server closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', error => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
