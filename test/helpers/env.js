import { generateKeyPairSync } from 'node:crypto';

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

export const KUNCI_PRIVAT_UJI = privateKey;

export const KREDENSIAL_UJI = {
  type: 'service_account',
  client_email: 'bot-kipk@proyek-uji.iam.gserviceaccount.com',
  private_key: privateKey,
};

/** Environment lengkap dan valid untuk pengujian. */
export function envUji(tambahan = {}) {
  return {
    WA_VERIFY_TOKEN: 'token-verifikasi-uji',
    WA_APP_SECRET: 'rahasia-aplikasi-uji',
    WA_ACCESS_TOKEN: 'EAAB-token-akses-uji',
    WA_PHONE_NUMBER_ID: '123456789012345',
    GOOGLE_SA_JSON: JSON.stringify(KREDENSIAL_UJI),
    SHEET_ID: '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789',
    ...tambahan,
  };
}
