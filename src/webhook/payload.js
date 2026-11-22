const PANJANG_TEKS_MAKS = 4096;
const POLA_NOMOR = /^\d{5,20}$/;

/**
 * Mengubah payload webhook WhatsApp menjadi daftar ctx untuk handler percakapan.
 *
 * Entri tanpa `messages` (misalnya status delivered dan read) tidak menghasilkan
 * apa-apa. Reaksi emoji terhadap pesan juga diabaikan, karena bukan pertanyaan
 * dan tidak pantas dibalas. Pesan yang bentuknya tidak lengkap atau ditujukan ke nomor bot lain
 * dilewati dan dihitung pada `dilewati`.
 *
 * @param {unknown} payload hasil JSON.parse dari body webhook
 * @param {string} phoneNumberId Phone Number ID milik bot ini
 * @returns {{ pesan: Array<{ messageId: string, from: string, type: 'text' | 'other', text: string, timestamp: number }>, dilewati: number }}
 */
export function ekstrakPesan(payload, phoneNumberId) {
  const hasil = { pesan: [], dilewati: 0 };
  if (payload?.object !== 'whatsapp_business_account' || !Array.isArray(payload.entry)) return hasil;

  for (const entri of payload.entry) {
    if (!Array.isArray(entri?.changes)) continue;

    for (const perubahan of entri.changes) {
      if (perubahan?.field !== 'messages') continue;

      const nilai = perubahan.value;
      if (!Array.isArray(nilai?.messages)) continue;

      if (nilai.metadata?.phone_number_id !== phoneNumberId) {
        hasil.dilewati += nilai.messages.length;
        continue;
      }

      for (const pesan of nilai.messages) {
        if (pesan?.type === 'reaction') continue;
        const ctx = bentukCtx(pesan);
        if (ctx) hasil.pesan.push(ctx);
        else hasil.dilewati += 1;
      }
    }
  }

  return hasil;
}

function bentukCtx(pesan) {
  if (typeof pesan?.id !== 'string' || pesan.id === '') return null;
  if (typeof pesan.from !== 'string' || !POLA_NOMOR.test(pesan.from)) return null;

  const teks = pesan.type === 'text' && typeof pesan.text?.body === 'string' ? pesan.text.body : null;
  const timestamp = Number(pesan.timestamp);

  return {
    messageId: pesan.id,
    from: pesan.from,
    type: teks === null ? 'other' : 'text',
    text: teks === null ? '' : teks.slice(0, PANJANG_TEKS_MAKS),
    timestamp: Number.isFinite(timestamp) ? timestamp : 0,
  };
}
