import { ringkasError } from '../logger.js';

const BATAS_BODY_BYTE_BAWAAN = 1024 * 1024;
const HEADER_TEKS = { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

class BodyTerlaluBesar extends Error {}

async function bacaBody(req, batas) {
  const potongan = [];
  let total = 0;
  for await (const bagian of req) {
    total += bagian.length;
    if (total > batas) throw new BodyTerlaluBesar();
    potongan.push(bagian);
  }
  return Buffer.concat(potongan);
}

function keRequest(req, url, body) {
  const headers = new Headers();
  for (const [nama, nilai] of Object.entries(req.headers)) {
    if (Array.isArray(nilai)) nilai.forEach((n) => headers.append(nama, n));
    else if (nilai !== undefined) headers.set(nama, nilai);
  }
  const method = req.method ?? 'GET';
  return new Request(url, { method, headers, body: method === 'GET' || method === 'HEAD' ? undefined : body });
}

async function kirim(res, respons) {
  const isi = Buffer.from(await respons.arrayBuffer());
  res.writeHead(respons.status, { ...Object.fromEntries(respons.headers), 'Content-Length': isi.length });
  res.end(isi);
}

/**
 * Menjembatani server node:http ke handler berbasis Request dan Response.
 * Body dibaca sebagai byte mentah dengan batas ukuran, sehingga verifikasi
 * signature HMAC di handler memakai data yang persis sama dengan kiriman Meta.
 *
 * @param {object} opsi
 * @param {Map<string, (request: Request) => Promise<Response>>} opsi.rute peta path persis ke handler
 * @param {{ error: Function }} opsi.logger
 * @param {number} [opsi.batasBodyByte]
 * @returns {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => Promise<void>}
 */
export function createNodeListener({ rute, logger, batasBodyByte = BATAS_BODY_BYTE_BAWAAN }) {
  return async function listener(req, res) {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const handler = rute.get(url.pathname);
      if (!handler) {
        await kirim(res, new Response('Not Found', { status: 404, headers: HEADER_TEKS }));
        return;
      }

      const bisaPunyaBody = req.method !== 'GET' && req.method !== 'HEAD';
      const body = bisaPunyaBody ? await bacaBody(req, batasBodyByte) : Buffer.alloc(0);
      await kirim(res, await handler(keRequest(req, url, body)));
    } catch (err) {
      if (res.destroyed || res.headersSent) return;
      if (err instanceof BodyTerlaluBesar) {
        res.writeHead(413, { ...HEADER_TEKS, Connection: 'close' });
        res.end('Payload Too Large');
        return;
      }
      logger.error('listener_gagal', ringkasError(err));
      res.writeHead(500, HEADER_TEKS);
      res.end('Internal Server Error');
    }
  };
}
