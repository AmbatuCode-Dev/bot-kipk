import { describe, expect, it } from 'vitest';
import {
  BATAS_PANJANG,
  NOTICE_PRIVASI,
  PESAN_BUKAN_TEKS,
  PESAN_GANGGUAN,
  PESAN_MENU_KOSONG,
  PENUTUP_JAWABAN,
  batasiPanjang,
  formatJawaban,
  formatMenu,
  pesanSapaan,
} from '../../src/flow/messages.js';

// Cara menghitung sama dengan WA Client (Dev A): per code point, bukan per unit UTF-16
const panjang = (teks) => [...teks].length;

describe('batasiPanjang', () => {
  it('memakai batas 4096 karakter sesuai WhatsApp Cloud API', () => {
    expect(BATAS_PANJANG).toBe(4096);
  });

  it('membiarkan teks yang tidak melebihi batas', () => {
    const teks = 'a'.repeat(BATAS_PANJANG);
    expect(batasiPanjang(teks)).toBe(teks);
  });

  it('memotong teks yang terlalu panjang tepat di batas dan menandainya dengan elipsis', () => {
    const hasil = batasiPanjang('a'.repeat(BATAS_PANJANG + 10));
    expect(panjang(hasil)).toBe(BATAS_PANJANG);
    expect(hasil.endsWith('…')).toBe(true);
  });

  it('menghitung emoji sebagai satu karakter dan tidak membelahnya', () => {
    const hasil = batasiPanjang('😀'.repeat(10), 5);
    expect(hasil).toBe('😀😀😀😀…');
  });
});

// Kalimatnya masih draf, jadi yang diuji sifatnya, bukan kalimat persisnya
describe('teks fallback', () => {
  it.each([
    ['PESAN_BUKAN_TEKS', PESAN_BUKAN_TEKS],
    ['PESAN_GANGGUAN', PESAN_GANGGUAN],
  ])('%s berisi teks dan muat dalam satu pesan', (_nama, pesan) => {
    expect(pesan.trim()).not.toBe('');
    expect(panjang(pesan)).toBeLessThanOrEqual(BATAS_PANJANG);
  });

  it('PESAN_BUKAN_TEKS mengarahkan mahasiswa mengetik "menu"', () => {
    expect(PESAN_BUKAN_TEKS.toLowerCase()).toContain('menu');
  });
});

describe('formatJawaban', () => {
  // Bentuknya sama persis dengan item dari faqStore.getAll() (Dev A)
  const faq = (jawaban) => ({ id: 1, kategori: 'Pencairan', keywords: ['cair'], jawaban });

  it('menampilkan jawaban FAQ lalu petunjuk kembali ke menu', () => {
    expect(formatJawaban(faq('Dana cair setiap awal semester.'))).toBe(
      `Dana cair setiap awal semester.\n\n${PENUTUP_JAWABAN}`,
    );
    expect(PENUTUP_JAWABAN.toLowerCase()).toContain('menu');
  });

  it('memotong jawaban yang terlalu panjang tanpa menghilangkan petunjuk menu', () => {
    const hasil = formatJawaban(faq('x'.repeat(5000)));
    expect(panjang(hasil)).toBeLessThanOrEqual(BATAS_PANJANG);
    expect(hasil.endsWith(`…\n\n${PENUTUP_JAWABAN}`)).toBe(true);
  });
});

describe('formatMenu', () => {
  const faq = (id, kategori, pertanyaan) => ({
    id,
    kategori,
    pertanyaan,
    keywords: ['contoh'],
    jawaban: 'Jawaban contoh',
  });

  it('menampilkan pertanyaan bernomor ID di bawah judul kategori', () => {
    const faqs = [
      faq(1, 'Pencairan', 'Kapan dana cair?'),
      faq(2, 'Pencairan', 'Kenapa dana belum masuk?'),
      faq(3, 'Pendaftaran', 'Apa saja syaratnya?'),
    ];
    expect(formatMenu(faqs)).toBe(
      [
        '*Pencairan*',
        '1. Kapan dana cair?',
        '2. Kenapa dana belum masuk?',
        '',
        '*Pendaftaran*',
        '3. Apa saja syaratnya?',
      ].join('\n'),
    );
  });

  it('menyatukan kategori yang sama walaupun ID-nya tidak berurutan', () => {
    const faqs = [
      faq(1, 'Pencairan', 'Kapan dana cair?'),
      faq(2, 'Pendaftaran', 'Apa saja syaratnya?'),
      faq(3, 'Pencairan', 'Kenapa dana belum masuk?'),
    ];
    expect(formatMenu(faqs)).toBe(
      [
        '*Pencairan*',
        '1. Kapan dana cair?',
        '3. Kenapa dana belum masuk?',
        '',
        '*Pendaftaran*',
        '2. Apa saja syaratnya?',
      ].join('\n'),
    );
  });

  it('memasukkan FAQ tanpa kategori ke kelompok "Lainnya"', () => {
    expect(formatMenu([faq(4, '', 'Siapa yang bisa dihubungi?')])).toBe(
      '*Lainnya*\n4. Siapa yang bisa dihubungi?',
    );
  });

  it('memberi tahu bila belum ada FAQ aktif, bukan mengirim menu kosong', () => {
    expect(formatMenu([])).toBe(PESAN_MENU_KOSONG);
    expect(PESAN_MENU_KOSONG.trim()).not.toBe('');
  });
});

describe('pesanSapaan', () => {
  const faqs = [
    { id: 1, kategori: 'Pencairan', pertanyaan: 'Kapan dana cair?', keywords: ['cair'], jawaban: 'Jawaban' },
  ];

  it('memuat notice privasi sebelum daftar menu', () => {
    const pesan = pesanSapaan(faqs);
    const posisiNotice = pesan.indexOf(NOTICE_PRIVASI);
    const posisiMenu = pesan.indexOf(formatMenu(faqs));
    expect(posisiNotice).toBeGreaterThanOrEqual(0);
    expect(posisiMenu).toBeGreaterThan(posisiNotice);
  });

  it('tetap muat dalam satu pesan walaupun FAQ aktifnya sangat banyak', () => {
    const banyak = Array.from({ length: 200 }, (_x, i) => ({
      ...faqs[0],
      id: i + 1,
      pertanyaan: `Pertanyaan contoh yang cukup panjang nomor ${i + 1}?`,
    }));
    expect(panjang(pesanSapaan(banyak))).toBeLessThanOrEqual(BATAS_PANJANG);
  });
});
