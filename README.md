# Bot KIP-K

Prototipe bot WhatsApp yang menjawab pertanyaan yang sering diajukan (FAQ) mahasiswa penerima KIP-Kuliah secara otomatis untuk Forum KIP-Kuliah UNJ. Jawaban dikelola Divisi Humas langsung di Google Sheets, tanpa perlu coding. Dikembangkan sebagai Proyek Akhir Mata Kuliah Manajemen Proyek.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![WhatsApp](https://img.shields.io/badge/WhatsApp_Cloud_API-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Google Sheets](https://img.shields.io/badge/Google_Sheets-34A853?style=for-the-badge&logo=googlesheets&logoColor=white)

> **Status:** tahap awal pengembangan. Struktur project sudah disiapkan, dan kode belum diimplementasikan.

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
api/webhook.js            [A] entry Vercel (Track A)
server.js                 [A] entry VPS (Track B), node:http
src/
  config.js               [A] baca .env
  webhook/handler.js      [A] GET verifikasi, POST terima
  webhook/signature.js    [A] HMAC dari raw body
  wa/client.js            [A] sendText() ke Cloud API
  data/sheets.js          [A] googleapis
  data/faqStore.js        [A] cache + getAll()
  flow/handleMessage.js   [B] pintu masuk handler
  flow/normalize.js       [B] normalisasi teks
  flow/matcher.js         [B] skor kata kunci
  flow/messages.js        [B] teks sapaan, fallback, privasi
test/                     Vitest: flow/* tanpa jaringan
.env.example              nama variabel, tanpa nilai
.gitignore                .env dan kunci JSON wajib masuk
```

## Google Sheets

Tab `FAQ`, satu baris untuk satu pertanyaan:

| Kolom | Keterangan |
|---|---|
| `ID` | Angka unik, sekaligus nomor menu yang diketik mahasiswa |
| `Kategori` | Pengelompokan untuk daftar menu |
| `Kata Kunci` | Dipisah koma, huruf kecil. Dicocokkan ke pesan yang sudah dinormalisasi |
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
| `GOOGLE_SA_JSON` | Kredensial Service Account untuk Sheets |
| `SHEET_ID` | ID spreadsheet FAQ |
| `FAQ_CACHE_TTL` | Umur cache FAQ dalam detik (default 60) |

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

Perintah untuk menjalankan server lokal akan ditambahkan setelah implementasi webhook selesai.

## Roadmap

- [ ] Kredensial: Service Account, Sheet, dan token sandbox Meta
- [ ] Webhook: verifikasi GET dan signature HMAC
- [ ] WA Client: `sendText()` ke Cloud API
- [ ] Koneksi Google Sheets dan FAQ Store dengan cache
- [ ] Handler percakapan: normalisasi, menu, skor kata kunci
- [ ] Teks sapaan, fallback, dan notice privasi
- [ ] Unit test Vitest untuk `flow/*`
- [ ] Integrasi end-to-end dan deploy ke Vercel Hobby
- [ ] QA dan UAT bersama Forum KIP-Kuliah UNJ

## Batasan

- Prototipe ini memakai nomor uji WhatsApp dari Meta, yang hanya bisa mengirim pesan ke nomor penguji yang terdaftar.
- Hanya pesan teks yang didukung.
