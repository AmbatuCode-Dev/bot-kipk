/**
 * Pembacaan dan validasi variabel lingkungan.
 * Dijalankan sekali saat startup supaya salah konfigurasi langsung ketahuan,
 * bukan baru muncul ketika pesan pertama masuk.
 */

const VARIABEL_WAJIB = [
  'WA_VERIFY_TOKEN',
  'WA_APP_SECRET',
  'WA_ACCESS_TOKEN',
  'WA_PHONE_NUMBER_ID',
  'GOOGLE_SA_JSON',
  'SHEET_ID',
];

const BAWAAN = Object.freeze({
  WA_API_VERSION: 'v25.0',
  SHEET_TAB: 'FAQ',
  FAQ_CACHE_TTL: 60,
  PORT: 3000,
  HOST: '0.0.0.0',
});

const DISAMARKAN = '[disamarkan]';

export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

function teks(env, nama) {
  const nilai = env[nama];
  return typeof nilai === 'string' ? nilai.trim() : '';
}

function bilanganBulat(env, nama, { min, max }) {
  const mentah = teks(env, nama);
  if (mentah === '') return BAWAAN[nama];
  if (!/^\d+$/.test(mentah)) {
    throw new ConfigError(`${nama} harus berupa bilangan bulat`);
  }
  const nilai = Number(mentah);
  if (nilai < min || nilai > max) {
    throw new ConfigError(`${nama} harus antara ${min} dan ${max}`);
  }
  return nilai;
}

function bacaKredensial(mentah) {
  const isiJson = mentah.startsWith('{') ? mentah : Buffer.from(mentah, 'base64').toString('utf8');

  let objek;
  try {
    objek = JSON.parse(isiJson);
  } catch {
    throw new ConfigError('GOOGLE_SA_JSON bukan JSON atau base64 dari JSON yang valid');
  }

  if (
    objek === null ||
    typeof objek !== 'object' ||
    typeof objek.client_email !== 'string' ||
    typeof objek.private_key !== 'string'
  ) {
    throw new ConfigError('GOOGLE_SA_JSON harus memuat client_email dan private_key');
  }

  const privateKey = objek.private_key.replace(/\\n/g, '\n');
  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    throw new ConfigError('private_key pada GOOGLE_SA_JSON bukan kunci PEM yang valid');
  }

  return Object.freeze({ client_email: objek.client_email, private_key: privateKey });
}

function ringkas(config) {
  return {
    wa: {
      verifyToken: DISAMARKAN,
      appSecret: DISAMARKAN,
      accessToken: DISAMARKAN,
      phoneNumberId: config.wa.phoneNumberId,
      apiVersion: config.wa.apiVersion,
    },
    google: {
      credentials: { client_email: config.google.credentials.client_email, private_key: DISAMARKAN },
      sheetId: config.google.sheetId,
      sheetTab: config.google.sheetTab,
    },
    faqCacheTtlSeconds: config.faqCacheTtlSeconds,
    port: config.port,
    host: config.host,
  };
}

/**
 * Membaca konfigurasi dari environment dan memvalidasinya.
 * Semua masalah dikumpulkan lalu dilaporkan sekaligus. Pesan error hanya memuat
 * nama variabel, tidak pernah nilainya.
 *
 * @param {Record<string, string | undefined>} [env=process.env]
 * @returns {Readonly<object>} konfigurasi beku. JSON.stringify dan console.log
 *   hanya menampilkan versi yang rahasianya sudah disamarkan.
 * @throws {ConfigError} jika ada variabel yang kosong atau tidak valid
 */
export function loadConfig(env = process.env) {
  const masalah = [];
  const coba = (fungsi) => {
    try {
      return fungsi();
    } catch (err) {
      if (err instanceof ConfigError) {
        masalah.push(err.message);
        return undefined;
      }
      throw err;
    }
  };

  const hilang = VARIABEL_WAJIB.filter((nama) => teks(env, nama) === '');
  if (hilang.length > 0) {
    masalah.push(`Variabel wajib belum diisi: ${hilang.join(', ')}`);
  }

  const phoneNumberId = teks(env, 'WA_PHONE_NUMBER_ID');
  if (phoneNumberId !== '' && !/^\d{5,30}$/.test(phoneNumberId)) {
    masalah.push('WA_PHONE_NUMBER_ID harus berupa angka');
  }

  const apiVersion = teks(env, 'WA_API_VERSION') || BAWAAN.WA_API_VERSION;
  if (!/^v\d+\.\d+$/.test(apiVersion)) {
    masalah.push('WA_API_VERSION harus berformat vNN.N, misalnya v25.0');
  }

  const sheetId = teks(env, 'SHEET_ID');
  if (sheetId !== '' && !/^[A-Za-z0-9_-]{10,200}$/.test(sheetId)) {
    masalah.push('SHEET_ID hanya boleh berisi huruf, angka, garis bawah, dan tanda hubung');
  }

  const sheetTab = teks(env, 'SHEET_TAB') || BAWAAN.SHEET_TAB;
  if (sheetTab.length > 100 || /[\u0000-\u001f]/.test(sheetTab)) {
    masalah.push('SHEET_TAB maksimal 100 karakter dan tidak boleh memuat karakter kontrol');
  }

  const kredensialMentah = teks(env, 'GOOGLE_SA_JSON');
  const kredensial = kredensialMentah === '' ? undefined : coba(() => bacaKredensial(kredensialMentah));

  const ttl = coba(() => bilanganBulat(env, 'FAQ_CACHE_TTL', { min: 0, max: 86400 }));
  const port = coba(() => bilanganBulat(env, 'PORT', { min: 1, max: 65535 }));
  const host = teks(env, 'HOST') || BAWAAN.HOST;

  if (masalah.length > 0) {
    throw new ConfigError(`Konfigurasi tidak valid:\n- ${masalah.join('\n- ')}`);
  }

  const config = {
    wa: Object.freeze({
      verifyToken: teks(env, 'WA_VERIFY_TOKEN'),
      appSecret: teks(env, 'WA_APP_SECRET'),
      accessToken: teks(env, 'WA_ACCESS_TOKEN'),
      phoneNumberId,
      apiVersion,
    }),
    google: Object.freeze({ credentials: kredensial, sheetId, sheetTab }),
    faqCacheTtlSeconds: ttl,
    port,
    host,
  };

  const aman = () => ringkas(config);
  Object.defineProperty(config, 'toJSON', { value: aman, enumerable: false });
  Object.defineProperty(config, Symbol.for('nodejs.util.inspect.custom'), { value: aman, enumerable: false });
  return Object.freeze(config);
}
