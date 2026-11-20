import { describe, expect, it, vi } from 'vitest';
import { FaqStoreError, createFaqStore } from '../../src/data/faqStore.js';
import { KOLOM_HEADER } from '../../src/data/parseFaq.js';

const HEADER = [...KOLOM_HEADER];
const BARIS_VALID = [HEADER, ['1', 'Pencairan', 'Kapan dana cair?', 'cair', 'jawaban satu', 'TRUE']];

function loggerUji() {
  return { info: vi.fn(), warn: vi.fn() };
}

function siapkan({ ttlMs = 60_000, jedaUlangMs = 15_000, ambilBaris } = {}) {
  const jam = { sekarang: 1_000_000 };
  const logger = loggerUji();
  const ambil = ambilBaris ?? vi.fn(async () => BARIS_VALID);
  const store = createFaqStore({ ambilBaris: ambil, ttlMs, jedaUlangMs, logger, now: () => jam.sekarang });
  return { store, jam, logger, ambil };
}

describe('createFaqStore.getAll', () => {
  it('membaca Sheets saat pertama kali dan memakai cache selama belum melewati TTL', async () => {
    const { store, jam, ambil } = siapkan();

    const pertama = await store.getAll();
    jam.sekarang += 59_999;
    const kedua = await store.getAll();

    expect(pertama).toEqual([{ id: 1, kategori: 'Pencairan', pertanyaan: 'Kapan dana cair?', keywords: ['cair'], jawaban: 'jawaban satu' }]);
    expect(kedua).toBe(pertama);
    expect(ambil).toHaveBeenCalledTimes(1);
  });

  it('membaca ulang setelah TTL lewat dan memakai data terbaru', async () => {
    const ambil = vi.fn()
      .mockResolvedValueOnce(BARIS_VALID)
      .mockResolvedValueOnce([HEADER, ['1', 'Pencairan', 'Kapan dana cair?', 'cair', 'jawaban baru', 'TRUE']]);
    const { store, jam } = siapkan({ ambilBaris: ambil });

    await store.getAll();
    jam.sekarang += 60_000;
    const data = await store.getAll();

    expect(ambil).toHaveBeenCalledTimes(2);
    expect(data[0].jawaban).toBe('jawaban baru');
  });

  it('selalu membaca Sheets bila TTL 0', async () => {
    const { store, ambil } = siapkan({ ttlMs: 0 });

    await store.getAll();
    await store.getAll();

    expect(ambil).toHaveBeenCalledTimes(2);
  });

  it('menggabungkan panggilan bersamaan menjadi satu pembacaan', async () => {
    let selesaikan;
    const ambil = vi.fn(() => new Promise((resolve) => { selesaikan = () => resolve(BARIS_VALID); }));
    const { store } = siapkan({ ambilBaris: ambil });

    const semua = Promise.all([store.getAll(), store.getAll(), store.getAll()]);
    selesaikan();
    const [a, b, c] = await semua;

    expect(ambil).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('memakai cache lama saat pembacaan gagal dan mencatat peringatan', async () => {
    const ambil = vi.fn().mockResolvedValueOnce(BARIS_VALID).mockRejectedValueOnce(new Error('Sheets 503'));
    const { store, jam, logger } = siapkan({ ambilBaris: ambil });

    const awal = await store.getAll();
    jam.sekarang += 120_000;
    const saatGagal = await store.getAll();

    expect(saatGagal).toBe(awal);
    expect(logger.warn).toHaveBeenCalledWith('faq_pakai_cache_lama', expect.objectContaining({ pesanError: 'Sheets 503', umurDetik: 120 }));
  });

  it('menunda percobaan ulang setelah gagal supaya Sheets tidak dibanjiri', async () => {
    const ambil = vi.fn().mockResolvedValueOnce(BARIS_VALID).mockRejectedValue(new Error('Sheets 503'));
    const { store, jam } = siapkan({ ambilBaris: ambil, jedaUlangMs: 15_000 });

    await store.getAll();
    jam.sekarang += 60_000;
    await store.getAll();
    jam.sekarang += 14_999;
    await store.getAll();
    expect(ambil).toHaveBeenCalledTimes(2);

    jam.sekarang += 2;
    await store.getAll();
    expect(ambil).toHaveBeenCalledTimes(3);
  });

  it('pulih dan memuat data baru begitu Sheets kembali normal', async () => {
    const ambil = vi.fn()
      .mockResolvedValueOnce(BARIS_VALID)
      .mockRejectedValueOnce(new Error('mati'))
      .mockResolvedValueOnce([HEADER, ['9', 'Baru', 'Pertanyaan baru?', 'x', 'j9', 'TRUE']]);
    const { store, jam } = siapkan({ ambilBaris: ambil, jedaUlangMs: 1000 });

    await store.getAll();
    jam.sekarang += 60_000;
    await store.getAll();
    jam.sekarang += 1001;
    const data = await store.getAll();

    expect(data.map((f) => f.id)).toEqual([9]);
  });

  it('melempar FaqStoreError bila gagal dan belum pernah ada cache', async () => {
    const sebab = new Error('izin ditolak');
    const { store } = siapkan({ ambilBaris: vi.fn(async () => { throw sebab; }) });

    const err = await store.getAll().catch((e) => e);

    expect(err).toBeInstanceOf(FaqStoreError);
    expect(err.cause).toBe(sebab);
  });

  it('mencoba lagi pada panggilan berikutnya bila belum ada cache', async () => {
    const ambil = vi.fn().mockRejectedValueOnce(new Error('mati')).mockResolvedValueOnce(BARIS_VALID);
    const { store } = siapkan({ ambilBaris: ambil });

    await expect(store.getAll()).rejects.toBeInstanceOf(FaqStoreError);
    expect(await store.getAll()).toHaveLength(1);
  });

  it('memakai cache lama bila header Sheet berubah, bukan menyajikan kolom yang salah', async () => {
    const rusak = [['ID', 'Kategori', 'Kata Kunci', 'Pertanyaan', 'Teks Jawaban', 'Aktif'], ['1', 'A', 'a', 'P?', 'j', 'TRUE']];
    const ambil = vi.fn().mockResolvedValueOnce(BARIS_VALID).mockResolvedValueOnce(rusak);
    const { store, jam, logger } = siapkan({ ambilBaris: ambil });

    const awal = await store.getAll();
    jam.sekarang += 60_000;

    expect(await store.getAll()).toBe(awal);
    expect(logger.warn).toHaveBeenCalledWith('faq_pakai_cache_lama', expect.objectContaining({ error: 'FaqFormatError' }));
  });

  it('mengembalikan data beku sehingga pemanggil tidak bisa merusak cache', async () => {
    const { store } = siapkan();
    const data = await store.getAll();

    expect(() => data.push({ id: 99 })).toThrow(TypeError);
    expect(() => { data[0].jawaban = 'diubah'; }).toThrow(TypeError);
    expect((await store.getAll())[0].jawaban).toBe('jawaban satu');
  });
});
