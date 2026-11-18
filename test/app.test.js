import { createServer } from 'node:http';
import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { KOLOM_HEADER } from '../src/data/parseFaq.js';
import { createNodeListener } from '../src/webhook/nodeAdapter.js';
import { envUji } from './helpers/env.js';

const config = loadConfig(envUji());
const BARIS_SHEET = [[...KOLOM_HEADER], ['1', 'Pencairan', 'cair, pencairan', 'Pencairan dilakukan bertahap.', 'TRUE'], ['2', 'Rahasia', 'x', 'jangan tampil', 'FALSE']];

function loggerSenyap() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function payload(id, teks) {
  return JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: config.wa.phoneNumberId }, messages: [{ from: '6281234567890', id, timestamp: '1763433600', type: 'text', text: { body: teks } }] } }] }],
  });
}

function tandatangani(body) {
  return 'sha256=' + createHmac('sha256', config.wa.appSecret).update(body).digest('hex');
}

describe('createApp', () => {
  it('melempar TypeError yang jelas bila handleMessage bukan fungsi', () => {
    expect(() => createApp({ config, handleMessage: 'bukan fungsi', logger: loggerSenyap() })).toThrow(/handleMessage belum tersedia/);
  });

  it('meminjamkan ke handleMessage hanya faqStore.getAll berisi FAQ aktif, tanpa baris nonaktif', async () => {
    let depsDiterima;
    const app = createApp({
      config,
      logger: loggerSenyap(),
      ambilBaris: async () => BARIS_SHEET,
      fetchImpl: async () => new Response('{"messages":[{"id":"wamid.x"}]}'),
      handleMessage: async (_ctx, deps) => {
        depsDiterima = deps;
        return { body: 'ok' };
      },
    });
    const body = payload('wamid.1', 'halo');

    await app.webhook(new Request('https://bot.contoh.id/api/webhook', { method: 'POST', headers: { 'x-hub-signature-256': tandatangani(body) }, body }));

    expect(Object.keys(depsDiterima)).toEqual(['faqStore']);
    expect(Object.keys(depsDiterima.faqStore)).toEqual(['getAll']);
    expect(Object.isFrozen(depsDiterima)).toBe(true);
    expect(await depsDiterima.faqStore.getAll()).toEqual([
      { id: 1, kategori: 'Pencairan', keywords: ['cair', 'pencairan'], jawaban: 'Pencairan dilakukan bertahap.' },
    ]);
  });
});

describe('alur lengkap lewat HTTP sungguhan', () => {
  const dibuka = [];
  afterEach(async () => {
    await Promise.all(dibuka.splice(0).map((s) => new Promise((selesai) => { s.closeAllConnections(); s.close(selesai); })));
  });

  async function jalankan({ handleMessage, fetchImpl, ackEarly = false }) {
    const logger = loggerSenyap();
    const app = createApp({ config, logger, ackEarly, ambilBaris: async () => BARIS_SHEET, fetchImpl, handleMessage });
    const rute = new Map([['/webhook', app.webhook]]);
    const server = createServer(createNodeListener({ rute, logger }));
    await new Promise((selesai) => server.listen(0, '127.0.0.1', selesai));
    dibuka.push(server);
    return { basis: `http://127.0.0.1:${server.address().port}`, logger };
  }

  it('memverifikasi signature atas byte asli, memanggil handler, dan mengirim balasan ke Graph API', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messages":[{"id":"wamid.balasan"}]}', { status: 200 }));
    const handleMessage = vi.fn(async (ctx, deps) => {
      const faq = await deps.faqStore.getAll();
      return { body: `${ctx.text} -> ${faq[0].jawaban}` };
    });
    const { basis } = await jalankan({ handleMessage, fetchImpl });
    const body = payload('wamid.E2E', 'kapan cair? café 😀');

    const res = await fetch(`${basis}/webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': tandatangani(body) }, body });

    expect(res.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://graph.facebook.com/v25.0/123456789012345/messages');
    expect(init.headers.Authorization).toBe(`Bearer ${config.wa.accessToken}`);
    expect(JSON.parse(init.body)).toMatchObject({ to: '6281234567890', text: { body: 'kapan cair? café 😀 -> Pencairan dilakukan bertahap.' } });
  });

  it('menolak permintaan bertanda tangan palsu sebelum menyentuh handler maupun Graph API', async () => {
    const fetchImpl = vi.fn();
    const handleMessage = vi.fn();
    const { basis } = await jalankan({ handleMessage, fetchImpl });
    const body = payload('wamid.PALSU', 'halo');

    const res = await fetch(`${basis}/webhook`, { method: 'POST', headers: { 'x-hub-signature-256': 'sha256=' + '0'.repeat(64) }, body });

    expect(res.status).toBe(401);
    expect(handleMessage).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('melayani verifikasi GET dari Meta', async () => {
    const { basis } = await jalankan({ handleMessage: async () => ({ body: 'x' }), fetchImpl: vi.fn() });

    const res = await fetch(`${basis}/webhook?hub.mode=subscribe&hub.verify_token=${config.wa.verifyToken}&hub.challenge=987654`);

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('987654');
  });
});
