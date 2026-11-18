import { describe, expect, it } from 'vitest';
import { ekstrakPesan } from '../../src/webhook/payload.js';

const NOMOR_BOT = '123456789012345';

function payload({ pesan = [], phoneNumberId = NOMOR_BOT, field = 'messages', objek = 'whatsapp_business_account' } = {}) {
  return {
    object: objek,
    entry: [
      {
        id: '999',
        changes: [
          {
            field,
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '15550001111', phone_number_id: phoneNumberId },
              contacts: [{ profile: { name: 'Penanya' }, wa_id: '6281234567890' }],
              messages: pesan,
            },
          },
        ],
      },
    ],
  };
}

const pesanTeks = { from: '6281234567890', id: 'wamid.AAA', timestamp: '1763433600', type: 'text', text: { body: 'Kapan pencairan?' } };

describe('ekstrakPesan', () => {
  it('membentuk ctx dari pesan teks', () => {
    const { pesan, dilewati } = ekstrakPesan(payload({ pesan: [pesanTeks] }), NOMOR_BOT);

    expect(dilewati).toBe(0);
    expect(pesan).toEqual([
      { messageId: 'wamid.AAA', from: '6281234567890', type: 'text', text: 'Kapan pencairan?', timestamp: 1763433600 },
    ]);
  });

  it('menandai pesan selain teks sebagai other dengan text kosong', () => {
    const gambar = { from: '6281234567890', id: 'wamid.BBB', timestamp: '1763433601', type: 'image', image: { id: 'x', caption: 'rahasia' } };
    const { pesan } = ekstrakPesan(payload({ pesan: [gambar] }), NOMOR_BOT);

    expect(pesan).toEqual([{ messageId: 'wamid.BBB', from: '6281234567890', type: 'other', text: '', timestamp: 1763433601 }]);
  });

  it('mempertahankan urutan beberapa pesan dalam satu payload', () => {
    const kedua = { ...pesanTeks, id: 'wamid.CCC', text: { body: 'halo' } };
    const { pesan } = ekstrakPesan(payload({ pesan: [pesanTeks, kedua] }), NOMOR_BOT);

    expect(pesan.map((p) => p.messageId)).toEqual(['wamid.AAA', 'wamid.CCC']);
  });

  it('tidak menghasilkan pesan dari notifikasi status', () => {
    const status = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            { field: 'messages', value: { metadata: { phone_number_id: NOMOR_BOT }, statuses: [{ id: 'wamid.AAA', status: 'delivered' }] } },
          ],
        },
      ],
    };

    expect(ekstrakPesan(status, NOMOR_BOT)).toEqual({ pesan: [], dilewati: 0 });
  });

  it('melewati pesan untuk Phone Number ID lain', () => {
    const hasil = ekstrakPesan(payload({ pesan: [pesanTeks], phoneNumberId: '555' }), NOMOR_BOT);

    expect(hasil).toEqual({ pesan: [], dilewati: 1 });
  });

  it('mengabaikan field selain messages dan objek selain whatsapp_business_account', () => {
    expect(ekstrakPesan(payload({ pesan: [pesanTeks], field: 'account_update' }), NOMOR_BOT).pesan).toEqual([]);
    expect(ekstrakPesan(payload({ pesan: [pesanTeks], objek: 'page' }), NOMOR_BOT).pesan).toEqual([]);
  });

  it.each([
    ['tanpa id', { ...pesanTeks, id: undefined }],
    ['id kosong', { ...pesanTeks, id: '' }],
    ['tanpa from', { ...pesanTeks, from: undefined }],
    ['from bukan angka', { ...pesanTeks, from: '62abc' }],
    ['from terlalu pendek', { ...pesanTeks, from: '123' }],
    ['berupa null', null],
  ])('melewati pesan yang %s', (_label, pesan) => {
    expect(ekstrakPesan(payload({ pesan: [pesan] }), NOMOR_BOT)).toEqual({ pesan: [], dilewati: 1 });
  });

  it('memperlakukan teks bertipe text tetapi tanpa body sebagai other', () => {
    const { pesan } = ekstrakPesan(payload({ pesan: [{ ...pesanTeks, text: {} }] }), NOMOR_BOT);

    expect(pesan[0].type).toBe('other');
    expect(pesan[0].text).toBe('');
  });

  it('memotong teks yang melebihi 4096 karakter', () => {
    const panjang = { ...pesanTeks, text: { body: 'a'.repeat(10000) } };

    expect(ekstrakPesan(payload({ pesan: [panjang] }), NOMOR_BOT).pesan[0].text).toHaveLength(4096);
  });

  it('memakai timestamp 0 bila nilainya tidak valid', () => {
    const { pesan } = ekstrakPesan(payload({ pesan: [{ ...pesanTeks, timestamp: 'kemarin' }] }), NOMOR_BOT);

    expect(pesan[0].timestamp).toBe(0);
  });

  it.each([[null], [undefined], ['teks'], [42], [{}], [{ object: 'whatsapp_business_account', entry: 'x' }], [{ object: 'whatsapp_business_account', entry: [null, { changes: 1 }] }]])(
    'tidak error pada payload yang bentuknya aneh: %j',
    (aneh) => {
      expect(ekstrakPesan(aneh, NOMOR_BOT)).toEqual({ pesan: [], dilewati: 0 });
    },
  );
});
