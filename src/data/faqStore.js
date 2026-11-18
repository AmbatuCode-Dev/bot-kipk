import { ringkasError } from '../logger.js';
import { parseFaq } from './parseFaq.js';

const JEDA_ULANG_BAWAAN_MS = 15_000;

export class FaqStoreError extends Error {
  constructor(message, opsi) {
    super(message, opsi);
    this.name = 'FaqStoreError';
  }
}

/**
 * Penyimpan FAQ dengan cache di memori.
 *
 * - Selama umur cache belum melewati TTL, getAll() tidak menyentuh Sheets.
 * - Panggilan bersamaan saat cache kedaluwarsa berbagi satu permintaan ke Sheets.
 * - Jika pembacaan gagal tetapi cache lama masih ada, cache lama dipakai dan
 *   percobaan berikutnya ditunda sejenak agar Sheets tidak dibanjiri.
 * - Jika gagal dan belum pernah ada cache, getAll() melempar FaqStoreError.
 *
 * @param {object} opsi
 * @param {() => Promise<unknown[][]>} opsi.ambilBaris pembaca Sheets
 * @param {number} opsi.ttlMs umur cache dalam milidetik. 0 berarti selalu baca.
 * @param {{ info: Function, warn: Function }} opsi.logger
 * @param {number} [opsi.jedaUlangMs]
 * @param {() => number} [opsi.now]
 */
export function createFaqStore({ ambilBaris, ttlMs, logger, jedaUlangMs = JEDA_ULANG_BAWAAN_MS, now = Date.now }) {
  let cache = null;
  let jedaSampai = 0;
  let berjalan = null;

  async function muat() {
    const data = parseFaq(await ambilBaris(), { logger });
    cache = { data, diambilPada: now() };
    jedaSampai = 0;
    logger.info('faq_dimuat', { jumlah: data.length });
    return data;
  }

  return Object.freeze({
    /**
     * @returns {Promise<ReadonlyArray<{ id: number, kategori: string, keywords: readonly string[], jawaban: string }>>}
     *   FAQ aktif terurut menurut ID. Isinya beku sehingga tidak bisa merusak cache.
     * @throws {FaqStoreError}
     */
    async getAll() {
      const sekarang = now();
      if (cache && sekarang - cache.diambilPada < ttlMs) return cache.data;
      if (cache && sekarang < jedaSampai) return cache.data;

      if (!berjalan) {
        berjalan = muat().finally(() => {
          berjalan = null;
        });
      }

      try {
        return await berjalan;
      } catch (err) {
        jedaSampai = now() + jedaUlangMs;
        if (cache) {
          logger.warn('faq_pakai_cache_lama', { umurDetik: Math.round((now() - cache.diambilPada) / 1000), ...ringkasError(err) });
          return cache.data;
        }
        throw new FaqStoreError('Data FAQ tidak bisa dibaca dan belum ada cache', { cause: err });
      }
    },
  });
}
