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

/** Pengganti daftar menu saat tidak ada satu pun FAQ yang aktif. */
export const PESAN_MENU_KOSONG = 'Saat ini belum ada pertanyaan yang tersedia.';

/** Judul kelompok menu untuk FAQ yang kolom Kategori-nya dikosongkan Humas. */
const KATEGORI_CADANGAN = 'Lainnya';

/**
 * Menyusun daftar menu: FAQ dikelompokkan per kategori, nomornya memakai ID
 * sehingga mahasiswa cukup mengetik angka itu untuk membuka jawabannya.
 * @param {ReadonlyArray<{ id: number, kategori: string, pertanyaan: string }>} faqs hasil faqStore.getAll()
 * @returns {string}
 */
export function formatMenu(faqs) {
  if (faqs.length === 0) return PESAN_MENU_KOSONG;

  // Map menjaga urutan kategori sesuai kemunculan pertamanya
  const kelompok = new Map();
  for (const faq of faqs) {
    const kategori = faq.kategori || KATEGORI_CADANGAN;
    const baris = kelompok.get(kategori) ?? [];
    baris.push(`${faq.id}. ${faq.pertanyaan}`);
    kelompok.set(kategori, baris);
  }
  return [...kelompok]
    .map(([kategori, baris]) => [`*${kategori}*`, ...baris].join('\n'))
    .join('\n\n');
}

/** Kalimat penutup setiap jawaban FAQ. */
export const PENUTUP_JAWABAN = 'Ketik *menu* untuk melihat daftar pertanyaan lain.';

/**
 * Menyusun balasan untuk satu FAQ. Jawaban yang terlalu panjang dipotong
 * lebih dulu, sehingga kalimat penutup tetap terkirim utuh.
 * @param {{ jawaban: string }} faq item dari faqStore.getAll()
 * @returns {string}
 */
export function formatJawaban(faq) {
  const pemisah = '\n\n';
  const ruangJawaban = BATAS_PANJANG - [...pemisah].length - [...PENUTUP_JAWABAN].length;
  return `${batasiPanjang(faq.jawaban, ruangJawaban)}${pemisah}${PENUTUP_JAWABAN}`;
}
