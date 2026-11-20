import { describe, expect, it, vi } from 'vitest';
import { FaqFormatError, KOLOM_HEADER, parseFaq } from '../../src/data/parseFaq.js';

const HEADER = [...KOLOM_HEADER];

function loggerUji() {
  return { warn: vi.fn() };
}

/** Menyusun satu baris Sheet sesuai urutan kolom, dengan pertanyaan bawaan yang valid. */
function baris(id, kategori, kataKunci, jawaban, aktif, pertanyaan = 'Kapan dana cair?') {
  return [id, kategori, pertanyaan, kataKunci, jawaban, aktif];
}

describe('parseFaq', () => {
  it('mengubah baris aktif menjadi Faq dengan bentuk sesuai kontrak', () => {
    const logger = loggerUji();
    const hasil = parseFaq(
      [HEADER, baris('1', 'Pencairan', 'Pencairan, cair ,  uang kuliah', 'Jawaban satu\nbaris kedua', 'TRUE', 'Kapan dana KIP-K cair?')],
      { logger },
    );

    expect(hasil).toEqual([
      {
        id: 1,
        kategori: 'Pencairan',
        pertanyaan: 'Kapan dana KIP-K cair?',
        keywords: ['Pencairan', 'cair', 'uang kuliah'],
        jawaban: 'Jawaban satu\nbaris kedua',
      },
    ]);
    expect(Object.keys(hasil[0]).sort()).toEqual(['id', 'jawaban', 'kategori', 'keywords', 'pertanyaan']);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('merapikan spasi dan baris baru pada kategori dan pertanyaan karena dipakai sebagai teks menu', () => {
    const hasil = parseFaq([HEADER, baris('1', '  Pencairan\n dana ', 'a', 'j', 'TRUE', '  Kapan   dana\nKIP-K\tcair? ')], { logger: loggerUji() });

    expect(hasil[0].kategori).toBe('Pencairan dana');
    expect(hasil[0].pertanyaan).toBe('Kapan dana KIP-K cair?');
  });

  it('hanya menganggap Aktif bernilai TRUE (tanpa membedakan huruf) sebagai aktif', () => {
    const logger = loggerUji();
    const hasil = parseFaq(
      [
        HEADER,
        baris('1', 'A', 'a', 'j1', 'true'),
        baris('2', 'A', 'a', 'j2', ' TRUE '),
        baris('3', 'A', 'a', 'j3', 'FALSE'),
        baris('4', 'A', 'a', 'j4', ''),
        baris('5', 'A', 'a', 'j5').slice(0, 5),
        baris('6', 'A', 'a', 'j6', 'ya'),
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
        baris('', 'A', 'a', 'rahasia1', 'TRUE'),
        baris('abc', 'A', 'a', 'rahasia2', 'TRUE'),
        baris('0', 'A', 'a', 'rahasia3', 'TRUE'),
        baris('1234567890', 'A', 'a', 'rahasia4', 'TRUE'),
        baris('1.5', 'A', 'a', 'rahasia5', 'TRUE'),
        baris('7', 'A', 'a', 'sah', 'TRUE'),
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
    const hasil = parseFaq([HEADER, baris('2', 'A', 'a', 'pertama', 'TRUE'), baris('2', 'B', 'b', 'kedua', 'TRUE')], { logger });

    expect(hasil).toHaveLength(1);
    expect(hasil[0].jawaban).toBe('pertama');
    expect(logger.warn).toHaveBeenCalledWith('baris_faq_dilewati', { baris: 3, alasan: 'id_dobel', id: 2 });
  });

  it('tidak menganggap baris nonaktif sebagai bentrok ID dengan baris aktif', () => {
    const logger = loggerUji();
    const hasil = parseFaq([HEADER, baris('2', 'A', 'a', 'lama', 'FALSE'), baris('2', 'B', 'b', 'baru', 'TRUE')], { logger });

    expect(hasil.map((f) => f.jawaban)).toEqual(['baru']);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('melewati baris aktif tanpa pertanyaan dan mencatatnya', () => {
    const logger = loggerUji();
    const hasil = parseFaq(
      [HEADER, baris('1', 'A', 'a', 'j', 'TRUE', ''), baris('2', 'A', 'a', 'j', 'TRUE', '  \n '), baris('3', 'A', 'a', 'j', 'TRUE', undefined)],
      { logger },
    );

    expect(hasil.map((f) => f.id)).toEqual([3]);
    expect(logger.warn).toHaveBeenCalledWith('baris_faq_dilewati', { baris: 2, alasan: 'pertanyaan_kosong', id: 1 });
    expect(logger.warn).toHaveBeenCalledWith('baris_faq_dilewati', { baris: 3, alasan: 'pertanyaan_kosong', id: 2 });
  });

  it('tidak menghabiskan ID bila barisnya dilewati karena pertanyaan kosong', () => {
    const hasil = parseFaq([HEADER, baris('1', 'A', 'a', 'j-kosong-tanya', 'TRUE', ''), baris('1', 'A', 'a', 'j-lengkap', 'TRUE')], { logger: loggerUji() });

    expect(hasil.map((f) => f.jawaban)).toEqual(['j-lengkap']);
  });

  it('melewati baris aktif tanpa jawaban', () => {
    const logger = loggerUji();
    const hasil = parseFaq([HEADER, baris('1', 'A', 'a', '   ', 'TRUE')], { logger });

    expect(hasil).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith('baris_faq_dilewati', { baris: 2, alasan: 'jawaban_kosong', id: 1 });
  });

  it('memberi peringatan, tanpa membuang, untuk jawaban lebih dari 4096 karakter', () => {
    const logger = loggerUji();
    const hasil = parseFaq([HEADER, baris('1', 'A', 'a', 'x'.repeat(5000), 'TRUE')], { logger });

    expect(hasil).toHaveLength(1);
    expect(logger.warn).toHaveBeenCalledWith('jawaban_faq_terlalu_panjang', { baris: 2, id: 1 });
  });

  it('menangani sel yang dipangkas Sheets (baris lebih pendek dari 6 kolom) dan baris kosong', () => {
    const logger = loggerUji();
    const hasil = parseFaq([HEADER, [], ['', '', '', '', '', ''], ['3', 'A']], { logger });

    expect(hasil).toEqual([]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('menerima nilai mentah dari Sheets: ID berupa angka dan Aktif berupa boolean checkbox', () => {
    const logger = loggerUji();
    const hasil = parseFaq(
      [
        HEADER,
        baris(1, 'A', 'a', 'jawaban satu', true),
        baris(1000, 'A', 'a', 'jawaban seribu', true),
        baris(3, 'A', 'a', 'nonaktif', false),
        baris(2026, 'A', 'a', 2026, true),
      ],
      { logger },
    );

    expect(hasil.map((f) => f.id)).toEqual([1, 1000, 2026]);
    expect(hasil[2].jawaban).toBe('2026');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('menolak ID berupa angka pecahan, negatif, atau teks berformat ribuan', () => {
    const logger = loggerUji();
    const hasil = parseFaq([HEADER, baris(2.5, 'A', 'a', 'j', true), baris(-1, 'A', 'a', 'j', true), baris('1.000', 'A', 'a', 'j', true)], { logger });

    expect(hasil).toEqual([]);
    expect(logger.warn).toHaveBeenCalledTimes(3);
  });

  it('menjadikan kata kunci kosong sebagai array kosong dan membuang elemen kosong', () => {
    const hasil = parseFaq([HEADER, baris('1', 'A', '', 'j', 'TRUE'), baris('2', 'A', ' , ,a,, ', 'j', 'TRUE')], { logger: loggerUji() });

    expect(hasil[0].keywords).toEqual([]);
    expect(hasil[1].keywords).toEqual(['a']);
  });

  it('mengurutkan hasil menurut ID dan membekukan semuanya', () => {
    const hasil = parseFaq([HEADER, baris('10', 'A', 'a', 'j', 'TRUE'), baris('2', 'A', 'a', 'j', 'TRUE')], { logger: loggerUji() });

    expect(hasil.map((f) => f.id)).toEqual([2, 10]);
    expect(Object.isFrozen(hasil)).toBe(true);
    expect(Object.isFrozen(hasil[0])).toBe(true);
    expect(Object.isFrozen(hasil[0].keywords)).toBe(true);
  });

  it('menerima header dengan huruf besar-kecil dan spasi yang berbeda', () => {
    const hasil = parseFaq([[' id ', 'KATEGORI', 'pertanyaan', 'kata kunci', 'Teks Jawaban', 'aktif'], baris('1', 'A', 'a', 'j', 'TRUE')], { logger: loggerUji() });

    expect(hasil).toHaveLength(1);
  });

  it.each([
    ['tab kosong', []],
    ['bukan array', null],
    ['urutan kolom berubah', [['ID', 'Kategori', 'Kata Kunci', 'Pertanyaan', 'Teks Jawaban', 'Aktif'], baris('1', 'A', 'a', 'j', 'TRUE')]],
    ['kolom Pertanyaan belum ditambahkan (format lama)', [['ID', 'Kategori', 'Kata Kunci', 'Teks Jawaban', 'Aktif'], ['1', 'A', 'a', 'j', 'TRUE']]],
    ['kolom hilang', [['ID', 'Kategori', 'Pertanyaan', 'Kata Kunci', 'Teks Jawaban']]],
    ['baris pertama bukan header', [baris('1', 'A', 'a', 'j', 'TRUE')]],
  ])('melempar FaqFormatError bila %s', (_label, data) => {
    expect(() => parseFaq(data, { logger: loggerUji() })).toThrow(FaqFormatError);
  });
});
