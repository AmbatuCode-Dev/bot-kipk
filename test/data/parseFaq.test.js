import { describe, expect, it, vi } from 'vitest';
import { FaqFormatError, KOLOM_HEADER, parseFaq } from '../../src/data/parseFaq.js';

const HEADER = [...KOLOM_HEADER];

function loggerUji() {
  return { warn: vi.fn() };
}

describe('parseFaq', () => {
  it('mengubah baris aktif menjadi Faq dengan bentuk sesuai kontrak', () => {
    const logger = loggerUji();
    const hasil = parseFaq(
      [HEADER, ['1', 'Pencairan', 'Pencairan, cair ,  uang kuliah', 'Jawaban satu\nbaris kedua', 'TRUE']],
      { logger },
    );

    expect(hasil).toEqual([
      { id: 1, kategori: 'Pencairan', keywords: ['Pencairan', 'cair', 'uang kuliah'], jawaban: 'Jawaban satu\nbaris kedua' },
    ]);
    expect(Object.keys(hasil[0]).sort()).toEqual(['id', 'jawaban', 'kategori', 'keywords']);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('hanya menganggap Aktif bernilai TRUE (tanpa membedakan huruf) sebagai aktif', () => {
    const logger = loggerUji();
    const hasil = parseFaq(
      [
        HEADER,
        ['1', 'A', 'a', 'j1', 'true'],
        ['2', 'A', 'a', 'j2', ' TRUE '],
        ['3', 'A', 'a', 'j3', 'FALSE'],
        ['4', 'A', 'a', 'j4', ''],
        ['5', 'A', 'a', 'j5'],
        ['6', 'A', 'a', 'j6', 'ya'],
      ],
      { logger },
    );

    expect(hasil.map((f) => f.id)).toEqual([1, 2]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('melewati ID kosong, bukan angka, nol, atau terlalu panjang dan mencatatnya tanpa isi baris', () => {
    const logger = loggerUji();
    const hasil = parseFaq(
      [
        HEADER,
        ['', 'A', 'a', 'rahasia1', 'TRUE'],
        ['abc', 'A', 'a', 'rahasia2', 'TRUE'],
        ['0', 'A', 'a', 'rahasia3', 'TRUE'],
        ['1234567890', 'A', 'a', 'rahasia4', 'TRUE'],
        ['1.5', 'A', 'a', 'rahasia5', 'TRUE'],
        ['7', 'A', 'a', 'sah', 'TRUE'],
      ],
      { logger },
    );

    expect(hasil.map((f) => f.id)).toEqual([7]);
    expect(logger.warn).toHaveBeenCalledTimes(5);
    expect(logger.warn).toHaveBeenCalledWith('baris_faq_dilewati', { baris: 2, alasan: 'id_tidak_valid' });
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('rahasia');
  });

  it('memakai baris paling atas bila ID dobel dan mencatat baris sisanya', () => {
    const logger = loggerUji();
    const hasil = parseFaq([HEADER, ['2', 'A', 'a', 'pertama', 'TRUE'], ['2', 'B', 'b', 'kedua', 'TRUE']], { logger });

    expect(hasil).toHaveLength(1);
    expect(hasil[0].jawaban).toBe('pertama');
    expect(logger.warn).toHaveBeenCalledWith('baris_faq_dilewati', { baris: 3, alasan: 'id_dobel', id: 2 });
  });

  it('tidak menganggap baris nonaktif sebagai bentrok ID dengan baris aktif', () => {
    const logger = loggerUji();
    const hasil = parseFaq([HEADER, ['2', 'A', 'a', 'lama', 'FALSE'], ['2', 'B', 'b', 'baru', 'TRUE']], { logger });

    expect(hasil.map((f) => f.jawaban)).toEqual(['baru']);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('melewati baris aktif tanpa jawaban', () => {
    const logger = loggerUji();
    const hasil = parseFaq([HEADER, ['1', 'A', 'a', '   ', 'TRUE']], { logger });

    expect(hasil).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith('baris_faq_dilewati', { baris: 2, alasan: 'jawaban_kosong', id: 1 });
  });

  it('memberi peringatan, tanpa membuang, untuk jawaban lebih dari 4096 karakter', () => {
    const logger = loggerUji();
    const hasil = parseFaq([HEADER, ['1', 'A', 'a', 'x'.repeat(5000), 'TRUE']], { logger });

    expect(hasil).toHaveLength(1);
    expect(logger.warn).toHaveBeenCalledWith('jawaban_faq_terlalu_panjang', { baris: 2, id: 1 });
  });

  it('menangani sel yang dipangkas Sheets (baris lebih pendek dari 5 kolom) dan baris kosong', () => {
    const logger = loggerUji();
    const hasil = parseFaq([HEADER, [], ['', '', '', '', ''], ['3', 'A']], { logger });

    expect(hasil).toEqual([]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('menjadikan kata kunci kosong sebagai array kosong dan membuang elemen kosong', () => {
    const hasil = parseFaq([HEADER, ['1', 'A', '', 'j', 'TRUE'], ['2', 'A', ' , ,a,, ', 'j', 'TRUE']], { logger: loggerUji() });

    expect(hasil[0].keywords).toEqual([]);
    expect(hasil[1].keywords).toEqual(['a']);
  });

  it('mengurutkan hasil menurut ID dan membekukan semuanya', () => {
    const hasil = parseFaq([HEADER, ['10', 'A', 'a', 'j', 'TRUE'], ['2', 'A', 'a', 'j', 'TRUE']], { logger: loggerUji() });

    expect(hasil.map((f) => f.id)).toEqual([2, 10]);
    expect(Object.isFrozen(hasil)).toBe(true);
    expect(Object.isFrozen(hasil[0])).toBe(true);
    expect(Object.isFrozen(hasil[0].keywords)).toBe(true);
  });

  it('menerima header dengan huruf besar-kecil dan spasi yang berbeda', () => {
    const hasil = parseFaq([[' id ', 'KATEGORI', 'kata kunci', 'Teks Jawaban', 'aktif'], ['1', 'A', 'a', 'j', 'TRUE']], { logger: loggerUji() });

    expect(hasil).toHaveLength(1);
  });

  it.each([
    ['tab kosong', []],
    ['bukan array', null],
    ['urutan kolom berubah', [['ID', 'Kata Kunci', 'Kategori', 'Teks Jawaban', 'Aktif'], ['1', 'a', 'A', 'j', 'TRUE']]],
    ['kolom hilang', [['ID', 'Kategori', 'Kata Kunci', 'Teks Jawaban']]],
    ['baris pertama bukan header', [['1', 'A', 'a', 'j', 'TRUE']]],
  ])('melempar FaqFormatError bila %s', (_label, data) => {
    expect(() => parseFaq(data, { logger: loggerUji() })).toThrow(FaqFormatError);
  });
});
