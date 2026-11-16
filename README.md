# Forkip WA Bot

Prototipe bot WhatsApp untuk Forkip yang menjawab pertanyaan yang sering diajukan (FAQ), memberi informasi kegiatan, dan menerima pendaftaran kegiatan langsung dari chat. Dikembangkan sebagai Proyek Akhir Mata Kuliah Manajemen Proyek.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![WhatsApp](https://img.shields.io/badge/WhatsApp_Cloud_API-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Google Sheets](https://img.shields.io/badge/Google_Sheets-34A853?style=for-the-badge&logo=googlesheets&logoColor=white)

> **Status:** tahap awal pengembangan. Struktur project sudah disiapkan, dan kode belum diimplementasikan.

## Fitur

- **Menu utama** dengan tombol interaktif WhatsApp
- **FAQ**: daftar pertanyaan dan jawaban yang bisa dipilih
- **Info kegiatan**: jadwal dan lokasi kegiatan yang sedang dibuka
- **Pendaftaran kegiatan** langkah demi langkah, dengan validasi dan konfirmasi
- **Data di Google Sheets**: pengurus bisa melihat pendaftar serta mengubah FAQ dan kegiatan tanpa panel admin khusus

## Tech Stack

- **Runtime:** Node.js, JavaScript (ES Modules)
- **Kanal:** WhatsApp Cloud API (Meta)
- **Hosting:** Vercel Functions
- **Data:** Google Sheets

## Struktur Project

```
api/
  webhook.js            Pintu masuk webhook (Vercel)
src/
  app.js                Menghubungkan webhook, data, dan alur percakapan
  config.js             Membaca environment variables
  webhook/
    verify.js           Verifikasi challenge & signature dari Meta
    parse.js            Mengubah payload webhook menjadi pesan
  channels/
    whatsapp.js         Kirim pesan ke WhatsApp Cloud API
  flows/
    router.js           Menentukan alur untuk setiap pesan
    menu.js             Menu utama
    faq.js              Alur FAQ
    kegiatan.js         Alur info kegiatan
    pendaftaran.js      Alur pendaftaran
  services/
    validasi.js         Validasi input pengguna
  repositories/
    kontrak.js          Daftar fungsi lapisan data
    index.js            Memilih driver data
    sheets/index.js     Driver Google Sheets
    memory/index.js     Driver data contoh (development lokal)
  lib/
    logger.js           Log terstruktur
scripts/
  dev-server.js         Server lokal untuk uji webhook
  chat.js               Simulator chat di terminal
tests/                  Unit test
```

## Environment Variables

Salin `.env.example` menjadi `.env`, lalu isi variabel berikut:

| Variabel | Keterangan |
|---|---|
| `WA_PHONE_NUMBER_ID` | Phone Number ID dari halaman API Setup WhatsApp di Meta for Developers |
| `WA_ACCESS_TOKEN` | Access token WhatsApp Cloud API (disarankan token System User) |
| `WA_APP_SECRET` | App Secret aplikasi Meta, untuk verifikasi signature webhook |
| `WA_VERIFY_TOKEN` | Token bebas, harus sama dengan Verify Token di pengaturan webhook Meta |

> File `.env` berisi rahasia dan **tidak boleh di-commit**.

## Menjalankan Secara Lokal

Clone repositori:

```bash
git clone https://github.com/AmbatuCode-Dev/forkip-wa-bot.git
```

Masuk ke folder project:

```bash
cd forkip-wa-bot
```

Siapkan environment variables:

```bash
cp .env.example .env
```

Perintah untuk menjalankan bot akan ditambahkan setelah implementasi dimulai.

## Roadmap

- [ ] Verifikasi webhook dan signature dari Meta
- [ ] Kirim pesan teks, tombol, dan list ke WhatsApp
- [ ] Menu utama
- [ ] Alur FAQ
- [ ] Alur info kegiatan
- [ ] Alur pendaftaran kegiatan
- [ ] Koneksi Google Sheets
- [ ] Unit test
- [ ] Deploy ke Vercel
- [ ] Uji coba dengan pengurus dan anggota Forkip

## Batasan

- Prototipe ini memakai nomor uji WhatsApp dari Meta, yang hanya bisa mengirim pesan ke maksimal 5 nomor penerima.
- Broadcast pengumuman dan pengingat otomatis berada di luar ruang lingkup prototipe, karena pesan template WhatsApp berbayar per pesan.

## Tim

Dikembangkan oleh Tim Bot, bagian dari kelompok Proyek Akhir Manajemen Proyek:

- Analyst & Conversation Designer
- Developer Bot (inti, webhook, dan data)
- Developer Bot (alur percakapan)
