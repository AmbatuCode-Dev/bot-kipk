import { createServer } from 'node:http';
import { createApp } from './src/app.js';
import { loadConfig } from './src/config.js';
import { createLogger, ringkasError } from './src/logger.js';
import { createNodeListener } from './src/webhook/nodeAdapter.js';

const logger = createLogger();

let app;
let config;
try {
  config = loadConfig();
  app = createApp({ config, logger, ackEarly: true });
} catch (err) {
  logger.error('startup_gagal', ringkasError(err));
  process.exit(1);
}

const rute = new Map([
  ['/webhook', app.webhook],
  ['/api/webhook', app.webhook],
  ['/healthz', async () => new Response('{"status":"ok"}', { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })],
]);

const server = createServer(createNodeListener({ rute, logger }));
server.headersTimeout = 15_000;
server.requestTimeout = 30_000;
server.keepAliveTimeout = 5_000;

server.listen(config.port, config.host, () => {
  logger.info('server_berjalan', { host: config.host, port: config.port });
  app.faqStore.getAll().catch((err) => logger.warn('startup_faq_gagal', ringkasError(err)));
});

function berhenti(sinyal) {
  logger.info('server_berhenti', { sinyal });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => berhenti('SIGTERM'));
process.on('SIGINT', () => berhenti('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.error('uncaught_exception', ringkasError(err));
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  logger.error('unhandled_rejection', ringkasError(err));
  process.exit(1);
});
