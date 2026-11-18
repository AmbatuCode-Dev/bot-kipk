import { createHmac, timingSafeEqual } from 'node:crypto';

const AWALAN = 'sha256=';
const HEX_SHA256 = /^[0-9a-f]{64}$/i;

/**
 * Memeriksa header X-Hub-Signature-256 dari Meta.
 *
 * HMAC-SHA256 harus dihitung dari byte mentah body, bukan dari hasil parse JSON
 * yang diserialisasi ulang, karena Meta menandatangani byte aslinya. Pembanding
 * memakai timingSafeEqual agar waktu respons tidak membocorkan kecocokan.
 *
 * @param {Buffer | Uint8Array | string} rawBody body persis seperti yang diterima
 * @param {string | null | undefined} header isi header X-Hub-Signature-256
 * @param {string} appSecret App Secret dari dashboard Meta
 * @returns {boolean} true hanya jika signature cocok
 * @throws {TypeError} jika appSecret kosong atau rawBody bukan byte atau string
 */
export function verifySignature(rawBody, header, appSecret) {
  if (typeof appSecret !== 'string' || appSecret === '') {
    throw new TypeError('appSecret wajib berupa string yang tidak kosong');
  }
  if (typeof rawBody !== 'string' && !(rawBody instanceof Uint8Array)) {
    throw new TypeError('rawBody harus berupa string, Buffer, atau Uint8Array');
  }
  if (typeof header !== 'string' || !header.startsWith(AWALAN)) return false;

  const diterima = header.slice(AWALAN.length);
  if (!HEX_SHA256.test(diterima)) return false;

  const seharusnya = createHmac('sha256', appSecret).update(rawBody).digest();
  return timingSafeEqual(seharusnya, Buffer.from(diterima, 'hex'));
}
