import { createHash, timingSafeEqual } from 'node:crypto';
import { anonimkanNomor, ringkasError } from '../logger.js';
import { ekstrakPesan } from './payload.js';
import { verifySignature } from './signature.js';

const BATAS_BODY_BYTE = 1024 * 1024;
const PANJANG_TANTANGAN_MAKS = 256;
const PESAN_DARURAT = 'Maaf, sedang terjadi gangguan. Silakan coba lagi beberapa saat lagi.';

function respons(status, isi, header = {}) {
  return new Response(isi, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...header,
    },
  });
}

/** Perbandingan string yang waktunya tidak bergantung pada letak karakter yang berbeda. */
function samaAman(a, b) {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

/**
 * Membuat handler webhook WhatsApp yang bekerja dengan Request dan Response
 * standar web, sehingga bisa dipakai oleh entry Vercel maupun server Node.
 *
 * @param {object} opsi
 * @param {object} opsi.config hasil loadConfig
 * @param {(ctx: object, deps: object) => Promise<{ body: string }>} opsi.handleMessage handler percakapan (Dev B)
 * @param {object} opsi.deps dependensi yang dipinjamkan ke handleMessage
 * @param {{ sendText: (to: string, body: string) => Promise<unknown> }} opsi.waClient
 * @param {{ info: Function, warn: Function, error: Function }} opsi.logger
 * @param {{ tandai: (id: string) => boolean }} opsi.penjagaDuplikat
 * @param {boolean} [opsi.ackEarly=false] true: balas 200 ke Meta dulu, pesan diproses setelahnya.
 *   Hanya aman pada proses yang terus berjalan (VPS). Pada serverless harus false,
 *   karena fungsi dihentikan begitu respons terkirim.
 * @param {() => number} [opsi.now]
 * @returns {(request: Request) => Promise<Response>}
 */
export function createWebhook({ config, handleMessage, deps, waClient, logger, penjagaDuplikat, ackEarly = false, now = Date.now }) {
  function verifikasi(url) {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const tantangan = url.searchParams.get('hub.challenge');

    if (mode !== 'subscribe' || token === null || tantangan === null) {
      return respons(403, 'Forbidden');
    }
    if (!samaAman(token, config.wa.verifyToken)) {
      logger.warn('verifikasi_ditolak', { alasan: 'verify_token_salah' });
      return respons(403, 'Forbidden');
    }
    if (tantangan === '' || tantangan.length > PANJANG_TANTANGAN_MAKS) {
      return respons(400, 'Bad Request');
    }
    return respons(200, tantangan);
  }

  async function prosesPesan(ctx) {
    if (!penjagaDuplikat.tandai(ctx.messageId)) {
      logger.info('pesan_duplikat', { messageId: ctx.messageId });
      return;
    }

    const mulai = now();
    const pengirim = anonimkanNomor(ctx.from, config.wa.appSecret);
    let body;
    let jalur = 'handler';

    try {
      const hasil = await handleMessage(Object.freeze({ ...ctx }), deps);
      body = hasil?.body;
      if (typeof body !== 'string' || body.trim() === '') {
        throw new TypeError('handleMessage harus mengembalikan { body } berisi teks');
      }
    } catch (err) {
      logger.error('handler_gagal', { messageId: ctx.messageId, pengirim, ...ringkasError(err) });
      body = PESAN_DARURAT;
      jalur = 'darurat';
    }

    try {
      await waClient.sendText(ctx.from, body);
      logger.info('balasan_terkirim', { messageId: ctx.messageId, pengirim, tipe: ctx.type, jalur, durasiMs: now() - mulai });
    } catch (err) {
      logger.error('balasan_gagal', { messageId: ctx.messageId, pengirim, jalur, ...ringkasError(err) });
    }
  }

  async function prosesSemua(daftarPesan) {
    for (const ctx of daftarPesan) {
      try {
        await prosesPesan(ctx);
      } catch (err) {
        logger.error('proses_pesan_gagal', { messageId: ctx.messageId, ...ringkasError(err) });
      }
    }
  }

  async function terima(request) {
    const panjangDeklarasi = Number(request.headers.get('content-length'));
    if (Number.isFinite(panjangDeklarasi) && panjangDeklarasi > BATAS_BODY_BYTE) {
      return respons(413, 'Payload Too Large');
    }

    let raw;
    try {
      raw = Buffer.from(await request.arrayBuffer());
    } catch {
      return respons(400, 'Bad Request');
    }
    if (raw.length > BATAS_BODY_BYTE) return respons(413, 'Payload Too Large');

    if (!verifySignature(raw, request.headers.get('x-hub-signature-256'), config.wa.appSecret)) {
      logger.warn('signature_tidak_valid');
      return respons(401, 'Unauthorized');
    }

    let payload;
    try {
      payload = JSON.parse(raw.toString('utf8'));
    } catch {
      logger.warn('payload_bukan_json');
      return respons(400, 'Bad Request');
    }

    const { pesan, dilewati } = ekstrakPesan(payload, config.wa.phoneNumberId);
    if (dilewati > 0) logger.warn('pesan_dilewati', { jumlah: dilewati });

    const kerja = prosesSemua(pesan);
    if (!ackEarly) await kerja;
    return respons(200, 'OK');
  }

  return async function webhook(request) {
    if (request.method === 'GET') return verifikasi(new URL(request.url));
    if (request.method === 'POST') return terima(request);
    return respons(405, 'Method Not Allowed', { Allow: 'GET, POST' });
  };
}
