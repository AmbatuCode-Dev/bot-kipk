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

  it('membaca sel berkutip yang berisi koma, baris baru, dan tanda kutip ganda', () => {
    const teks = '1,"pencairan, cair","Baris satu\nBaris ""dua"""';
    expect(parseCsv(teks)).toEqual([['1', 'pencairan, cair', 'Baris satu\nBaris "dua"']]);
  });

  it('menerima akhir baris Windows (CRLF)', () => {
    expect(parseCsv('ID,Kategori\r\n1,Pencairan')).toEqual([
      ['ID', 'Kategori'],
      ['1', 'Pencairan'],
    ]);
  });

  it('membuang tanda BOM di awal berkas', () => {
    expect(parseCsv('﻿ID,Kategori')).toEqual([['ID', 'Kategori']]);
  });

  it('tidak membuat baris kosong dari baris baru di akhir berkas', () => {
    expect(parseCsv('ID,Kategori\n1,Pencairan\n')).toEqual([
      ['ID', 'Kategori'],
      ['1', 'Pencairan'],
    ]);
  });
});
