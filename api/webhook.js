import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createLogger, ringkasError } from '../src/logger.js';

const logger = createLogger();
let app;

function ambilApp() {
  app ??= createApp({ config: loadConfig(), logger });
  return app;
}

async function tangani(request) {
  try {
    return await ambilApp().webhook(request);
  } catch (err) {
    logger.error('webhook_gagal', ringkasError(err));
    return new Response('Internal Server Error', { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

export const GET = tangani;
export const POST = tangani;
