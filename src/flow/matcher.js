import { normalize } from './normalize.js';

/**
 * Menghitung skor sebuah FAQ terhadap pesan mahasiswa.
 * Skor = jumlah kata kunci yang muncul sebagai kata atau frasa utuh di pesan.
 * Kata kunci dari Sheets hanya di-split dan di-trim oleh FAQ Store, jadi di sini
 * dinormalisasi dengan aturan yang sama seperti pesan.
 *
 * Pencocokan memakai pencarian string biasa yang diapit spasi, bukan regex dari
 * input, sehingga waktu prosesnya tetap linear terhadap panjang pesan.
 *
 * @param {{ keywords: readonly string[] }} faq item dari faqStore.getAll()
 * @param {string} normalizedText pesan yang sudah melewati normalize()
 * @returns {number}
 */
export function scoreFaq(faq, normalizedText) {
  const pesan = ` ${normalizedText} `;
  return faq.keywords.filter((keyword) => pesan.includes(` ${normalize(keyword)} `)).length;
}
