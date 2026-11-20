import { describe, expect, it, vi } from 'vitest';
import { createSheetsReader, kutipNamaTab } from '../../src/data/sheets.js';
import { KREDENSIAL_UJI } from '../helpers/env.js';

describe('kutipNamaTab', () => {
  it.each([
    ['FAQ', "'FAQ'"],
    ['Data FAQ', "'Data FAQ'"],
    ["Punya Humas'26", "'Punya Humas''26'"],
  ])('membungkus %s', (nama, hasil) => {
    expect(kutipNamaTab(nama)).toBe(hasil);
  });
});

describe('createSheetsReader', () => {
  it('membaca A1:E pada tab yang dipilih dengan nilai mentah', async () => {
    const get = vi.fn(async () => ({ data: { values: [['ID'], ['1']] } }));
    const baca = createSheetsReader({ credentials: KREDENSIAL_UJI, sheetId: 'sheet-123', sheetTab: 'Data FAQ', klien: { spreadsheets: { values: { get } } } });

    expect(await baca()).toEqual([['ID'], ['1']]);
    expect(get).toHaveBeenCalledWith(
      { spreadsheetId: 'sheet-123', range: "'Data FAQ'!A1:E", majorDimension: 'ROWS', valueRenderOption: 'UNFORMATTED_VALUE' },
      { timeout: 8000 },
    );
  });

  it('mengembalikan array kosong bila Sheets tidak memberi values', async () => {
    const baca = createSheetsReader({ credentials: KREDENSIAL_UJI, sheetId: 's', sheetTab: 'FAQ', klien: { spreadsheets: { values: { get: async () => ({ data: {} }) } } } });

    expect(await baca()).toEqual([]);
  });

  it('meneruskan error dari Sheets apa adanya', async () => {
    const galat = new Error('The caller does not have permission');
    const baca = createSheetsReader({ credentials: KREDENSIAL_UJI, sheetId: 's', sheetTab: 'FAQ', klien: { spreadsheets: { values: { get: async () => { throw galat; } } } } });

    await expect(baca()).rejects.toBe(galat);
  });

  it('membangun klien Google asli dari kredensial tanpa membuka koneksi', () => {
    expect(() => createSheetsReader({ credentials: KREDENSIAL_UJI, sheetId: 's', sheetTab: 'FAQ' })).not.toThrow();
  });
});
