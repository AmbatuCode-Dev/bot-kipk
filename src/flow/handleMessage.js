import { PESAN_BUKAN_TEKS, PESAN_GANGGUAN } from './messages.js';

/**
 * Pintu masuk alur percakapan (Dev B). Urutan pengecekan mengikuti canvas
 * bagian 3, dan setiap jalur berakhir dengan { body } untuk dikirim Dev A.
 *
 * @param {{ messageId: string, from: string, type: 'text' | 'other', text: string, timestamp: number }} ctx
 * @param {{ faqStore: { getAll(): Promise<ReadonlyArray<object>> } }} deps
 * @returns {Promise<{ body: string }>}
 */
export async function handleMessage(ctx, deps) {
  if (ctx.type !== 'text') return { body: PESAN_BUKAN_TEKS };

  try {
    await deps.faqStore.getAll();
  } catch {
    // Sesuai kesepakatan, error getAll() ditangkap di sini lalu mahasiswa diberi
    // tahu. Kontrak tidak meminjamkan logger, jadi pencatatan penyebabnya ada di Dev A.
    return { body: PESAN_GANGGUAN };
  }
  return { body: PESAN_GANGGUAN };
}
