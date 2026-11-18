import { describe, expect, it } from 'vitest';
import { createPenjagaDuplikat } from '../../src/webhook/duplikat.js';

describe('createPenjagaDuplikat', () => {
  it('menerima id baru dan menolak id yang sama', () => {
    const penjaga = createPenjagaDuplikat();

    expect(penjaga.tandai('wamid.1')).toBe(true);
    expect(penjaga.tandai('wamid.1')).toBe(false);
    expect(penjaga.tandai('wamid.2')).toBe(true);
  });

  it('melupakan id setelah TTL lewat', () => {
    let sekarang = 1000;
    const penjaga = createPenjagaDuplikat({ ttlMs: 500, now: () => sekarang });

    penjaga.tandai('wamid.1');
    sekarang = 1499;
    expect(penjaga.tandai('wamid.1')).toBe(false);
    sekarang = 1501;
    expect(penjaga.tandai('wamid.1')).toBe(true);
  });

  it('membuang entri tertua saat melebihi batas', () => {
    const penjaga = createPenjagaDuplikat({ maksEntri: 3 });

    ['a', 'b', 'c', 'd'].forEach((id) => penjaga.tandai(id));

    expect(penjaga.tandai('d')).toBe(false);
    expect(penjaga.tandai('a')).toBe(true);
  });
});
