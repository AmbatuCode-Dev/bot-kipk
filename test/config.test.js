import { describe, expect, it } from 'vitest';
import { inspect } from 'node:util';
import { ConfigError, loadConfig } from '../src/config.js';
import { KREDENSIAL_UJI, envUji } from './helpers/env.js';

describe('loadConfig', () => {
  it('membaca konfigurasi lengkap dengan nilai bawaan untuk yang opsional', () => {
    const config = loadConfig(envUji());

    expect(config.wa.phoneNumberId).toBe('123456789012345');
    expect(config.wa.apiVersion).toBe('v25.0');
    expect(config.google.sheetTab).toBe('FAQ');
    expect(config.google.credentials.client_email).toBe(KREDENSIAL_UJI.client_email);
    expect(config.faqCacheTtlSeconds).toBe(60);
    expect(config.port).toBe(3000);
    expect(config.host).toBe('0.0.0.0');
  });

  it('mengambil nilai opsional dari environment', () => {
    const config = loadConfig(
      envUji({ WA_API_VERSION: 'v26.0', SHEET_TAB: 'Data FAQ', FAQ_CACHE_TTL: '120', PORT: '8080', HOST: '127.0.0.1' }),
    );

    expect(config.wa.apiVersion).toBe('v26.0');
    expect(config.google.sheetTab).toBe('Data FAQ');
    expect(config.faqCacheTtlSeconds).toBe(120);
    expect(config.port).toBe(8080);
    expect(config.host).toBe('127.0.0.1');
  });

  it('menerima FAQ_CACHE_TTL 0 untuk menonaktifkan cache', () => {
    expect(loadConfig(envUji({ FAQ_CACHE_TTL: '0' })).faqCacheTtlSeconds).toBe(0);
  });

  it('melaporkan semua variabel wajib yang kosong dalam satu error tanpa menyebut nilainya', () => {
    const env = envUji({ WA_APP_SECRET: '', SHEET_ID: '   ' });
    delete env.WA_ACCESS_TOKEN;

    let error;
    try {
      loadConfig(env);
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(ConfigError);
    expect(error.message).toContain('WA_APP_SECRET');
    expect(error.message).toContain('WA_ACCESS_TOKEN');
    expect(error.message).toContain('SHEET_ID');
    expect(error.message).not.toContain('token-verifikasi-uji');
  });

  it.each([
    ['WA_PHONE_NUMBER_ID', 'abc123'],
    ['WA_PHONE_NUMBER_ID', '123/../456'],
    ['WA_API_VERSION', '25'],
    ['SHEET_ID', 'id dengan spasi'],
    ['FAQ_CACHE_TTL', '-5'],
    ['FAQ_CACHE_TTL', '90000'],
    ['FAQ_CACHE_TTL', 'sepuluh'],
    ['PORT', '0'],
    ['PORT', '70000'],
  ])('menolak %s = %s', (nama, nilai) => {
    expect(() => loadConfig(envUji({ [nama]: nilai }))).toThrow(nama);
  });

  it('menerima GOOGLE_SA_JSON dalam bentuk base64', () => {
    const base64 = Buffer.from(JSON.stringify(KREDENSIAL_UJI)).toString('base64');
    const config = loadConfig(envUji({ GOOGLE_SA_JSON: base64 }));

    expect(config.google.credentials.client_email).toBe(KREDENSIAL_UJI.client_email);
  });

  it('memulihkan baris baru yang ditulis sebagai \\n pada private_key', () => {
    const dalamSatuBaris = JSON.stringify({ ...KREDENSIAL_UJI, private_key: KREDENSIAL_UJI.private_key.replace(/\n/g, '\\n') });
    const config = loadConfig(envUji({ GOOGLE_SA_JSON: dalamSatuBaris }));

    expect(config.google.credentials.private_key).toBe(KREDENSIAL_UJI.private_key);
  });

  it('hanya meneruskan client_email dan private_key dari kredensial', () => {
    const config = loadConfig(envUji());

    expect(Object.keys(config.google.credentials).sort()).toEqual(['client_email', 'private_key']);
  });

  it.each([
    ['bukan JSON', 'ini bukan json'],
    ['tanpa private_key', JSON.stringify({ client_email: 'a@b.c' })],
    ['private_key bukan PEM', JSON.stringify({ client_email: 'a@b.c', private_key: 'abc' })],
    ['berupa array', '[]'],
  ])('menolak GOOGLE_SA_JSON yang %s tanpa membocorkan isinya', (_label, nilai) => {
    let error;
    try {
      loadConfig(envUji({ GOOGLE_SA_JSON: nilai }));
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(ConfigError);
    expect(error.message).toContain('GOOGLE_SA_JSON');
    expect(error.message).not.toContain(nilai);
  });

  it('menghasilkan objek beku', () => {
    const config = loadConfig(envUji());

    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.wa)).toBe(true);
    expect(() => {
      'use strict';
      config.wa.appSecret = 'diubah';
    }).toThrow();
  });

  it('menyamarkan rahasia pada JSON.stringify dan console.log', () => {
    const config = loadConfig(envUji());
    const hasilJson = JSON.stringify(config);
    const hasilInspect = inspect(config, { depth: 5 });

    for (const keluaran of [hasilJson, hasilInspect]) {
      expect(keluaran).not.toContain('token-verifikasi-uji');
      expect(keluaran).not.toContain('rahasia-aplikasi-uji');
      expect(keluaran).not.toContain('EAAB-token-akses-uji');
      expect(keluaran).not.toContain('BEGIN PRIVATE KEY');
      expect(keluaran).toContain('[disamarkan]');
    }
  });
});
