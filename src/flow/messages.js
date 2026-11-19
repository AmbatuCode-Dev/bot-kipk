// Teks balasan bot. Semua kalimat di sini masih draf sampai teks final dari Analyst/Humas.

/** Batas panjang satu pesan teks WhatsApp Cloud API. */
export const BATAS_PANJANG = 4096;

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
