import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifySignature } from '../../src/webhook/signature.js';

const RAHASIA = 'rahasia-aplikasi-uji';
const BODY = '{"object":"whatsapp_business_account"}';
const HEX_RESMI = 'e56699d0428ce513ad45ccdaec1c9dca12d4723df7649b9147cc71e221628358';

function tandatangani(body, rahasia = RAHASIA) {
  return 'sha256=' + createHmac('sha256', rahasia).update(body).digest('hex');
}

describe('verifySignature', () => {
  it('cocok dengan nilai HMAC-SHA256 yang dihitung secara independen', () => {
    expect(verifySignature(BODY, 'sha256=' + HEX_RESMI, RAHASIA)).toBe(true);
  });

  it('menerima body berupa Buffer dan Uint8Array', () => {
    const header = tandatangani(BODY);

    expect(verifySignature(Buffer.from(BODY), header, RAHASIA)).toBe(true);
    expect(verifySignature(new TextEncoder().encode(BODY), header, RAHASIA)).toBe(true);
  });

  it('menerima heksadesimal huruf besar', () => {
    const header = 'sha256=' + HEX_RESMI.toUpperCase();

    expect(verifySignature(BODY, header, RAHASIA)).toBe(true);
  });

  it('menandatangani byte mentah, termasuk karakter non-ASCII yang di-escape Meta', () => {
    const mentah = '{"text":{"body":"caf\\u00e9 \\ud83d\\ude00"}}';

    expect(verifySignature(mentah, tandatangani(mentah), RAHASIA)).toBe(true);
    expect(verifySignature(JSON.stringify(JSON.parse(mentah)), tandatangani(mentah), RAHASIA)).toBe(false);
  });

  it('menolak body yang diubah satu karakter', () => {
    expect(verifySignature(BODY + ' ', tandatangani(BODY), RAHASIA)).toBe(false);
  });

  it('menolak signature yang dibuat dengan rahasia lain', () => {
    expect(verifySignature(BODY, tandatangani(BODY, 'rahasia-lain'), RAHASIA)).toBe(false);
  });

  it.each([
    ['header tidak ada', undefined],
    ['header null', null],
    ['header kosong', ''],
    ['tanpa awalan sha256=', HEX_RESMI],
    ['awalan sha1=', 'sha1=' + HEX_RESMI],
    ['heksadesimal terlalu pendek', 'sha256=' + HEX_RESMI.slice(0, 62)],
    ['heksadesimal terlalu panjang', 'sha256=' + HEX_RESMI + '00'],
    ['bukan heksadesimal', 'sha256=' + 'z'.repeat(64)],
  ])('menolak %s', (_label, header) => {
    expect(verifySignature(BODY, header, RAHASIA)).toBe(false);
  });

  it('melempar TypeError jika appSecret kosong, agar tidak menerima tanda tangan kunci kosong', () => {
    const palsu = tandatangani(BODY, '');

    expect(() => verifySignature(BODY, palsu, '')).toThrow(TypeError);
    expect(() => verifySignature(BODY, palsu, undefined)).toThrow(TypeError);
  });

  it('melempar TypeError jika rawBody bukan byte atau string', () => {
    expect(() => verifySignature({ object: 'x' }, tandatangani(BODY), RAHASIA)).toThrow(TypeError);
  });
});
