/**
 * Simulator chat lokal: mencoba alur percakapan bot di terminal, tanpa WhatsApp
 * dan tanpa kredensial. FAQ dibaca dari CSV hasil "File > Download > CSV" pada
 * tab FAQ, lalu diproses parseFaq dan handleMessage yang sama dengan bot asli.
 *
 * Pemakaian:
 *   pnpm chat                    memakai scripts/contoh-faq.csv
 *   pnpm chat path/ke/faq.csv    memakai ekspor Sheet sendiri
 *
 * Ketik /bukan-teks untuk meniru stiker atau gambar, dan keluar untuk berhenti.
 */
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { parseFaq } from '../src/data/parseFaq.js';
import { handleMessage } from '../src/flow/handleMessage.js';
import { parseCsv } from './csv.js';

const berkas = process.argv[2] ?? fileURLToPath(new URL('./contoh-faq.csv', import.meta.url));

let faqs;
try {
  faqs = parseFaq(parseCsv(await readFile(berkas, 'utf8')), {
    logger: { warn: (pesan, data) => console.warn(`Peringatan: ${pesan} ${JSON.stringify(data)}`) },
  });
} catch (err) {
  console.error(`Gagal membaca ${berkas}: ${err.message}`);
  process.exit(1);
}

console.log(`${faqs.length} FAQ aktif dibaca dari ${berkas}`);
console.log('Ketik pesan seperti mahasiswa. /bukan-teks meniru stiker atau gambar, keluar untuk berhenti.\n');

const deps = Object.freeze({ faqStore: Object.freeze({ getAll: async () => faqs }) });
const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: 'Kamu> ' });
let nomor = 0;

rl.prompt();
for await (const baris of rl) {
  if (baris.trim().toLowerCase() === 'keluar') break;

  const bukanTeks = baris.trim() === '/bukan-teks';
  nomor += 1;
  const { body } = await handleMessage(
    {
      messageId: `lokal.${nomor}`,
      from: '6280000000000',
      type: bukanTeks ? 'other' : 'text',
      text: bukanTeks ? '' : baris,
      timestamp: Math.floor(Date.now() / 1000),
    },
    deps,
  );
  console.log(`\nBot>\n${body}\n`);
  rl.prompt();
}
rl.close();
