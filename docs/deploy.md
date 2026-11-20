# Panduan Deploy

Kode yang sama dijalankan di dua lingkungan lewat dua entry yang berbeda:

| | Track A: demo | Track B: produksi |
|---|---|---|
| Hosting | Vercel Hobby | VPS |
| Entry | `api/webhook.js` | `server.js` |
| Callback URL | `https://<domain>/api/webhook` | `https://<domain>/webhook` (atau `/api/webhook`, keduanya dilayani) |
| Respons ke Meta | 200 dikirim setelah balasan terkirim | 200 dikirim lebih dulu, balasan menyusul |

Perbedaan respons itu disengaja. Fungsi serverless dihentikan begitu respons dikirim, jadi balasan yang masih berjalan akan terpotong bila 200 dikirim lebih awal.

## 1. Menyiapkan WhatsApp Cloud API

1. Buat aplikasi bertipe Business di Meta for Developers dan tambahkan produk WhatsApp.
2. Catat **Phone Number ID** (`WA_PHONE_NUMBER_ID`) dan ambil **App Secret** dari Settings, Basic (`WA_APP_SECRET`).
3. Karang sebuah **Verify Token** bebas (`WA_VERIFY_TOKEN`). Gunakan string acak yang panjang.
4. Untuk nomor uji, daftarkan setiap nomor penerima pada daftar penerima di API Setup. Nomor yang tidak terdaftar tidak akan menerima balasan.
5. Token sementara dari API Setup cepat kedaluwarsa. Untuk demo, gunakan token System User dari Business Settings atau perbarui token sesaat sebelum demo, lalu isi `WA_ACCESS_TOKEN`.
6. Setelah server berjalan: pada Configuration, isi **Callback URL** dan **Verify Token**, tekan Verify and Save, lalu berlangganan (subscribe) ke field `messages`.

## 2. Menyiapkan Google Sheets

1. Buat Service Account di Google Cloud dan aktifkan Google Sheets API pada project yang sama.
2. Buat kunci JSON, lalu isi `GOOGLE_SA_JSON` dengan isi file itu dalam satu baris, atau base64-nya (`base64 -w0 service-account.json`).
3. Bagikan Sheet ke alamat `client_email` Service Account sebagai **Viewer**. Jangan bagikan akses Editor.
4. Isi `SHEET_ID` dengan ID pada URL Sheet. Pastikan tab bernama `FAQ` (atau atur `SHEET_TAB`) dan baris pertama memuat header `ID, Kategori, Pertanyaan, Kata Kunci, Teks Jawaban, Aktif` berurutan. Format sel tidak berpengaruh karena nilai dibaca mentah: kolom `ID` boleh berformat angka, dan kolom `Aktif` boleh berupa checkbox atau teks `TRUE`/`FALSE`.
   Bila menambahkan kolom `Pertanyaan` pada Sheet yang sudah berjalan, ubah Sheet-nya lebih dulu atau bersamaan dengan deploy. Header lama ditolak, sehingga bot memakai cache lama atau membalas pesan gangguan bila cache belum ada.
5. Verifikasi dari komputer lokal: `pnpm cek:sheets`.

## 3. Track A: Vercel

1. Import repositori ke Vercel. Framework Preset: **Other**. Tidak ada build command.
2. Pada Settings, General, atur **Node.js Version** ke 22.x. Proyek ini membutuhkan Node 22.12 atau lebih baru.
3. Pada Settings, Environment Variables, isi semua variabel wajib untuk environment **Production**.
4. Pada Settings, Git, atur **Production Branch** ke `main`. Cabang lain mendapat Preview Deployment.
5. Callback URL di Meta: `https://<domain-produksi>/api/webhook`.
6. Bila Meta menerima respons 401 yang berasal dari Vercel (bukan dari bot), periksa pengaturan Deployment Protection untuk domain yang dipakai Meta.
7. Log fungsi tersedia di tab Logs pada dashboard Vercel. Log berformat JSON satu baris.

Catatan Vercel:

- Entry `api/webhook.js` mengekspor handler Web Standard (`GET` dan `POST`) sehingga body bisa dibaca sebagai byte mentah untuk verifikasi signature. Setelah deploy pertama, kirim satu pesan uji dan pastikan log tidak memuat `signature_tidak_valid`.
- Penjaga pesan ganda berbasis memori hanya efektif dalam satu instance. Pada Vercel balasan ganda masih mungkin terjadi bila Meta mengirim ulang event.

## 4. Track B: VPS

Contoh untuk Ubuntu dengan systemd dan Caddy sebagai reverse proxy HTTPS (Meta mewajibkan HTTPS).

```bash
# Node.js 22.12+ dan pnpm (corepack membaca versi dari package.json)
sudo corepack enable

sudo useradd --system --home /opt/bot-kipk --shell /usr/sbin/nologin botkipk
sudo git clone https://github.com/AmbatuCode-Dev/bot-kipk.git /opt/bot-kipk
cd /opt/bot-kipk && sudo -u botkipk pnpm install --prod --frozen-lockfile
```

Simpan variabel lingkungan di luar repositori, hanya terbaca oleh root:

```bash
sudo install -m 600 -o root -g root /dev/null /etc/bot-kipk.env
sudo nano /etc/bot-kipk.env   # isi variabel wajib, ditambah HOST=127.0.0.1 dan PORT=3000
```

Unit systemd `/etc/systemd/system/bot-kipk.service`:

```ini
[Unit]
Description=Bot WhatsApp FAQ KIP-K
After=network-online.target
Wants=network-online.target

[Service]
User=botkipk
WorkingDirectory=/opt/bot-kipk
EnvironmentFile=/etc/bot-kipk.env
ExecStart=/usr/bin/env node server.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now bot-kipk
journalctl -u bot-kipk -f
```

Caddyfile (sertifikat HTTPS diurus otomatis):

```
bot.contoh.id {
    reverse_proxy 127.0.0.1:3000
}
```

Callback URL di Meta: `https://bot.contoh.id/webhook`. Pantau `https://bot.contoh.id/healthz`.

Server berhenti dengan rapi saat menerima SIGTERM, dan `Restart=on-failure` menghidupkannya kembali bila proses mati karena error tak tertangani.

## 5. Rilis dan rollback

- Merge ke `main` sama dengan deploy ke produksi. Lengkapi checklist di [`audit-keamanan.md`](audit-keamanan.md) terlebih dulu.
- Vercel: gunakan Instant Rollback pada dashboard, atau `git revert` commit merge lalu push.
- VPS: `git revert` commit merge di `main`, lalu `git pull`, `pnpm install --prod --frozen-lockfile`, dan `sudo systemctl restart bot-kipk`.

## 6. Pemecahan masalah

| Gejala | Kemungkinan penyebab |
|---|---|
| Verify and Save di Meta gagal | `WA_VERIFY_TOKEN` berbeda dengan yang diisi di Meta, atau URL tidak bisa dijangkau |
| Log `signature_tidak_valid` | `WA_APP_SECRET` salah, atau body diubah oleh proxy sebelum sampai ke aplikasi |
| Log `balasan_gagal` dengan `statusHttp` 400 dan kode 131030 | Nomor penerima belum terdaftar pada daftar penerima nomor uji |
| Log `balasan_gagal` dengan `statusHttp` 401 atau kode 190 | `WA_ACCESS_TOKEN` salah atau kedaluwarsa |
| Log `faq_pakai_cache_lama` atau `startup_faq_gagal` | Sheet belum dibagikan ke Service Account, nama tab salah, atau header tidak sesuai (misalnya kolom `Pertanyaan` belum ditambahkan). Jalankan `pnpm cek:sheets` |
| Log `baris_faq_dilewati` dengan alasan `pertanyaan_kosong` | Baris aktif belum diisi kolom `Pertanyaan`. Isi kolomnya, atau ubah `Aktif` menjadi `FALSE` |
| Startup berhenti dengan `handleMessage belum tersedia` | `src/flow/handleMessage.js` belum mengekspor `handleMessage` |
