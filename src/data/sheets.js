import { auth as googleAuth, sheets as buatSheets } from '@googleapis/sheets';
import { KOLOM_HEADER } from './parseFaq.js';

const SCOPE_BACA = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const TIMEOUT_MS = 8000;

/**
 * Membungkus nama tab dengan kutip tunggal agar nama yang memuat spasi atau
 * karakter khusus tetap valid pada notasi A1.
 *
 * @param {string} nama
 */
export function kutipNamaTab(nama) {
  return `'${nama.replace(/'/g, "''")}'`;
}

/**
 * Membuat fungsi pembaca tab FAQ dari Google Sheets (akses read-only).
 *
 * @param {object} opsi
 * @param {{ client_email: string, private_key: string }} opsi.credentials kredensial Service Account
 * @param {string} opsi.sheetId
 * @param {string} opsi.sheetTab nama tab
 * @param {object} [opsi.klien] klien Sheets v4. Hanya diisi pada pengujian.
 * @returns {() => Promise<unknown[][]>} fungsi yang mengembalikan semua baris, termasuk header
 */
export function createSheetsReader({ credentials, sheetId, sheetTab, klien }) {
  const api =
    klien ??
    buatSheets({
      version: 'v4',
      auth: new googleAuth.JWT({ email: credentials.client_email, key: credentials.private_key, scopes: [SCOPE_BACA] }),
    });
  const rentang = `${kutipNamaTab(sheetTab)}!A1:${String.fromCharCode(64 + KOLOM_HEADER.length)}`;

  return async function ambilBaris() {
    const respons = await api.spreadsheets.values.get(
      { spreadsheetId: sheetId, range: rentang, majorDimension: 'ROWS', valueRenderOption: 'FORMATTED_VALUE' },
      { timeout: TIMEOUT_MS },
    );
    return respons.data.values ?? [];
  };
}
