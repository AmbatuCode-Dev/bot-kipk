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
  const keywords = new Set(faq.keywords.map(normalize).filter((keyword) => keyword !== ''));
  return [...keywords].filter((keyword) => pesan.includes(` ${keyword} `)).length;
}

/**
 * Memilih FAQ yang paling cocok dengan pesan mahasiswa.
 *
 * @param {ReadonlyArray<{ id: number, keywords: readonly string[] }>} faqs hasil faqStore.getAll()
 * @param {string} normalizedText pesan yang sudah melewati normalize()
 * @param {{ threshold?: number }} [opsi] skor minimal agar dianggap cocok (bawaan 1)
 * @returns {object | null} FAQ dengan skor tertinggi (seri dimenangkan ID terkecil),
 *   atau null jika tidak ada yang mencapai ambang
 */
export function findBestFaq(faqs, normalizedText, { threshold = 1 } = {}) {
  let terbaik = null;
  let skorTerbaik = 0;
  for (const faq of faqs) {
    const skor = scoreFaq(faq, normalizedText);
    const menangSeri = skor === skorTerbaik && terbaik !== null && faq.id < terbaik.id;
    if (skor > skorTerbaik || menangSeri) {
      terbaik = faq;
      skorTerbaik = skor;
    }
  }
  return skorTerbaik >= threshold ? terbaik : null;
}
