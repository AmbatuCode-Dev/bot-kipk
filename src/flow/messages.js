// Teks balasan bot. Semua kalimat di sini masih draf sampai teks final dari Analyst/Humas.

/** Batas panjang satu pesan teks WhatsApp Cloud API. */
export const BATAS_PANJANG = 4096;

/** Balasan untuk pesan selain teks (gambar, stiker, suara, dokumen, dan lainnya). */
export const PESAN_BUKAN_TEKS =
  'Maaf, bot ini hanya bisa membaca pesan teks. Ketik *menu* untuk melihat daftar pertanyaan yang bisa dijawab.';

/** Balasan saat data FAQ tidak bisa diambil (Google Sheets gagal dan belum ada cache). */
export const PESAN_GANGGUAN =
  'Maaf, bot sedang mengalami gangguan sehingga belum bisa menjawab. Silakan coba lagi beberapa saat lagi.';

/**
 * Memastikan teks tidak melebihi batas WhatsApp. Dihitung per code point,
 * sama seperti WA Client, sehingga emoji tidak terbelah di tengah.
 * @param {string} teks
 * @param {number} [maks]
 * @returns {string}
 */
export function batasiPanjang(teks, maks = BATAS_PANJANG) {
  const karakter = [...teks];
  if (karakter.length <= maks) return teks;
  return `${karakter.slice(0, maks - 1).join('')}…`;
}

/** Kalimat penutup setiap jawaban FAQ. */
export const PENUTUP_JAWABAN = 'Ketik *menu* untuk melihat daftar pertanyaan lain.';

/**
 * Menyusun balasan untuk satu FAQ.
 * @param {{ jawaban: string }} faq item dari faqStore.getAll()
 * @returns {string}
 */
export function formatJawaban(faq) {
  return `${faq.jawaban}\n\n${PENUTUP_JAWABAN}`;
}
