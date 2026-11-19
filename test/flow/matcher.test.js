import { describe, expect, it } from 'vitest';
import { findBestFaq, scoreFaq } from '../../src/flow/matcher.js';

// Bentuknya sama persis dengan item dari faqStore.getAll() (Dev A)
const faq = (keywords, id = 1) => ({
  id,
  kategori: 'Pencairan',
  keywords,
  jawaban: 'Jawaban contoh',
});

describe('scoreFaq', () => {
  it('menghitung kata kunci yang muncul sebagai kata utuh', () => {
    expect(scoreFaq(faq(['pencairan']), 'kapan pencairan kip')).toBe(1);
  });

  it('tidak mencocokkan potongan kata', () => {
    expect(scoreFaq(faq(['cair']), 'kapan pencairan')).toBe(0);
  });

  it('menjumlahkan setiap kata kunci yang cocok', () => {
    expect(scoreFaq(faq(['pencairan', 'kapan', 'rekening']), 'kapan pencairan')).toBe(2);
  });

  it('mencocokkan kata kunci frasa yang muncul berurutan', () => {
    expect(scoreFaq(faq(['uang kuliah']), 'kapan uang kuliah cair')).toBe(1);
  });

  it('tidak mencocokkan frasa yang katanya terpisah', () => {
    expect(scoreFaq(faq(['uang kuliah']), 'uang saya untuk kuliah')).toBe(0);
  });

  it('menormalisasi kata kunci sebelum dicocokkan', () => {
    expect(scoreFaq(faq(['Daftar-Ulang', 'KIP-K']), 'cara daftar ulang kip k')).toBe(2);
  });

  it('mengabaikan kata kunci yang kosong setelah dinormalisasi', () => {
    expect(scoreFaq(faq(['??']), '')).toBe(0);
  });

  it('menghitung kata kunci yang sama hanya sekali', () => {
    expect(scoreFaq(faq(['pencairan', 'Pencairan']), 'kapan pencairan')).toBe(1);
  });
});

describe('findBestFaq', () => {
  it('memilih FAQ dengan skor tertinggi', () => {
    const faqs = [faq(['kapan'], 1), faq(['kapan', 'pencairan'], 2)];
    expect(findBestFaq(faqs, 'kapan pencairan')?.id).toBe(2);
  });

  it('mengembalikan null jika tidak ada kata kunci yang cocok', () => {
    expect(findBestFaq([faq(['pencairan'], 1)], 'halo kak')).toBeNull();
  });

  it('mengembalikan null jika skor tertinggi di bawah ambang', () => {
    const faqs = [faq(['kapan', 'pencairan'], 1)];
    expect(findBestFaq(faqs, 'kapan', { threshold: 2 })).toBeNull();
  });

  it('memenangkan ID terkecil jika skor seri, apa pun urutannya', () => {
    const faqs = [faq(['kapan'], 5), faq(['kapan'], 2), faq(['kapan'], 9)];
    expect(findBestFaq(faqs, 'kapan pencairan')?.id).toBe(2);
  });

  it('mengembalikan null untuk daftar FAQ kosong', () => {
    expect(findBestFaq([], 'kapan pencairan')).toBeNull();
  });
});
