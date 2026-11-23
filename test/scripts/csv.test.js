import { describe, expect, it } from 'vitest';
import { parseCsv } from '../../scripts/csv.js';

describe('parseCsv', () => {
  it('memecah baris dan kolom biasa', () => {
    expect(parseCsv('ID,Kategori\n1,Pencairan\n2,Syarat')).toEqual([
      ['ID', 'Kategori'],
      ['1', 'Pencairan'],
      ['2', 'Syarat'],
    ]);
  });
});
