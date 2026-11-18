import { describe, expect, it, vi } from 'vitest';
import { WaClientError, createWaClient } from '../../src/wa/client.js';

const TOKEN = 'EAAB-token-akses-uji';
const opsi = { accessToken: TOKEN, phoneNumberId: '123456789012345', apiVersion: 'v25.0' };

function jsonRespons(status, isi) {
  return new Response(JSON.stringify(isi), { status, headers: { 'content-type': 'application/json' } });
}

async function tangkap(janji) {
  try {
    await janji;
  } catch (err) {
    return err;
  }
  throw new Error('seharusnya melempar error');
}

describe('createWaClient.sendText', () => {
  it('mengirim permintaan sesuai format Cloud API dan mengembalikan id pesan', async () => {
    const fetchImpl = vi.fn(async () => jsonRespons(200, { messages: [{ id: 'wamid.balasan' }] }));
    const klien = createWaClient({ ...opsi, fetchImpl });

    const hasil = await klien.sendText('6281234567890', 'Halo\nDunia');

    expect(hasil).toEqual({ messageId: 'wamid.balasan' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://graph.facebook.com/v25.0/123456789012345/messages');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '6281234567890',
      type: 'text',
      text: { preview_url: false, body: 'Halo\nDunia' },
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('mengembalikan messageId null bila respons sukses tidak memuat id', async () => {
    const klien = createWaClient({ ...opsi, fetchImpl: async () => jsonRespons(200, {}) });

    expect(await klien.sendText('6281234567890', 'halo')).toEqual({ messageId: null });
  });

  it.each([
    ['nomor memuat huruf', '62abc', 'halo', 'NOMOR_TIDAK_VALID'],
    ['nomor terlalu pendek', '123', 'halo', 'NOMOR_TIDAK_VALID'],
    ['nomor berformat plus', '+6281234567890', 'halo', 'NOMOR_TIDAK_VALID'],
    ['nomor bukan string', 6281234567890, 'halo', 'NOMOR_TIDAK_VALID'],
    ['body kosong', '6281234567890', '', 'BODY_KOSONG'],
    ['body hanya spasi', '6281234567890', '  \n ', 'BODY_KOSONG'],
    ['body bukan string', '6281234567890', null, 'BODY_KOSONG'],
    ['body lebih dari 4096 karakter', '6281234567890', 'a'.repeat(4097), 'BODY_TERLALU_PANJANG'],
  ])('menolak %s tanpa memanggil jaringan', async (_label, to, body, kode) => {
    const fetchImpl = vi.fn();
    const err = await tangkap(createWaClient({ ...opsi, fetchImpl }).sendText(to, body));

    expect(err).toBeInstanceOf(WaClientError);
    expect(err.code).toBe(kode);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('menghitung batas 4096 per karakter, bukan per unit UTF-16', async () => {
    const fetchImpl = vi.fn(async () => jsonRespons(200, { messages: [{ id: 'x' }] }));
    const klien = createWaClient({ ...opsi, fetchImpl });

    await klien.sendText('6281234567890', '😀'.repeat(4096));
    const err = await tangkap(klien.sendText('6281234567890', '😀'.repeat(4097)));

    expect(err.code).toBe('BODY_TERLALU_PANJANG');
  });

  it('menerjemahkan penolakan Cloud API menjadi WaClientError tanpa membocorkan nomor atau token', async () => {
    const fetchImpl = async () =>
      jsonRespons(400, {
        error: { message: '(#131030) Recipient 6281234567890 not in allowed list', type: 'OAuthException', code: 131030, error_subcode: 2655007, fbtrace_id: 'AbC123' },
      });
    const err = await tangkap(createWaClient({ ...opsi, fetchImpl }).sendText('6281234567890', 'halo'));

    expect(err).toBeInstanceOf(WaClientError);
    expect(err).toMatchObject({ status: 400, code: 131030, subkode: 2655007, fbtraceId: 'AbC123' });
    expect(err.message).toContain('HTTP 400');
    expect(err.message).not.toContain('6281234567890');
    expect(err.message).not.toContain(TOKEN);
  });

  it('tetap menghasilkan WaClientError bila respons gagal bukan JSON', async () => {
    const fetchImpl = async () => new Response('<html>Bad Gateway</html>', { status: 502 });
    const err = await tangkap(createWaClient({ ...opsi, fetchImpl }).sendText('6281234567890', 'halo'));

    expect(err).toBeInstanceOf(WaClientError);
    expect(err.status).toBe(502);
  });

  it('memotong pesan error dari Meta yang terlalu panjang', async () => {
    const fetchImpl = async () => jsonRespons(500, { error: { message: 'x'.repeat(2000) } });
    const err = await tangkap(createWaClient({ ...opsi, fetchImpl }).sendText('6281234567890', 'halo'));

    expect(err.message.length).toBeLessThan(300);
  });

  it('menandai kegagalan jaringan dan menyimpan penyebabnya', async () => {
    const sebab = new TypeError('fetch failed');
    const err = await tangkap(createWaClient({ ...opsi, fetchImpl: async () => { throw sebab; } }).sendText('6281234567890', 'halo'));

    expect(err).toMatchObject({ name: 'WaClientError', code: 'JARINGAN' });
    expect(err.cause).toBe(sebab);
  });

  it('menandai timeout dengan kode TIMEOUT', async () => {
    const fetchImpl = (_url, { signal }) =>
      new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason)));
    const err = await tangkap(createWaClient({ ...opsi, fetchImpl, timeoutMs: 20 }).sendText('6281234567890', 'halo'));

    expect(err.code).toBe('TIMEOUT');
  });
});
