import { describe, expect, it } from 'vitest';
import { anonimkanNomor, createLogger, ringkasError } from '../src/logger.js';

describe('createLogger', () => {
  it('menulis satu baris JSON dengan waktu, level, pesan, dan field tambahan', () => {
    const baris = [];
    const logger = createLogger({ tulis: (level, isi) => baris.push([level, isi]), now: () => Date.UTC(2026, 10, 18, 3, 0, 0) });

    logger.info('balasan_terkirim', { messageId: 'wamid.1', durasiMs: 120 });
    logger.error('balasan_gagal');

    expect(baris[0][0]).toBe('info');
    expect(JSON.parse(baris[0][1])).toEqual({
      waktu: '2026-11-18T03:00:00.000Z',
      level: 'info',
      pesan: 'balasan_terkirim',
      messageId: 'wamid.1',
      durasiMs: 120,
    });
    expect(baris[1][0]).toBe('error');
    expect(JSON.parse(baris[1][1]).pesan).toBe('balasan_gagal');
  });
});

describe('anonimkanNomor', () => {
  it('konsisten untuk nomor yang sama dan tidak memuat nomor aslinya', () => {
    const a = anonimkanNomor('6281234567890', 'kunci');

    expect(a).toBe(anonimkanNomor('6281234567890', 'kunci'));
    expect(a).toMatch(/^[0-9a-f]{10}$/);
    expect(a).not.toContain('6281234567890');
  });

  it('menghasilkan kode berbeda untuk nomor atau kunci yang berbeda', () => {
    expect(anonimkanNomor('6281234567890', 'kunci')).not.toBe(anonimkanNomor('6281234567891', 'kunci'));
    expect(anonimkanNomor('6281234567890', 'kunci')).not.toBe(anonimkanNomor('6281234567890', 'kunci-lain'));
  });
});

describe('ringkasError', () => {
  it('hanya mengambil nama, pesan, kode, dan status', () => {
    const err = Object.assign(new Error('gagal'), { code: 'ECONNRESET', status: 502, config: { headers: { Authorization: 'Bearer rahasia' } } });
    const ringkasan = ringkasError(err);

    expect(ringkasan).toEqual({ error: 'Error', pesanError: 'gagal', kodeError: 'ECONNRESET', statusHttp: 502 });
    expect(JSON.stringify(ringkasan)).not.toContain('rahasia');
  });

  it('memotong pesan yang terlalu panjang dan menerima nilai non-Error', () => {
    expect(ringkasError(new Error('x'.repeat(1000))).pesanError).toHaveLength(300);
    expect(ringkasError('teks biasa')).toEqual({ error: 'string', pesanError: 'teks biasa' });
  });
});
