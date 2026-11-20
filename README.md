# Bot KIP-K

Prototipe bot WhatsApp yang menjawab pertanyaan yang sering diajukan (FAQ) mahasiswa penerima KIP-Kuliah secara otomatis untuk Forum KIP-Kuliah UNJ. Jawaban dikelola Divisi Humas langsung di Google Sheets, tanpa perlu coding. Dikembangkan sebagai Proyek Akhir Mata Kuliah Manajemen Proyek.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![WhatsApp](https://img.shields.io/badge/WhatsApp_Cloud_API-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Google Sheets](https://img.shields.io/badge/Google_Sheets-34A853?style=for-the-badge&logo=googlesheets&logoColor=white)

> **Status:** tahap pengembangan. Sisi Dev A (webhook, WA Client, koneksi Google Sheets, FAQ Store, entry Vercel dan VPS) sudah diimplementasikan. Alur percakapan (`src/flow/`) masih dikerjakan Dev B.

## Fitur

- **Sapaan dan menu**: daftar FAQ aktif yang dipilih dengan mengetik nomornya, disertai notice privasi
- **Pencocokan kata kunci**: pertanyaan bebas dicocokkan ke FAQ dengan skor kata kunci
- **Fallback**: balasan untuk pesan yang tidak dikenali, pesan selain teks, dan saat sistem gangguan
- **Admin tanpa coding**: Divisi Humas cukup mengubah baris di Google Sheets. Bot membaca data baru setelah cache kedaluwarsa, tanpa deploy ulang

**Di luar ruang lingkup:** broadcast proaktif, AI/LLM, pesan gambar/suara/dokumen, dan live-chat multi-agen.

## Tech Stack

- **Runtime:** Node.js 22.12 atau lebih baru, JavaScript
- **Kanal:** WhatsApp Cloud API (Meta)
- **Data & admin panel:** Google Sheets (`googleapis`, akses read-only)
- **Hosting:** Vercel Hobby untuk demo (Track A), VPS Indonesia untuk produksi (Track B)
- **Testing:** Vitest

## Arsitektur

Satu server Node.js menerima webhook dari WhatsApp, mengambil FAQ dari Google Sheets (dengan cache di memori), lalu mengirim balasan lewat WhatsApp Cloud API.

Pembagian tanggung jawab:

- **Dev A:** inti, webhook, data, dan semua yang berhubungan dengan jaringan
- **Dev B:** alur percakapan (`src/flow/`), tanpa menyentuh HTTP, token, atau Sheets

Kontrak antara keduanya:

```js
// Dev A -> Dev B: pesan masuk yang sudah dirapikan
ctx = { messageId, from, type: 'text' | 'other', text, timestamp }

// Dev A -> Dev B: dependensi yang dipinjamkan
deps = { faqStore: { getAll(): Promise<Faq[]> } }
Faq  = { id: number, kategori: string, keywords: string[], jawaban: string }

// Dev B -> Dev A: hasil
handleMessage(ctx, deps): Promise<{ body: string }>
```

## Struktur Project

```
api/webhook.js              [A] entry Vercel (Track A), handler Web Standard
server.js                   [A] entry VPS (Track B), node:http
scripts/
  cek-sheets.js             [A] cek koneksi Google Sheets
  cek-wa.js                 [A] kirim pesan uji lewat Cloud API
src/
  app.js                    [A] menyusun semua komponen (dipakai kedua entry)
  config.js                 [A] baca dan validasi .env
  logger.js                 [A] log JSON, nomor pengirim disamarkan
  webhook/handler.js        [A] GET verifikasi, POST terima, balas
  webhook/signature.js      [A] HMAC dari raw body
  webhook/payload.js        [A] payload WhatsApp menjadi ctx
  webhook/duplikat.js       [A] penjaga pesan ganda
  webhook/nodeAdapter.js    [A] jembatan node:http ke Request/Response
  wa/client.js              [A] sendText() ke Cloud API
  data/sheets.js            [A] pembaca Google Sheets
  data/parseFaq.js          [A] baris Sheet menjadi daftar FAQ
  data/faqStore.js          [A] cache + getAll()
  flow/handleMessage.js     [B] pintu masuk handler
  flow/normalize.js         [B] normalisasi teks
  flow/matcher.js           [B] skor kata kunci
  flow/messages.js          [B] teks sapaan, fallback, privasi
test/                       Vitest, semua tanpa jaringan
docs/                       deploy dan audit keamanan
.env.example                nama variabel, tanpa nilai
.gitignore                  .env dan kunci JSON wajib masuk
```

## Google Sheets

Tab `FAQ`, satu baris untuk satu pertanyaan:

| Kolom | Keterangan |
|---|---|
| `ID` | Angka unik, sekaligus nomor menu yang diketik mahasiswa |
| `Kategori` | Pengelompokan untuk daftar menu |
| `Pertanyaan` | Kalimat tanya yang tampil sebagai label nomor di daftar menu, misalnya "Kapan dana KIP-K cair?". Wajib diisi: baris aktif tanpa pertanyaan dilewati dan dicatat sebagai peringatan |
| `Kata Kunci` | Dipisah koma. Huruf besar-kecil bebas, karena handler menormalisasi kata kunci dan pesan dengan aturan yang sama |
| `Teks Jawaban` | Teks biasa, boleh beberapa baris. Jangan isi data pribadi atau data sensitif mahasiswa |
| `Aktif` | `TRUE` atau `FALSE`. Baris `FALSE` dilewati bot |

Baris header dikunci (protect range), dan urutan kolom tidak boleh berubah. Service Account dibagikan ke Sheet sebagai **Viewer**.

## Environment Variables

Salin `.env.example` menjadi `.env`, lalu isi variabel berikut:

| Variabel | Keterangan |
|---|---|
| `WA_VERIFY_TOKEN` | Cek GET webhook, harus sama dengan Verify Token di dashboard Meta |
| `WA_APP_SECRET` | Kunci HMAC untuk verifikasi signature |
| `WA_ACCESS_TOKEN` | Bearer token untuk mengirim balasan |
| `WA_PHONE_NUMBER_ID` | Nomor pengirim bot (Phone Number ID) |
| `GOOGLE_SA_JSON` | Kredensial Service Account: JSON satu baris, atau hasil base64 dari file JSON-nya (`base64 -w0 service-account.json`) |
| `SHEET_ID` | ID spreadsheet FAQ |
| `FAQ_CACHE_TTL` | Umur cache FAQ dalam detik. Opsional, default 60. Isi 0 untuk selalu membaca Sheets |
| `WA_API_VERSION` | Versi Graph API. Opsional, default `v25.0` |
| `SHEET_TAB` | Nama tab FAQ. Opsional, default `FAQ` |
| `PORT` | Port server VPS. Opsional, default 3000 |
| `HOST` | Alamat yang didengarkan server VPS. Opsional, default `0.0.0.0`. Isi `127.0.0.1` bila di belakang reverse proxy |

> File `.env` dan kunci JSON Service Account berisi rahasia, jadi **tidak boleh di-commit**.

## Menjalankan Secara Lokal

Clone repositori:

```bash
git clone https://github.com/AmbatuCode-Dev/bot-kipk.git
```

Masuk ke folder project:

```bash
cd bot-kipk
```

Siapkan environment variables:

```bash
cp .env.example .env
```

Install dependency (project ini memakai **pnpm**):

```bash
pnpm install
```

Jalankan unit test:

```bash
pnpm test
```

Atau jalankan test dalam mode watch selama development:

```bash
pnpm test:watch
```

Pastikan koneksi ke Google Sheets dan WhatsApp sudah benar:

```bash
pnpm cek:sheets
pnpm cek:wa 6281234567890
```

Jalankan server lokal (membaca `.env` otomatis dan restart saat kode berubah):

```bash
pnpm dev
```

Server mendengarkan di `http://localhost:3000`. Untuk menerima webhook dari Meta, buka tunnel (misalnya `ngrok http 3000`) lalu isi Callback URL dengan `https://<alamat-tunnel>/webhook`. Cek kesehatan server di `/healthz`.

> Server baru bisa berjalan setelah `handleMessage` diekspor dari `src/flow/handleMessage.js` (Dev B). Sebelum itu, startup berhenti dengan pesan yang menjelaskannya.

## Deploy dan Keamanan

- Langkah deploy Vercel (Track A) dan VPS (Track B), serta setup webhook di Meta: [`docs/deploy.md`](docs/deploy.md)
- Hasil audit keamanan, risiko yang tersisa, dan checklist sebelum merge ke `main`: [`docs/audit-keamanan.md`](docs/audit-keamanan.md)

## Alur Kerja Git

- `main` adalah **produksi**. Merge ke `main` sama dengan deploy ke hosting, jadi hanya lewat Pull Request dan setelah checklist di `docs/audit-keamanan.md` terpenuhi.
- `dev` adalah cabang integrasi. Semua fitur digabung ke sini lebih dulu.
- Setiap fitur penting dikerjakan di branch sendiri (`feat/<nama>`, `fix/<nama>`, `docs/<nama>`) yang dibuat dari `dev`, dan masuk lewat Pull Request yang direview anggota lain.
- Bila sebuah fitur bermasalah, batalkan dengan `git revert` pada commit merge-nya, atau tarik ulang `dev` dari kondisi sebelumnya.
- Pesan commit mengikuti Conventional Commits dengan deskripsi berbahasa Indonesia, misalnya `feat(webhook): tambah verifikasi signature`.

## Roadmap

- [ ] Kredensial: Service Account, Sheet, dan token sandbox Meta
- [x] Webhook: verifikasi GET dan signature HMAC
- [x] WA Client: `sendText()` ke Cloud API
- [x] Koneksi Google Sheets dan FAQ Store dengan cache
- [ ] Handler percakapan: normalisasi, menu, skor kata kunci
- [ ] Teks sapaan, fallback, dan notice privasi
- [ ] Unit test Vitest untuk `flow/*`
- [ ] Integrasi end-to-end dan deploy ke Vercel Hobby
- [ ] QA dan UAT bersama Forum KIP-Kuliah UNJ

## Batasan

- Prototipe ini memakai nomor uji WhatsApp dari Meta, yang hanya bisa mengirim pesan ke nomor penguji yang terdaftar.
- Hanya pesan teks yang didukung.
