import { describe, expect, it } from 'vitest';
import { handleMessage } from '../../src/flow/handleMessage.js';
import { PESAN_BUKAN_TEKS, PESAN_GANGGUAN } from '../../src/flow/messages.js';

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
});
