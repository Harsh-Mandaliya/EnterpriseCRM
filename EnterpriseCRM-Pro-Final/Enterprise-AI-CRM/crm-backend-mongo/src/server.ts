import type { Server } from 'http';

import { app } from '@/app';
import { env } from '@/config/env';
import { connectDatabase, disconnectDatabase } from '@/config/database';
import { logger } from '@/utils/logger';

let server: Server | null = null;

async function main() {
  await connectDatabase();
  server = app.listen(env.port, '0.0.0.0', () => {
    logger.info(`CRM backend listening on http://0.0.0.0:${env.port}`);
    logger.info(`Health check: http://localhost:${env.port}/api/v1/health`);
  });
}

/* ============================================================
   GRACEFUL SHUTDOWN
   Stop accepting connections, let in-flight requests finish,
   then close MongoDB. Force-exit if that takes too long.
============================================================ */

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`${signal} received, shutting down`);

  const forceExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server!.close(err => (err ? reject(err) : resolve())),
      );
    }
    await disconnectDatabase();
    process.exit(0);
  } catch (err) {
    logger.error('Error during shutdown', err);
    process.exit(1);
  }
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

process.on('unhandledRejection', reason => {
  logger.error('Unhandled promise rejection', reason);
});

main().catch(err => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
