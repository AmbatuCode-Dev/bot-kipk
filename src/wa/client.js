const PANJANG_BODY_MAKS = 4096;
const POLA_NOMOR = /^\d{5,20}$/;
const TIMEOUT_BAWAAN_MS = 10_000;
const PANJANG_PESAN_META_MAKS = 200;

export class WaClientError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, code?: number | string, subkode?: number, fbtraceId?: string, cause?: unknown }} [rincian]
   */
  constructor(message, { status, code, subkode, fbtraceId, cause } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'WaClientError';
    this.status = status;
    this.code = code;
    this.subkode = subkode;
    this.fbtraceId = fbtraceId;
  }
}

function sanitasiPesanMeta(pesan) {
  return String(pesan ?? '')
    .replace(/\d{8,}/g, '[angka]')
    .slice(0, PANJANG_PESAN_META_MAKS);
}

/**
 * Klien minimal untuk mengirim pesan teks lewat WhatsApp Cloud API.
 *
 * @param {object} opsi
 * @param {string} opsi.accessToken
 * @param {string} opsi.phoneNumberId
 * @param {string} opsi.apiVersion misalnya "v25.0"
 * @param {typeof fetch} [opsi.fetchImpl]
 * @param {number} [opsi.timeoutMs]
 */
export function createWaClient({ accessToken, phoneNumberId, apiVersion, fetchImpl = fetch, timeoutMs = TIMEOUT_BAWAAN_MS }) {
  const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  return Object.freeze({
    /**
     * Mengirim satu pesan teks. Body yang kosong atau melebihi 4096 karakter
     * ditolak, tidak dipotong diam-diam. Tidak ada percobaan ulang otomatis,
     * karena permintaan yang timeout bisa saja sudah terkirim.
     *
     * @param {string} to nomor tujuan dalam format internasional tanpa tanda plus
     * @param {string} body
     * @returns {Promise<{ messageId: string | null }>}
     * @throws {WaClientError}
     */
    async sendText(to, body) {
      if (typeof to !== 'string' || !POLA_NOMOR.test(to)) {
        throw new WaClientError('Nomor tujuan tidak valid', { code: 'NOMOR_TIDAK_VALID' });
      }
      if (typeof body !== 'string' || body.trim() === '') {
        throw new WaClientError('Body pesan kosong', { code: 'BODY_KOSONG' });
      }
      if ([...body].length > PANJANG_BODY_MAKS) {
        throw new WaClientError(`Body pesan melebihi ${PANJANG_BODY_MAKS} karakter`, { code: 'BODY_TERLALU_PANJANG' });
      }

      let respons;
      try {
        respons = await fetchImpl(endpoint, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'text',
            text: { preview_url: false, body },
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        const habisWaktu = err?.name === 'TimeoutError' || err?.name === 'AbortError';
        throw new WaClientError(habisWaktu ? 'Cloud API tidak merespons tepat waktu' : 'Gagal menghubungi Cloud API', {
          code: habisWaktu ? 'TIMEOUT' : 'JARINGAN',
          cause: err,
        });
      }

      const data = await respons.json().catch(() => null);

      if (!respons.ok) {
        const galat = data?.error ?? {};
        throw new WaClientError(
          `Cloud API menolak permintaan (HTTP ${respons.status}): ${sanitasiPesanMeta(galat.message)}`,
          { status: respons.status, code: galat.code, subkode: galat.error_subcode, fbtraceId: galat.fbtrace_id },
        );
      }

      return { messageId: data?.messages?.[0]?.id ?? null };
    },
  });
}
