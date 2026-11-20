/**
 * Memeriksa koneksi ke Google Sheets memakai kredensial di .env.
 * Hanya menampilkan jumlah, ID, kategori, dan pertanyaan FAQ. Isi jawaban tidak dicetak.
 *
 * Pemakaian: pnpm cek:sheets
 */
import { loadConfig } from '../src/config.js';
import { createFaqStore } from '../src/data/faqStore.js';
import { createSheetsReader } from '../src/data/sheets.js';
import { createLogger } from '../src/logger.js';

try {
  const config = loadConfig();
  const store = createFaqStore({
    ambilBaris: createSheetsReader({
      credentials: config.google.credentials,
      sheetId: config.google.sheetId,
      sheetTab: config.google.sheetTab,
    }),
    ttlMs: 0,
    logger: createLogger(),
  });

  const data = await store.getAll();
  console.log(`Berhasil membaca ${data.length} FAQ aktif dari tab "${config.google.sheetTab}".`);
  for (const faq of data) {
    console.log(`  ${faq.id}. [${faq.kategori}] ${faq.pertanyaan} (${faq.keywords.length} kata kunci)`);
  }
} catch (err) {
  const sebab = err.cause ?? err;
  console.error(`Gagal membaca Google Sheets: ${sebab.message}`);
  try {
    const { google } = loadConfig();
    console.error(`Pastikan Sheet dibagikan sebagai Viewer ke ${google.credentials.client_email} dan nama tab sudah benar.`);
  } catch {
    // konfigurasi sendiri yang bermasalah, pesannya sudah tampil di atas
  }
  process.exit(1);
}
