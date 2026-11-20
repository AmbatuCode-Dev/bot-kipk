import { describe, expect, it } from 'vitest';
import { handleMessage } from '../../src/flow/handleMessage.js';
import { PESAN_BUKAN_TEKS, PESAN_GANGGUAN, formatJawaban, pesanSapaan } from '../../src/flow/messages.js';

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
});
