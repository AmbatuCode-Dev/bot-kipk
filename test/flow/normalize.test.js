import { describe, expect, it } from 'vitest';
import { normalize } from '../../src/flow/normalize.js';

describe('normalize', () => {
  it('mengubah semua huruf menjadi huruf kecil', () => {
    expect(normalize('KAPAN Pencairan')).toBe('kapan pencairan');
  });

  it('membuang spasi di awal dan akhir', () => {
    expect(normalize('  halo  ')).toBe('halo');
  });

  it.each([
    ['kapan pencairan??', 'kapan pencairan'],
    ['halo, kak!', 'halo kak'],
    ['syarat/berkas', 'syarat berkas'],
    ['daftar-ulang', 'daftar ulang'],
    ['1.', '1'],
  ])('membuang tanda baca: %j -> %j', (input, hasil) => {
    expect(normalize(input)).toBe(hasil);
  });

  it('membuang emoji', () => {
    expect(normalize('halo 👋')).toBe('halo');
  });

  it('merapikan spasi ganda, tab, dan baris baru menjadi satu spasi', () => {
    expect(normalize('kapan   cair\n\tkak')).toBe('kapan cair kak');
  });

  it('mempertahankan angka', () => {
    expect(normalize('ukt 2026')).toBe('ukt 2026');
  });
});
