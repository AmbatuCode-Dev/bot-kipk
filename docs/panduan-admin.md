# Panduan Admin FAQ Bot

Panduan ini untuk **Divisi Humas Forum KIP-Kuliah UNJ** yang mengelola isi bot WhatsApp lewat Google Sheets. Tidak perlu coding: cukup ubah baris di tab `FAQ`, dan bot memakai isi terbaru sekitar **1 menit** kemudian.

## Yang Paling Penting

1. **ID tidak boleh diubah atau dihapus.** ID adalah nomor menu yang diketik mahasiswa.
2. **Mau menyembunyikan FAQ? Ubah Aktif jadi `FALSE`**, jangan hapus barisnya.
3. **Baris 1 (header) dan urutan kolom tidak boleh diubah**, karena bot berhenti membaca Sheet kalau header berbeda.

## Bentuk Tab FAQ

Satu baris berisi satu pertanyaan. Contoh:

| ID | Kategori | Pertanyaan | Kata Kunci | Teks Jawaban | Aktif |
|---|---|---|---|---|---|
| 1 | Pencairan | Kapan dana KIP-K cair? | pencairan, cair, kapan cair, kpn cair | Dana cair bertahap setiap semester... | TRUE |
| 2 | Pencairan | Kenapa dana belum masuk rekening? | belum masuk, belum cair, rekening | Cek dulu status rekening... | TRUE |
| 3 | Syarat | Apa syarat daftar ulang? | syarat, daftar ulang, berkas | Siapkan KTM dan KHS... | TRUE |
| 4 | Kontak | Siapa yang bisa dihubungi? | kontak, admin, hubungi | Hubungi Humas lewat... | FALSE |

Dari contoh di atas, mahasiswa yang mengetik "menu" akan melihat:

```
*Pencairan*
1. Kapan dana KIP-K cair?
2. Kenapa dana belum masuk rekening?

*Syarat*
3. Apa syarat daftar ulang?
```

Baris 4 tidak muncul karena Aktif-nya `FALSE`.

Bot hanya membaca kolom **A sampai F**. Kolom G dan seterusnya boleh dipakai untuk catatan internal Humas, misalnya tanggal terakhir diperbarui.

## Cara Mengisi Tiap Kolom

### ID

- Angka bulat mulai dari 1, tanpa titik atau huruf.
- Harus unik. Kalau ada dua baris dengan ID sama, hanya baris yang paling atas yang dipakai.
- FAQ baru memakai **angka berikutnya** (misalnya sesudah 12 adalah 13). Jangan memakai lagi ID milik FAQ yang sudah dimatikan, supaya mahasiswa yang mengingat nomor lama tidak mendapat jawaban yang berbeda.

### Kategori

- Judul kelompok di menu, misalnya `Pencairan`, `Syarat`, `Rekening`.
- Tulis dengan ejaan yang **persis sama** untuk FAQ sekelompok. `Pencairan` dan `pencairan` dianggap dua kategori berbeda.
- Kalau dikosongkan, FAQ masuk ke kelompok **Lainnya**.

### Pertanyaan

- Kalimat tanya singkat yang tampil sebagai pilihan di menu.
- **Wajib diisi.** Baris tanpa pertanyaan tidak dipakai bot.
- Usahakan **paling banyak 60 karakter** supaya menu tetap rapi di layar HP.

### Kata Kunci

Dipakai bot untuk menjawab pertanyaan yang diketik bebas. Pisahkan dengan koma. Huruf besar-kecil dan tanda baca tidak berpengaruh. Lihat [Tips Kata Kunci](#tips-kata-kunci).

### Teks Jawaban

- Boleh beberapa baris (tekan `Alt+Enter` di dalam sel untuk baris baru).
- Format WhatsApp bisa dipakai: `*tebal*`, `_miring_`.
- Batasnya sekitar **4.000 karakter**. Jawaban yang lebih panjang akan dipotong, jadi pecah menjadi beberapa FAQ kalau terlalu panjang.
- **Wajib diisi.** Baris tanpa jawaban tidak dipakai bot.
- **Jangan isi data pribadi** mahasiswa (nama, NIM, nomor HP, nomor rekening, dan sejenisnya).

Bot otomatis menambahkan "Ketik *menu* untuk melihat daftar pertanyaan lain." di akhir setiap jawaban, jadi tidak perlu ditulis.

### Aktif

- `TRUE`: FAQ tampil di menu dan bisa dijawab.
- `FALSE` atau kosong: FAQ disembunyikan sepenuhnya.
- Boleh berupa teks `TRUE`/`FALSE` atau checkbox.

## Tips Kata Kunci

Bot mencocokkan **kata utuh**, bukan potongan kata. FAQ dengan kata kunci paling banyak yang cocok akan dipilih sebagai jawaban.

- **Masukkan semua variasi yang biasa diketik mahasiswa**, termasuk singkatan dan salah ketik. `cair` tidak otomatis cocok dengan `pencairan`, jadi tulis keduanya: `cair, pencairan, kpn cair, kapan cair`.
- **Frasa boleh**, misalnya `daftar ulang`. Frasa hanya cocok kalau kata-katanya muncul berurutan di pesan.
- **Hindari kata yang terlalu umum** seperti `kapan`, `kip`, `kak`, atau `dana` sebagai kata kunci tunggal. Kata seperti ini muncul di banyak pertanyaan sehingga bot bisa memilih FAQ yang salah. Gunakan dalam frasa, misalnya `kapan cair`.
- **Tidak perlu memasukkan kata sapaan** (halo, kak, min, assalamualaikum). Pesan yang isinya hanya sapaan otomatis dibalas dengan menu.

## Tugas Sehari-hari

| Ingin... | Caranya |
|---|---|
| Menambah FAQ | Tambah baris baru di bawah, ID = angka berikutnya, isi semua kolom, Aktif = `TRUE` |
| Mengubah jawaban | Ubah sel Teks Jawaban. ID jangan diubah |
| Menyembunyikan FAQ sementara | Aktif = `FALSE` |
| Menampilkan lagi | Aktif = `TRUE` |
| Memindah FAQ ke kategori lain | Ubah sel Kategori |

**FAQ musiman.** Topik pertanyaan berganti setiap periode (misalnya verifikasi berkas sekitar April–Mei, pencairan sekitar Juni). Nyalakan FAQ yang sedang musim dan matikan yang sudah lewat supaya menu tetap pendek dan relevan. FAQ yang dimatikan tidak hilang dan bisa dinyalakan lagi tahun depan.

**Jaga menu tetap pendek.** Satu pesan WhatsApp maksimal 4.096 karakter. Kalau FAQ aktif terlalu banyak, ujung daftar menu akan terpotong.

## Mengecek Hasil Perubahan

Tunggu sekitar 1 menit setelah mengubah Sheet, lalu dari nomor penguji:

1. Kirim `menu`. Pastikan FAQ yang baru muncul di kategori yang benar.
2. Ketik nomornya. Pastikan jawabannya sesuai.
3. Ketik pertanyaan bebas seperti yang biasa ditanyakan mahasiswa. Pastikan bot memilih FAQ yang tepat. Kalau salah, tambah atau perbaiki Kata Kunci.

## Jangan Lakukan

- Mengubah, menghapus, atau menggeser baris 1 (header).
- Menyisipkan, menghapus, atau menukar urutan kolom A–F.
- Mengganti nama tab `FAQ`.
- Mengubah ID yang sudah dipakai, atau menghapus baris FAQ.
- Menghapus akses email Service Account bot dari daftar share Sheet.
- Menulis data pribadi atau data sensitif mahasiswa di Sheet.

## Kalau Ada Masalah

| Gejala | Kemungkinan penyebab |
|---|---|
| FAQ tidak muncul di menu | Aktif bukan `TRUE`, ID kosong/bukan angka/dobel, atau Pertanyaan/Teks Jawaban kosong |
| Perubahan belum terlihat | Belum lewat 1 menit. Coba lagi sebentar lagi |
| Bot menjawab FAQ yang salah | Kata Kunci terlalu umum atau kurang variasi |
| Bot membalas "sedang mengalami gangguan" | Bot tidak bisa membaca Sheet. Pastikan header, nama tab, dan akses share tidak berubah, lalu hubungi tim developer |

Teks sapaan, notice privasi, dan pesan saat bot tidak mengerti tidak ada di Sheet. Kalau ingin mengubahnya, kirim usulan kalimatnya ke tim developer.
