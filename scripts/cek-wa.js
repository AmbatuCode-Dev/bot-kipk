/**
 * Mengirim satu pesan uji lewat WhatsApp Cloud API memakai kredensial di .env.
 * Pada nomor uji Meta, penerima harus sudah terdaftar sebagai nomor penguji.
 *
 * Pemakaian: pnpm cek:wa 6281234567890 "teks opsional"
 */
import { loadConfig } from '../src/config.js';
import { createWaClient } from '../src/wa/client.js';

const [nomor, ...sisa] = process.argv.slice(2);
if (!nomor) {
  console.error('Pemakaian: pnpm cek:wa <nomor format 62xxx> [teks]');
  process.exit(1);
}

try {
  const { wa } = loadConfig();
  const klien = createWaClient(wa);
  const hasil = await klien.sendText(nomor, sisa.join(' ') || 'Tes dari bot-kipk: koneksi WhatsApp Cloud API berhasil.');
  console.log(`Terkirim. ID pesan: ${hasil.messageId}`);
} catch (err) {
  console.error(`Gagal mengirim pesan: ${err.message}`);
  if (err.code) console.error(`Kode: ${err.code}${err.fbtraceId ? `, fbtrace_id: ${err.fbtraceId}` : ''}`);
  process.exit(1);
}
