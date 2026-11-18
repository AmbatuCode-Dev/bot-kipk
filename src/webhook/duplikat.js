const TTL_BAWAAN_MS = 10 * 60 * 1000;
const MAKS_ENTRI_BAWAAN = 5000;

/**
 * Pencatat id pesan yang sudah diproses, untuk menahan pengiriman ulang dari Meta.
 *
 * Data hanya disimpan di memori proses. Pada VPS (satu proses berjalan terus)
 * ini efektif. Pada Vercel setiap invokasi bisa berjalan di instance berbeda,
 * jadi pengecekan ini hanya membantu sebisanya.
 *
 * @param {{ ttlMs?: number, maksEntri?: number, now?: () => number }} [opsi]
 */
export function createPenjagaDuplikat({ ttlMs = TTL_BAWAAN_MS, maksEntri = MAKS_ENTRI_BAWAAN, now = Date.now } = {}) {
  const terlihat = new Map();

  function bersihkan(sekarang) {
    for (const [id, kedaluwarsa] of terlihat) {
      if (kedaluwarsa > sekarang) break;
      terlihat.delete(id);
    }
    while (terlihat.size >= maksEntri) {
      terlihat.delete(terlihat.keys().next().value);
    }
  }

  return Object.freeze({
    /**
     * @param {string} id id pesan dari Meta
     * @returns {boolean} true jika id baru dan layak diproses, false jika sudah pernah terlihat
     */
    tandai(id) {
      const sekarang = now();
      bersihkan(sekarang);
      if (terlihat.has(id)) return false;
      terlihat.set(id, sekarang + ttlMs);
      return true;
    },
  });
}
