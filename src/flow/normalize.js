// Merapikan teks agar pesan mahasiswa dan kata kunci FAQ bisa dibandingkan dengan aturan yang sama.
// Selain huruf dan angka (tanda baca, emoji, spasi berlebih) diganti satu spasi.
export function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
