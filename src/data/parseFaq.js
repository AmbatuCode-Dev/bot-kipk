/** Urutan dan nama kolom tab FAQ. Baris pertama di Sheet harus persis seperti ini. */
export const KOLOM_HEADER = Object.freeze(['ID', 'Kategori', 'Pertanyaan', 'Kata Kunci', 'Teks Jawaban', 'Aktif']);

const POLA_ID = /^\d{1,9}$/;
const PANJANG_JAWABAN_PERINGATAN = 4096;

export class FaqFormatError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FaqFormatError';
  }
}

const KOLOM = Object.freeze({ id: 0, kategori: 1, pertanyaan: 2, kataKunci: 3, jawaban: 4, aktif: 5 });

function sel(baris, indeks) {
  const nilai = baris[indeks];
  return nilai === undefined || nilai === null ? '' : String(nilai);
}

function rapikanSpasi(teks) {
  return teks.replace(/\s+/g, ' ').trim();
}

/**
 * Mengubah baris mentah dari Google Sheets menjadi daftar FAQ aktif.
 *
 * Aturan:
 * - Header harus sesuai KOLOM_HEADER, jika tidak seluruh pembacaan dianggap gagal
 *   sehingga bot tidak menjawab dari kolom yang salah.
 * - Baris kosong dan baris dengan Aktif selain TRUE dilewati tanpa peringatan.
 * - Baris aktif dengan ID kosong, bukan angka, atau dobel (yang dipakai baris
 *   paling atas), serta tanpa pertanyaan atau tanpa jawaban, dilewati dan
 *   dicatat sebagai peringatan.
 * - Kategori dan Pertanyaan dipakai sebagai teks menu, jadi spasi berlebih dan
 *   baris baru di dalamnya dirapikan menjadi satu spasi.
 * - Kata kunci dipecah per koma dan di-trim. Normalisasi huruf dilakukan Dev B.
 * - Hasil diurutkan menurut ID dan seluruhnya dibekukan.
 *
 * @param {unknown[][]} baris hasil values.get, termasuk baris header
 * @param {{ logger: { warn: Function } }} opsi
 * @returns {ReadonlyArray<Readonly<{ id: number, kategori: string, pertanyaan: string, keywords: readonly string[], jawaban: string }>>}
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
    if (sel(row, KOLOM.aktif).trim().toUpperCase() !== 'TRUE') continue;

    const idMentah = sel(row, KOLOM.id).trim();
    if (!POLA_ID.test(idMentah) || Number(idMentah) < 1) {
      logger.warn('baris_faq_dilewati', { baris: nomorBaris, alasan: 'id_tidak_valid' });
      continue;
    }

    const id = Number(idMentah);
    if (dipakai.has(id)) {
      logger.warn('baris_faq_dilewati', { baris: nomorBaris, alasan: 'id_dobel', id });
      continue;
    }

    const pertanyaan = rapikanSpasi(sel(row, KOLOM.pertanyaan));
    if (pertanyaan === '') {
      logger.warn('baris_faq_dilewati', { baris: nomorBaris, alasan: 'pertanyaan_kosong', id });
      continue;
    }

    const jawaban = sel(row, KOLOM.jawaban).trim();
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
        kategori: rapikanSpasi(sel(row, KOLOM.kategori)),
        pertanyaan,
        keywords: Object.freeze(
          sel(row, KOLOM.kataKunci)
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
