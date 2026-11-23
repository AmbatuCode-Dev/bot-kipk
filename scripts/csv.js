/**
 * Membaca teks CSV hasil "File > Download > CSV" dari Google Sheets menjadi
 * array baris, bentuknya sama dengan hasil values.get sehingga bisa langsung
 * diberikan ke parseFaq.
 *
 * @param {string} teks
 * @returns {string[][]}
 */
export function parseCsv(teks) {
  const hasil = [];
  let baris = [];
  let sel = '';
  let dalamKutip = false;

  for (let i = 0; i < teks.length; i += 1) {
    const c = teks[i];
    if (dalamKutip) {
      if (c === '"' && teks[i + 1] === '"') {
        sel += '"';
        i += 1;
      } else if (c === '"') {
        dalamKutip = false;
      } else {
        sel += c;
      }
    } else if (c === '"') {
      dalamKutip = true;
    } else if (c === ',') {
      baris.push(sel);
      sel = '';
    } else if (c === '\n') {
      baris.push(sel);
      hasil.push(baris);
      baris = [];
      sel = '';
    } else {
      sel += c;
    }
  }

  baris.push(sel);
  hasil.push(baris);
  return hasil;
}
