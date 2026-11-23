/**
 * Membaca teks CSV hasil "File > Download > CSV" dari Google Sheets menjadi
 * array baris, bentuknya sama dengan hasil values.get sehingga bisa langsung
 * diberikan ke parseFaq.
 *
 * @param {string} teks
 * @returns {string[][]}
 */
export function parseCsv(teks) {
  return teks.split('\n').map((baris) => baris.split(','));
}
