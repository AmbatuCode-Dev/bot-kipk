import * as flow from './flow/handleMessage.js';
import { createFaqStore } from './data/faqStore.js';
import { createSheetsReader } from './data/sheets.js';
import { createLogger } from './logger.js';
import { createWaClient } from './wa/client.js';
import { createPenjagaDuplikat } from './webhook/duplikat.js';
import { createWebhook } from './webhook/handler.js';

/**
 * Menyusun seluruh komponen bot dari konfigurasi. Dipakai bersama oleh entry
 * Vercel (api/webhook.js) dan entry VPS (server.js), supaya keduanya menjalankan
 * logika yang persis sama.
 *
 * Parameter selain config dan ackEarly hanya diisi pada pengujian.
 *
 * @param {object} opsi
 * @param {object} opsi.config hasil loadConfig
 * @param {boolean} [opsi.ackEarly=false] true hanya untuk proses yang terus berjalan (VPS)
 * @param {(ctx: object, deps: object) => Promise<{ body: string }>} [opsi.handleMessage] bawaannya dari src/flow/handleMessage.js
 * @param {{ info: Function, warn: Function, error: Function }} [opsi.logger]
 * @param {() => Promise<unknown[][]>} [opsi.ambilBaris] pengganti pembaca Google Sheets
 * @param {typeof fetch} [opsi.fetchImpl] pengganti fetch untuk WhatsApp Cloud API
 * @param {{ tandai: (id: string) => boolean }} [opsi.penjagaDuplikat]
 * @returns {{ webhook: (request: Request) => Promise<Response>, faqStore: { getAll: () => Promise<readonly object[]> }, logger: object }}
 * @throws {TypeError} bila handleMessage belum diekspor oleh src/flow/handleMessage.js
 */
export function createApp({
  config,
  ackEarly = false,
  handleMessage = flow.handleMessage,
  logger = createLogger(),
  ambilBaris,
  fetchImpl,
  penjagaDuplikat = createPenjagaDuplikat(),
}) {
  if (typeof handleMessage !== 'function') {
    throw new TypeError('handleMessage belum tersedia: ekspor fungsi handleMessage dari src/flow/handleMessage.js');
  }

  const faqStore = createFaqStore({
    ambilBaris:
      ambilBaris ??
      createSheetsReader({
        credentials: config.google.credentials,
        sheetId: config.google.sheetId,
        sheetTab: config.google.sheetTab,
      }),
    ttlMs: config.faqCacheTtlSeconds * 1000,
    logger,
  });

  const waClient = createWaClient({
    accessToken: config.wa.accessToken,
    phoneNumberId: config.wa.phoneNumberId,
    apiVersion: config.wa.apiVersion,
    fetchImpl,
  });

  const deps = Object.freeze({ faqStore: Object.freeze({ getAll: () => faqStore.getAll() }) });
  const webhook = createWebhook({ config, handleMessage, deps, waClient, logger, penjagaDuplikat, ackEarly });

  return Object.freeze({ webhook, faqStore, logger });
}
