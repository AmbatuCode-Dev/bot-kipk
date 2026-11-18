# Audit Keamanan Sisi Dev A

Cakupan: `api/`, `server.js`, `src/app.js`, `src/config.js`, `src/logger.js`, `src/webhook/`, `src/wa/`, `src/data/`, dan `scripts/`. Alur percakapan (`src/flow/`) milik Dev B belum termasuk. Pemeriksaan dilakukan pada 18 November 2026 dengan membaca kode, menjalankan test otomatis, dan menjalankan server secara nyata untuk memeriksa startup, `/healthz`, verifikasi GET, penolakan signature, dan shutdown.

## Kontrol yang diterapkan

| Ancaman | Kontrol | Lokasi |
|---|---|---|
| Pihak lain mengirim webhook palsu | HMAC-SHA256 dari raw body dengan App Secret, dibandingkan dengan `timingSafeEqual`. Diperiksa sebelum JSON di-parse. Kunci kosong ditolak | `src/webhook/signature.js`, `handler.js` |
| Verify token ditebak lewat selisih waktu | Kedua sisi di-hash lalu dibandingkan dengan `timingSafeEqual` | `src/webhook/handler.js` |
| Body raksasa menghabiskan memori | Batas 1 MiB: dari header `Content-Length`, dari isi, dan saat streaming di server Node | `handler.js`, `nodeAdapter.js` |
| Slowloris dan koneksi menggantung | `headersTimeout` 15 dtk, `requestTimeout` 30 dtk, `keepAliveTimeout` 5 dtk | `server.js` |
| Injeksi pada URL Cloud API | `WA_PHONE_NUMBER_ID` dan `WA_API_VERSION` divalidasi dengan pola ketat saat startup. Host tujuan tetap | `src/config.js`, `src/wa/client.js` |
| Nomor tujuan balasan dimanipulasi | Nomor hanya diambil dari payload bertanda tangan dan divalidasi 5 sampai 20 digit | `payload.js`, `client.js` |
| Event untuk nomor bot lain | Pesan dengan `phone_number_id` berbeda dilewati | `payload.js` |
| Rahasia bocor lewat log atau error | Logger hanya menerima field terpilih. `ringkasError` tidak menyalin objek error utuh (error HTTP bisa memuat header Authorization). Pesan error dari Meta membuang deretan angka panjang. Konfigurasi disamarkan pada `JSON.stringify` dan `console.log` | `logger.js`, `config.js`, `client.js` |
| Privasi mahasiswa | Isi pesan tidak pernah dicatat. Nomor hanya dicatat sebagai HMAC 10 karakter. Test memeriksa log tidak memuat isi pesan, nomor, App Secret, maupun token | `handler.js`, `test/webhook/handler.test.js` |
| Log injection | Log berformat JSON, sehingga baris baru dalam nilai ikut di-escape | `logger.js` |
| Pesan ganda akibat pengiriman ulang Meta | Penjaga id pesan di memori dengan TTL dan batas jumlah entri | `duplikat.js` |
| Cache FAQ dirusak pemanggil | Data FAQ dibekukan, dan Dev B hanya menerima `faqStore.getAll` | `parseFaq.js`, `app.js` |
| Admin merusak Sheet dan bot menjawab dari kolom salah | Header divalidasi. Bila tidak sesuai, cache lama dipakai dan peringatan dicatat | `parseFaq.js`, `faqStore.js` |
| Akses Sheets berlebihan | Scope `spreadsheets.readonly` dan Service Account berstatus Viewer | `sheets.js` |
| Balasan memicu pengambilan tautan oleh WhatsApp | `preview_url: false` | `client.js` |
| Sheets lambat atau mati menahan semua pesan | Timeout 8 detik, satu pembacaan bersama untuk permintaan bersamaan, jeda sebelum mencoba lagi, dan cache lama | `sheets.js`, `faqStore.js` |
| Konfigurasi salah baru ketahuan saat produksi | Validasi saat startup dengan pesan yang hanya menyebut nama variabel | `config.js` |
| Rahasia ikut ter-commit | `.gitignore` mencakup `.env*` dan pola kunci Service Account. Pemindaian pola kunci pada seluruh pohon kode tidak menemukan rahasia | `.gitignore` |

## Dependency

- `pnpm audit --prod`: tidak ada kerentanan pada dependency produksi (`@googleapis/sheets`).
- `pnpm audit`: satu temuan tingkat tinggi pada `picomatch` (ReDoS, versi 4.0.7 ke bawah, belum ada versi perbaikan), yang masuk lewat `vitest`. Paket ini hanya dipakai saat development untuk mencocokkan pola file, tidak ikut ke produksi, dan tidak menerima input dari luar. Risiko diterima. Periksa lagi bila Vitest merilis pembaruan.
- Lockfile (`pnpm-lock.yaml`) di-commit dan instalasi memakai `--frozen-lockfile`.

## Risiko yang tersisa dan rekomendasi

1. **Replay.** Signature Meta tidak memuat waktu, sehingga permintaan sah yang tertangkap bisa dikirim ulang. Syaratnya penyerang bisa menyadap lalu lintas yang sudah terenkripsi TLS, dan duplikat tertahan oleh penjaga id pesan di VPS. Risiko rendah.
2. **Penjaga duplikat pada Vercel hanya best-effort.** Setiap invokasi bisa berjalan di instance berbeda. Dampaknya hanya balasan ganda, bukan kebocoran atau kerusakan data. Catat pada Risk Register.
3. **Tidak ada pembatasan laju per pengirim.** Seorang pengguna bisa mengirim pesan beruntun dan memicu balasan beruntun. WhatsApp membatasi di sisinya, dan pembacaan Sheets dilindungi cache. Bila terjadi penyalahgunaan, tambahkan pembatas per nomor pada `handler.js`.
4. **Isi Sheet dipercaya.** Siapa pun yang berstatus Editor pada Sheet dapat mengubah jawaban bot, termasuk memasukkan tautan berbahaya. Batasi daftar Editor pada pengurus Humas, aktifkan verifikasi dua langkah akun mereka, dan tinjau riwayat versi secara berkala.
5. **Service Account.** Kunci JSON setara kata sandi. Bagikan hanya satu Sheet ke akun itu, jangan pernah memakai akun Google pribadi, dan putar (rotate) kuncinya bila ada kecurigaan bocor.
6. **Token akses WhatsApp.** Token sementara kedaluwarsa dan kebocorannya berdampak pada nomor bot. Pakai token System User, simpan hanya di environment hosting, dan ganti bila ada kecurigaan bocor.
7. **TLS pada VPS.** `server.js` melayani HTTP biasa. Selalu tempatkan di belakang reverse proxy HTTPS dan atur `HOST=127.0.0.1` agar port aplikasi tidak terbuka ke internet.
8. **Raw body di Vercel belum diuji pada Vercel sungguhan.** Test otomatis memverifikasi pembacaan raw body pada server Node dan pada handler Web Standard, tetapi perilaku platform Vercel perlu dipastikan lewat satu pesan uji setelah deploy pertama.
9. **Untuk Dev B.** Teks pesan sampai 4096 karakter diteruskan ke `handleMessage`. Hindari membangun ekspresi reguler dari input pengguna, dan jaga kompleksitas pencocokan agar tidak bergantung pada panjang input secara kuadratik.

## Checklist sebelum merge ke `main` (produksi)

- [ ] Semua test hijau: `pnpm test`
- [ ] `pnpm audit --prod` bersih
- [ ] `pnpm cek:sheets` berhasil dengan kredensial produksi
- [ ] `pnpm cek:wa <nomor penguji>` berhasil
- [ ] Verifikasi webhook di Meta berhasil dan pesan uji dibalas
- [ ] Log produksi tidak memuat isi pesan maupun nomor asli
- [ ] Nilai `.env` produksi hanya ada di hosting, tidak ada di repositori maupun riwayat commit
- [ ] Teks notice privasi sesuai dengan data yang benar-benar dicatat (metadata saja, tanpa isi pesan dan nomor asli)
- [ ] Entri penjaga duplikat pada Vercel sudah tercatat di Risk Register
