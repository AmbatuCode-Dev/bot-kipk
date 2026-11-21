import { describe, expect, it } from 'vitest';
import { handleMessage } from '../../src/flow/handleMessage.js';
import {
  PESAN_BUKAN_TEKS,
  PESAN_GANGGUAN,
  formatJawaban,
  pesanSapaan,
  pesanTidakDikenali,
} from '../../src/flow/messages.js';

// Bentuknya sama persis dengan hasil faqStore.getAll() (canvas bagian 4–5)
const FAQS = Object.freeze([
  { id: 1, kategori: 'Pencairan', pertanyaan: 'Kapan dana KIP-K cair?', keywords: ['pencairan', 'cair'], jawaban: 'Dana cair bertahap.' },
  { id: 2, kategori: 'Syarat', pertanyaan: 'Apa syarat daftar ulang?', keywords: ['syarat', 'daftar ulang'], jawaban: 'Siapkan berkas A dan B.' },
  { id: 3, kategori: 'Rekening', pertanyaan: 'Rekening saya bermasalah', keywords: ['rekening', 'bank'], jawaban: 'Hubungi bank penyalur.' },
]);

// Bentuknya sama persis dengan ctx dari Dev A (canvas bagian 5)
const ctx = (text, type = 'text') => ({
  messageId: 'wamid.uji',
  from: '6281234567890',
  type,
  text,
  timestamp: 1763433600,
});

// faqStore palsu: tanpa jaringan, sesuai pegangan Dev B di canvas
const storeBerisi = (faqs) => ({ faqStore: { getAll: async () => faqs } });
const storeRusak = () => ({
  faqStore: {
    getAll: async () => {
      throw new Error('Sheets gagal dan belum ada cache');
    },
  },
});

describe('handleMessage', () => {
  it('membalas pesan selain teks tanpa membaca FAQ', async () => {
    const hasil = await handleMessage(ctx('', 'other'), storeRusak());
    expect(hasil).toEqual({ body: PESAN_BUKAN_TEKS });
  });

  it('membalas pesan gangguan bila FAQ gagal diambil', async () => {
    const hasil = await handleMessage(ctx('kapan pencairan?'), storeRusak());
    expect(hasil).toEqual({ body: PESAN_GANGGUAN });
  });

  it.each(['Halo kak!', 'menu', 'MENU', 'Assalamualaikum', "Assalamu'alaikum wr wb", 'Selamat pagi min', 'hai'])(
    'membalas "%s" dengan sapaan dan daftar menu',
    async (teks) => {
      const hasil = await handleMessage(ctx(teks), storeBerisi(FAQS));
      expect(hasil).toEqual({ body: pesanSapaan(FAQS) });
    },
  );

  it.each(['2', '2.', ' 2 ', '02'])('membalas angka "%s" dengan jawaban FAQ ber-ID itu', async (teks) => {
    const hasil = await handleMessage(ctx(teks), storeBerisi(FAQS));
    expect(hasil).toEqual({ body: formatJawaban(FAQS[1]) });
  });

  it.each([
    ['Kapan pencairan KIP-K?', 1],
    ['syarat daftar-ulang apa aja', 2],
    ['rekening bank saya diblokir', 3],
  ])('membalas "%s" dengan jawaban FAQ %i yang skornya tertinggi', async (teks, id) => {
    const hasil = await handleMessage(ctx(teks), storeBerisi(FAQS));
    expect(hasil).toEqual({ body: formatJawaban(FAQS[id - 1]) });
  });

  it('menjawab pertanyaan yang diawali sapaan, bukan membalas menu', async () => {
    const hasil = await handleMessage(ctx('Halo kak, kapan dana cair?'), storeBerisi(FAQS));
    expect(hasil).toEqual({ body: formatJawaban(FAQS[0]) });
  });

  it.each([
    ['pertanyaan di luar FAQ', 'boleh ikut 2 organisasi ga'],
    ['nomor yang tidak ada di menu', '99'],
    ['pesan berisi emoji saja', '👍🙏'],
  ])('membalas %s dengan pesan tidak dikenali', async (_kasus, teks) => {
    const hasil = await handleMessage(ctx(teks), storeBerisi(FAQS));
    expect(hasil).toEqual({ body: pesanTidakDikenali(FAQS) });
  });
});

// Kontrak dengan Dev A: handler menjamin body berisi teks dan ≤4096 karakter,
// karena WA Client hanya memvalidasi dan tidak memotong.
describe('handleMessage: jaminan body untuk Dev A', () => {
  const BANYAK = Array.from({ length: 300 }, (_x, i) => ({
    id: i + 1,
    kategori: `Kategori ${i % 7}`,
    pertanyaan: `Pertanyaan contoh yang cukup panjang nomor ${i + 1}?`,
    keywords: ['pencairan'],
    jawaban: 'x'.repeat(5000),
  }));

  it.each([
    ['bukan teks', ctx('', 'other'), storeBerisi(BANYAK)],
    ['gagal ambil data', ctx('halo'), storeRusak()],
    ['sapaan', ctx('halo'), storeBerisi(BANYAK)],
    ['nomor menu', ctx('1'), storeBerisi(BANYAK)],
    ['skor kata kunci', ctx('kapan pencairan'), storeBerisi(BANYAK)],
    ['tidak dikenali', ctx('asdf'), storeBerisi(BANYAK)],
  ])('jalur %s mengembalikan body tidak kosong dan ≤4096 karakter', async (_jalur, pesan, deps) => {
    const { body } = await handleMessage(pesan, deps);
    expect(typeof body).toBe('string');
    expect(body.trim()).not.toBe('');
    expect([...body].length).toBeLessThanOrEqual(4096);
  });
});
