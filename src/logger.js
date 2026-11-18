import { createHmac } from 'node:crypto';

const PANJANG_MAKS_PESAN_ERROR = 300;

/**
 * Menyamarkan nomor pengirim menjadi kode pendek yang konsisten.
 * Nomor yang sama selalu menghasilkan kode yang sama, tetapi nomor aslinya
 * tidak bisa dipulihkan dari log tanpa mengetahui kunci.
 *
 * @param {string} nomor
 * @param {string} kunci rahasia untuk HMAC
 * @returns {string} 10 karakter heksadesimal
 */
export function anonimkanNomor(nomor, kunci) {
  return createHmac('sha256', kunci).update(String(nomor)).digest('hex').slice(0, 10);
}

/**
 * Meringkas error menjadi field yang aman untuk dicatat.
 * Objek error tidak dicatat utuh karena error dari pustaka HTTP dapat memuat
 * konfigurasi permintaan, termasuk header Authorization.
 *
 * @param {unknown} err
 * @returns {{ error: string, pesanError: string, kodeError?: string | number, statusHttp?: number }}
 */
export function ringkasError(err) {
  const ringkasan = {
    error: err instanceof Error ? err.name : typeof err,
    pesanError: String(err instanceof Error ? err.message : err).slice(0, PANJANG_MAKS_PESAN_ERROR),
  };
  if (err && (typeof err.code === 'string' || typeof err.code === 'number')) ringkasan.kodeError = err.code;
  if (err && Number.isInteger(err.status)) ringkasan.statusHttp = err.status;
  return ringkasan;
}

function tulisKonsol(level, baris) {
  if (level === 'error') console.error(baris);
  else console.log(baris);
}

/**
 * Logger JSON satu baris per entri, ditulis ke stdout (info, warn) atau stderr (error).
 * Isi pesan mahasiswa dan nomor telepon tidak boleh dikirim ke logger.
 *
 * @param {{ tulis?: (level: string, baris: string) => void, now?: () => number }} [opsi]
 */
export function createLogger({ tulis = tulisKonsol, now = Date.now } = {}) {
  const catat = (level) => (pesan, field = {}) => {
    tulis(level, JSON.stringify({ waktu: new Date(now()).toISOString(), level, pesan, ...field }));
  };
  return Object.freeze({ info: catat('info'), warn: catat('warn'), error: catat('error') });
}
