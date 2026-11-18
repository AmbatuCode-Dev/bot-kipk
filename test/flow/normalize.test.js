import { describe, expect, it } from 'vitest';
import { normalize } from '../../src/flow/normalize.js';

describe('normalize', () => {
  it('mengubah semua huruf menjadi huruf kecil', () => {
    expect(normalize('KAPAN Pencairan')).toBe('kapan pencairan');
  });

  it('membuang spasi di awal dan akhir', () => {
    expect(normalize('  halo  ')).toBe('halo');
  });
});
