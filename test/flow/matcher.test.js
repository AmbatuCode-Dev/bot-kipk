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
});
