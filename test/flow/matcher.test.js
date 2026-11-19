import { describe, expect, it } from 'vitest';
import { scoreFaq } from '../../src/flow/matcher.js';

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
