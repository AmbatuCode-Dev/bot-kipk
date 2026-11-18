import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { createWebhook } from '../../src/webhook/handler.js';
import { createPenjagaDuplikat } from '../../src/webhook/duplikat.js';
import { loadConfig } from '../../src/config.js';
import { envUji } from '../helpers/env.js';

const config = loadConfig(envUji());
const URL_WEBHOOK = 'https://bot.contoh.id/api/webhook';
const NOMOR_PENGIRIM = '6281234567890';
const ISI_RAHASIA = 'pertanyaan rahasia mahasiswa';

function loggerUji() {
  const catatan = [];
  const rekam = (level) => (pesan, field = {}) => catatan.push({ level, pesan, ...field });
  return { info: rekam('info'), warn: rekam('warn'), error: rekam('error'), catatan };
}

function payloadPesan(id = 'wamid.AAA', teks = ISI_RAHASIA) {
  return JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [
      {
        changes: [
          {
            field: 'messages',
            value: {
              metadata: { phone_number_id: config.wa.phoneNumberId },
              messages: [{ from: NOMOR_PENGIRIM, id, timestamp: '1763433600', type: 'text', text: { body: teks } }],
            },
          },
        ],
      },
    ],
  });
}

function postBertandatangan(body, { rahasia = config.wa.appSecret, header } = {}) {
  const signature = header ?? 'sha256=' + createHmac('sha256', rahasia).update(body).digest('hex');
  return new Request(URL_WEBHOOK, { method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': signature }, body });
}

function siapkan(ubah = {}) {
  const logger = loggerUji();
  const handleMessage = vi.fn(async () => ({ body: 'jawaban uji' }));
  const waClient = { sendText: vi.fn(async () => ({ messageId: 'wamid.balasan' })) };
  const deps = Object.freeze({ faqStore: Object.freeze({ getAll: async () => [] }) });
  const webhook = createWebhook({
    config,
    handleMessage,
    deps,
    waClient,
    logger,
    penjagaDuplikat: createPenjagaDuplikat(),
    ...ubah,
  });
  return { webhook, handleMessage, waClient, deps, logger };
}

describe('GET: verifikasi webhook', () => {
  const urlVerifikasi = (token, tantangan = '1158201444', mode = 'subscribe') =>
    new Request(`${URL_WEBHOOK}?hub.mode=${mode}&hub.verify_token=${encodeURIComponent(token)}&hub.challenge=${tantangan}`);

  it('mengembalikan hub.challenge sebagai teks biasa bila token cocok', async () => {
    const { webhook } = siapkan();
    const res = await webhook(urlVerifikasi(config.wa.verifyToken));

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('1158201444');
    expect(res.headers.get('content-type')).toContain('text/plain');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('menolak token yang salah dan mencatatnya tanpa memuat tokennya', async () => {
    const { webhook, logger } = siapkan();
    const res = await webhook(urlVerifikasi('token-salah'));

    expect(res.status).toBe(403);
    expect(await res.text()).not.toContain('1158201444');
    expect(JSON.stringify(logger.catatan)).not.toContain('token-salah');
  });

  it.each([
    ['mode bukan subscribe', (t) => urlVerifikasi(t, '1', 'unsubscribe')],
    ['tanpa hub.challenge', (t) => new Request(`${URL_WEBHOOK}?hub.mode=subscribe&hub.verify_token=${t}`)],
    ['tanpa parameter sama sekali', () => new Request(URL_WEBHOOK)],
  ])('menolak permintaan %s', async (_label, buat) => {
    const { webhook } = siapkan();

    expect((await webhook(buat(config.wa.verifyToken))).status).toBe(403);
  });

  it('menolak challenge yang kosong atau terlalu panjang', async () => {
    const { webhook } = siapkan();

    expect((await webhook(urlVerifikasi(config.wa.verifyToken, ''))).status).toBe(400);
    expect((await webhook(urlVerifikasi(config.wa.verifyToken, 'a'.repeat(300)))).status).toBe(400);
  });
});

describe('metode HTTP', () => {
  it.each(['PUT', 'DELETE', 'PATCH'])('menolak %s dengan 405 dan header Allow', async (metode) => {
    const { webhook } = siapkan();
    const res = await webhook(new Request(URL_WEBHOOK, { method: metode }));

    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('GET, POST');
  });
});

describe('POST: penerimaan pesan', () => {
  it('memproses pesan teks lalu membalas ke pengirim yang sama', async () => {
    const { webhook, handleMessage, waClient, deps } = siapkan();
    const res = await webhook(postBertandatangan(payloadPesan()));

    expect(res.status).toBe(200);
    expect(handleMessage).toHaveBeenCalledTimes(1);
    const [ctx, depsDiterima] = handleMessage.mock.calls[0];
    expect(ctx).toEqual({ messageId: 'wamid.AAA', from: NOMOR_PENGIRIM, type: 'text', text: ISI_RAHASIA, timestamp: 1763433600 });
    expect(Object.isFrozen(ctx)).toBe(true);
    expect(depsDiterima).toBe(deps);
    expect(waClient.sendText).toHaveBeenCalledWith(NOMOR_PENGIRIM, 'jawaban uji');
  });

  it('menolak signature yang salah tanpa memanggil handler atau mengirim balasan', async () => {
    const { webhook, handleMessage, waClient } = siapkan();
    const res = await webhook(postBertandatangan(payloadPesan(), { rahasia: 'rahasia-palsu' }));

    expect(res.status).toBe(401);
    expect(handleMessage).not.toHaveBeenCalled();
    expect(waClient.sendText).not.toHaveBeenCalled();
  });

  it.each([
    ['tanpa header signature', () => new Request(URL_WEBHOOK, { method: 'POST', body: payloadPesan() })],
    ['header tanpa awalan sha256=', () => postBertandatangan(payloadPesan(), { header: 'abc' })],
  ])('menolak permintaan %s', async (_label, buat) => {
    const { webhook, handleMessage } = siapkan();

    expect((await webhook(buat())).status).toBe(401);
    expect(handleMessage).not.toHaveBeenCalled();
  });

  it('menolak body yang diubah setelah ditandatangani', async () => {
    const { webhook, handleMessage } = siapkan();
    const asli = payloadPesan();
    const req = new Request(URL_WEBHOOK, {
      method: 'POST',
      headers: { 'x-hub-signature-256': 'sha256=' + createHmac('sha256', config.wa.appSecret).update(asli).digest('hex') },
      body: asli.replace('wamid.AAA', 'wamid.ZZZ'),
    });

    expect((await webhook(req)).status).toBe(401);
    expect(handleMessage).not.toHaveBeenCalled();
  });

  it('membalas 400 untuk body yang bertanda tangan sah tetapi bukan JSON', async () => {
    const { webhook } = siapkan();

    expect((await webhook(postBertandatangan('bukan json'))).status).toBe(400);
  });

  it('menolak body yang melebihi 1 MiB, baik dari header Content-Length maupun dari isinya', async () => {
    const { webhook } = siapkan();
    const besar = 'x'.repeat(1024 * 1024 + 1);

    const dariHeader = new Request(URL_WEBHOOK, { method: 'POST', headers: { 'content-length': String(besar.length) }, body: 'kecil' });
    const dariIsi = new Request(URL_WEBHOOK, { method: 'POST', body: besar });

    expect((await webhook(dariHeader)).status).toBe(413);
    expect((await webhook(dariIsi)).status).toBe(413);
  });

  it('membalas 200 tanpa memanggil handler untuk notifikasi status', async () => {
    const { webhook, handleMessage } = siapkan();
    const status = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: config.wa.phoneNumberId }, statuses: [{ id: 'wamid.AAA', status: 'read' }] } }] }],
    });

    expect((await webhook(postBertandatangan(status))).status).toBe(200);
    expect(handleMessage).not.toHaveBeenCalled();
  });

  it('memproses pesan dengan id yang sama hanya sekali', async () => {
    const { webhook, handleMessage, waClient } = siapkan();

    await webhook(postBertandatangan(payloadPesan('wamid.ULANG')));
    await webhook(postBertandatangan(payloadPesan('wamid.ULANG')));

    expect(handleMessage).toHaveBeenCalledTimes(1);
    expect(waClient.sendText).toHaveBeenCalledTimes(1);
  });

  it('meneruskan pesan selain teks ke handler dengan type other', async () => {
    const { webhook, handleMessage } = siapkan();
    const gambar = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: config.wa.phoneNumberId }, messages: [{ from: NOMOR_PENGIRIM, id: 'wamid.IMG', timestamp: '1', type: 'image', image: {} }] } }] }],
    });

    await webhook(postBertandatangan(gambar));

    expect(handleMessage.mock.calls[0][0]).toMatchObject({ type: 'other', text: '' });
  });
});

describe('POST: kegagalan di dalam pemrosesan', () => {
  it('mengirim pesan darurat bila handler melempar error, lalu tetap membalas 200', async () => {
    const { webhook, waClient, logger } = siapkan({ handleMessage: vi.fn(async () => { throw new Error('handler rusak'); }) });
    const res = await webhook(postBertandatangan(payloadPesan()));

    expect(res.status).toBe(200);
    expect(waClient.sendText).toHaveBeenCalledWith(NOMOR_PENGIRIM, expect.stringContaining('gangguan'));
    expect(logger.catatan.find((c) => c.pesan === 'handler_gagal')).toMatchObject({ level: 'error', pesanError: 'handler rusak' });
  });

  it.each([[undefined], [null], [{}], [{ body: '' }], [{ body: '   ' }], [{ body: 42 }]])(
    'mengirim pesan darurat bila handler mengembalikan %j',
    async (hasil) => {
      const { webhook, waClient } = siapkan({ handleMessage: vi.fn(async () => hasil) });

      await webhook(postBertandatangan(payloadPesan()));

      expect(waClient.sendText).toHaveBeenCalledWith(NOMOR_PENGIRIM, expect.stringContaining('gangguan'));
    },
  );

  it('tetap membalas 200 dan mencatat error bila pengiriman balasan gagal', async () => {
    const waClient = { sendText: vi.fn(async () => { throw Object.assign(new Error('Cloud API menolak'), { status: 400, code: 131030 }); }) };
    const { webhook, logger } = siapkan({ waClient });
    const res = await webhook(postBertandatangan(payloadPesan()));

    expect(res.status).toBe(200);
    expect(logger.catatan.find((c) => c.pesan === 'balasan_gagal')).toMatchObject({ level: 'error', statusHttp: 400, kodeError: 131030 });
  });

  it('satu pesan yang gagal tidak menghentikan pesan berikutnya dalam payload yang sama', async () => {
    const handleMessage = vi.fn(async (ctx) => {
      if (ctx.messageId === 'wamid.1') throw new Error('rusak');
      return { body: 'ok ' + ctx.messageId };
    });
    const { webhook, waClient } = siapkan({ handleMessage });
    const dua = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: config.wa.phoneNumberId }, messages: [
        { from: NOMOR_PENGIRIM, id: 'wamid.1', timestamp: '1', type: 'text', text: { body: 'a' } },
        { from: NOMOR_PENGIRIM, id: 'wamid.2', timestamp: '2', type: 'text', text: { body: 'b' } },
      ] } }] }],
    });

    await webhook(postBertandatangan(dua));

    expect(waClient.sendText).toHaveBeenCalledTimes(2);
    expect(waClient.sendText).toHaveBeenLastCalledWith(NOMOR_PENGIRIM, 'ok wamid.2');
  });
});

describe('ackEarly', () => {
  it('membalas 200 sebelum pengiriman balasan selesai bila ackEarly aktif', async () => {
    let lepaskan;
    let selesai = false;
    const waClient = {
      sendText: vi.fn(
        () =>
          new Promise((resolve) => {
            lepaskan = () => {
              selesai = true;
              resolve();
            };
          }),
      ),
    };
    const { webhook } = siapkan({ waClient, ackEarly: true });

    const res = await webhook(postBertandatangan(payloadPesan()));

    expect(res.status).toBe(200);
    expect(selesai).toBe(false);
    await vi.waitFor(() => expect(waClient.sendText).toHaveBeenCalledTimes(1));
    lepaskan();
    await vi.waitFor(() => expect(selesai).toBe(true));
  });

  it('menunggu balasan terkirim sebelum membalas 200 bila ackEarly mati', async () => {
    const urutan = [];
    const waClient = { sendText: vi.fn(async () => { await new Promise((r) => setTimeout(r, 20)); urutan.push('terkirim'); }) };
    const { webhook } = siapkan({ waClient });

    await webhook(postBertandatangan(payloadPesan()));
    urutan.push('respons');

    expect(urutan).toEqual(['terkirim', 'respons']);
  });
});

describe('privasi log', () => {
  it('tidak mencatat isi pesan, nomor asli, maupun rahasia', async () => {
    const { webhook, logger } = siapkan();

    await webhook(postBertandatangan(payloadPesan()));
    await webhook(postBertandatangan(payloadPesan('wamid.LAIN'), { rahasia: 'salah' }));

    const semuaLog = JSON.stringify(logger.catatan);
    expect(semuaLog).not.toContain(ISI_RAHASIA);
    expect(semuaLog).not.toContain(NOMOR_PENGIRIM);
    expect(semuaLog).not.toContain(config.wa.appSecret);
    expect(semuaLog).not.toContain(config.wa.accessToken);
    expect(logger.catatan.find((c) => c.pesan === 'balasan_terkirim').pengirim).toMatch(/^[0-9a-f]{10}$/);
  });
});
