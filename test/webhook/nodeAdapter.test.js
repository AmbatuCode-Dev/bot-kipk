import { createServer } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNodeListener } from '../../src/webhook/nodeAdapter.js';

const server = [];

async function jalankan(rute, opsi = {}) {
  const logger = { error: vi.fn() };
  const instance = createServer(createNodeListener({ rute: new Map(Object.entries(rute)), logger, ...opsi }));
  await new Promise((selesai) => instance.listen(0, '127.0.0.1', selesai));
  server.push(instance);
  return { logger, basis: `http://127.0.0.1:${instance.address().port}` };
}

afterEach(async () => {
  await Promise.all(server.splice(0).map((s) => new Promise((selesai) => { s.closeAllConnections(); s.close(selesai); })));
});

describe('createNodeListener', () => {
  it('meneruskan metode, path, query, header, dan byte body apa adanya ke handler', async () => {
    const diterima = {};
    const { basis } = await jalankan({
      '/webhook': async (request) => {
        diterima.metode = request.method;
        const url = new URL(request.url);
        diterima.path = url.pathname;
        diterima.query = url.searchParams.get('a');
        diterima.header = request.headers.get('x-hub-signature-256');
        diterima.heks = Buffer.from(await request.arrayBuffer()).toString('hex');
        return new Response('selesai', { status: 201, headers: { 'X-Uji': 'ya' } });
      },
    });
    const body = Buffer.from('{"teks":"caf\\u00e9"} é 😀', 'utf8');

    const res = await fetch(`${basis}/webhook?a=1`, { method: 'POST', headers: { 'x-hub-signature-256': 'sha256=abc' }, body });

    expect(res.status).toBe(201);
    expect(res.headers.get('x-uji')).toBe('ya');
    expect(await res.text()).toBe('selesai');
    expect(diterima).toEqual({ metode: 'POST', path: '/webhook', query: '1', header: 'sha256=abc', heks: body.toString('hex') });
  });

  it('melayani GET tanpa body', async () => {
    const { basis } = await jalankan({ '/healthz': async () => new Response('{"status":"ok"}', { headers: { 'Content-Type': 'application/json' } }) });
    const res = await fetch(`${basis}/healthz`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it.each(['/', '/tidak-ada', '/webhook/lain', '/__proto__', '/constructor'])('membalas 404 untuk path %s', async (path) => {
    const { basis } = await jalankan({ '/webhook': async () => new Response('x') });

    expect((await fetch(`${basis}${path}`)).status).toBe(404);
  });

  it('menolak body yang melebihi batas dengan 413 tanpa memanggil handler', async () => {
    const handler = vi.fn(async () => new Response('x'));
    const { basis } = await jalankan({ '/webhook': handler }, { batasBodyByte: 64 });

    const res = await fetch(`${basis}/webhook`, { method: 'POST', body: 'x'.repeat(65) });

    expect(res.status).toBe(413);
    expect(handler).not.toHaveBeenCalled();
  });

  it('menerima body tepat di batas', async () => {
    const { basis } = await jalankan({ '/webhook': async (r) => new Response(String((await r.arrayBuffer()).byteLength)) }, { batasBodyByte: 64 });

    expect(await (await fetch(`${basis}/webhook`, { method: 'POST', body: 'x'.repeat(64) })).text()).toBe('64');
  });

  it('membalas 500 tanpa membocorkan detail error dan mencatatnya', async () => {
    const { basis, logger } = await jalankan({ '/webhook': async () => { throw new Error('rahasia internal'); } });

    const res = await fetch(`${basis}/webhook`);

    expect(res.status).toBe(500);
    expect(await res.text()).toBe('Internal Server Error');
    expect(logger.error).toHaveBeenCalledWith('listener_gagal', expect.objectContaining({ pesanError: 'rahasia internal' }));
  });
});
