import { normalize } from './normalize.js';
import { PESAN_BUKAN_TEKS, PESAN_GANGGUAN, formatJawaban, pesanSapaan } from './messages.js';

/** Pesan yang isinya hanya angka dianggap memilih nomor menu. */
const POLA_ANGKA = /^\d+$/;

/**
 * Kata yang membuat pesan dianggap sapaan atau permintaan menu, ditambah kata
 * panggilan yang biasa menyertainya. Draf, menunggu daftar final dari Analyst.
 * Ditulis dalam bentuk yang sudah dinormalisasi.
 */
const KATA_SAPAAN = new Set([
  'menu',
  'halo', 'hallo', 'helo', 'hai', 'hay', 'hi', 'hello', 'hei',
  'assalamualaikum', 'assalamu', 'alaikum', 'salam', 'wr', 'wb', 'warahmatullahi', 'wabarakatuh',
  'selamat', 'pagi', 'siang', 'sore', 'malam', 'permisi',
  'kak', 'ka', 'kakak', 'min', 'mimin', 'admin', 'bang', 'mas', 'mba', 'mbak',
]);

/** Sapaan bila setiap kata di pesan ada di KATA_SAPAAN, jadi "halo kak kapan cair" bukan sapaan. */
function adalahSapaan(teks) {
  return teks.split(' ').every((kata) => KATA_SAPAAN.has(kata));
}

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

  const teks = normalize(ctx.text);

  let faqs;
  try {
    faqs = await deps.faqStore.getAll();
  } catch {
    // Sesuai kesepakatan, error getAll() ditangkap di sini lalu mahasiswa diberi
    // tahu. Kontrak tidak meminjamkan logger, jadi pencatatan penyebabnya ada di Dev A.
    return { body: PESAN_GANGGUAN };
  }

  if (adalahSapaan(teks)) return { body: pesanSapaan(faqs) };

  if (POLA_ANGKA.test(teks)) {
    const dipilih = faqs.find((faq) => faq.id === Number(teks));
    if (dipilih) return { body: formatJawaban(dipilih) };
  }

  return { body: PESAN_GANGGUAN };
}
