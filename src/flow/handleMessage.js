import { PESAN_BUKAN_TEKS } from './messages.js';

/**
 * Pintu masuk alur percakapan (Dev B). Urutan pengecekan mengikuti canvas
 * bagian 3, dan setiap jalur berakhir dengan { body } untuk dikirim Dev A.
 *
 * @param {{ messageId: string, from: string, type: 'text' | 'other', text: string, timestamp: number }} ctx
 * @param {{ faqStore: { getAll(): Promise<ReadonlyArray<object>> } }} deps
 * @returns {Promise<{ body: string }>}
 */
export async function handleMessage(ctx, deps) {
  return { body: PESAN_BUKAN_TEKS };
}
