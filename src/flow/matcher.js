/**
 * Menghitung skor sebuah FAQ terhadap pesan mahasiswa.
 * Skor = jumlah kata kunci yang muncul sebagai kata utuh di pesan.
 *
 * @param {{ keywords: readonly string[] }} faq item dari faqStore.getAll()
 * @param {string} normalizedText pesan yang sudah melewati normalize()
 * @returns {number}
 */
export function scoreFaq(faq, normalizedText) {
  const kata = new Set(normalizedText.split(' '));
  return faq.keywords.filter((keyword) => kata.has(keyword)).length;
}
