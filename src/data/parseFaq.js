/** Urutan dan nama kolom tab FAQ. Baris pertama di Sheet harus persis seperti ini. */
export const KOLOM_HEADER = Object.freeze(['ID', 'Kategori', 'Kata Kunci', 'Teks Jawaban', 'Aktif']);

const POLA_ID = /^\d{1,9}$/;
const PANJANG_JAWABAN_PERINGATAN = 4096;

export class FaqFormatError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FaqFormatError';
  }
}

function sel(baris, indeks) {
  const nilai = baris[indeks];
  return nilai === undefined || nilai === null ? '' : String(nilai);
}

/**
 * Mengubah baris mentah dari Google Sheets menjadi daftar FAQ aktif.
 *
 * Aturan:
 * - Header harus sesuai KOLOM_HEADER, jika tidak seluruh pembacaan dianggap gagal
 *   sehingga bot tidak menjawab dari kolom yang salah.
 * - Baris kosong dan baris dengan Aktif selain TRUE dilewati tanpa peringatan.
 * - Baris aktif dengan ID kosong, bukan angka, atau dobel (yang dipakai baris
 *   paling atas), serta tanpa jawaban, dilewati dan dicatat sebagai peringatan.
 * - Kata kunci dipecah per koma dan di-trim. Normalisasi huruf dilakukan Dev B.
 * - Hasil diurutkan menurut ID dan seluruhnya dibekukan.
 *
 * @param {unknown[][]} baris hasil values.get, termasuk baris header
 * @param {{ logger: { warn: Function } }} opsi
 * @returns {ReadonlyArray<Readonly<{ id: number, kategori: string, keywords: readonly string[], jawaban: string }>>}
 * @throws {FaqFormatError} bila header tidak ada atau tidak sesuai
 */
export function parseFaq(baris, { logger }) {
  if (!Array.isArray(baris) || baris.length === 0) {
    throw new FaqFormatError('Tab FAQ kosong, baris header tidak ditemukan');
  }

  const header = KOLOM_HEADER.map((_nama, i) => sel(baris[0], i).trim().toLowerCase());
  const seharusnya = KOLOM_HEADER.map((nama) => nama.toLowerCase());
  if (header.some((nama, i) => nama !== seharusnya[i])) {
    throw new FaqFormatError(`Header tab FAQ harus berurutan: ${KOLOM_HEADER.join(', ')}`);
  }

  const dipakai = new Set();
  const hasil = [];

  for (let i = 1; i < baris.length; i += 1) {
    const nomorBaris = i + 1;
    const row = Array.isArray(baris[i]) ? baris[i] : [];

    if (row.every((_c, indeks) => sel(row, indeks).trim() === '')) continue;
    if (sel(row, 4).trim().toUpperCase() !== 'TRUE') continue;

    const idMentah = sel(row, 0).trim();
    if (!POLA_ID.test(idMentah) || Number(idMentah) < 1) {
      logger.warn('baris_faq_dilewati', { baris: nomorBaris, alasan: 'id_tidak_valid' });
      continue;
    }

    const id = Number(idMentah);
    if (dipakai.has(id)) {
      logger.warn('baris_faq_dilewati', { baris: nomorBaris, alasan: 'id_dobel', id });
      continue;
    }

    const jawaban = sel(row, 3).trim();
    if (jawaban === '') {
      logger.warn('baris_faq_dilewati', { baris: nomorBaris, alasan: 'jawaban_kosong', id });
      continue;
    }
    if ([...jawaban].length > PANJANG_JAWABAN_PERINGATAN) {
      logger.warn('jawaban_faq_terlalu_panjang', { baris: nomorBaris, id });
    }

    dipakai.add(id);
    hasil.push(
      Object.freeze({
        id,
        kategori: sel(row, 1).trim(),
        keywords: Object.freeze(
          sel(row, 2)
            .split(',')
            .map((kata) => kata.trim())
            .filter((kata) => kata !== ''),
        ),
        jawaban,
      }),
    );
  }

  hasil.sort((a, b) => a.id - b.id);
  return Object.freeze(hasil);
}
