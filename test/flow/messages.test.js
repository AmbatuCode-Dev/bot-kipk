import { describe, expect, it } from 'vitest';
import { BATAS_PANJANG, batasiPanjang } from '../../src/flow/messages.js';

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
