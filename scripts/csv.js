/**
 * Membaca teks CSV hasil "File > Download > CSV" dari Google Sheets menjadi
 * array baris, bentuknya sama dengan hasil values.get sehingga bisa langsung
 * diberikan ke parseFaq.
 *
 * @param {string} teks
 * @returns {string[][]}
 */
export function parseCsv(masukan) {
  const teks = masukan.startsWith('﻿') ? masukan.slice(1) : masukan;
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
    } else if (c === '\r') {
      // Akhir baris Windows (\r\n): cukup \n yang menutup baris
    } else if (c === '\n') {
      baris.push(sel);
      hasil.push(baris);
      baris = [];
      sel = '';
    } else {
      sel += c;
    }
  }

  // Berkas yang diakhiri baris baru tidak menyisakan baris kosong
  if (baris.length > 0 || sel !== '') {
    baris.push(sel);
    hasil.push(baris);
  }
  return hasil;
}
