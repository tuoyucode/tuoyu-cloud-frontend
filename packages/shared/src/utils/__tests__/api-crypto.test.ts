import type { ApiCryptoEngine } from '../api-crypto';

import { webcrypto } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  ApiCryptoUnavailableError,
  decryptResponse,
  encryptRequest,
  fromBase64,
  resolveCryptoEngine,
  RESPONSE_DECRYPT_FAILED,
  toBase64,
  webCryptoEngine,
} from '../api-crypto';
import {
  parseRsaPublicKey,
  rsaOaepEncrypt,
  scriptCryptoEngine,
} from '../api-crypto-script';
// 复制自后端仓库 tuoyu-framework/tuoyu-common-encrypt/src/test/resources/api-crypto/test-vectors.json，两边须保持一致
import vectors from './api-crypto-vectors.json';

const subtle = webcrypto.subtle as unknown as SubtleCrypto;
const key = {
  enabled: true,
  kid: vectors.kid,
  publicKey: vectors.publicKey,
  requireHttps: true,
};
const request = vectors.request;
const envelope = request.envelope;

/** 用后端的测试私钥（WebCrypto，独立于被测实现）解开包装的 AES 密钥 */
async function unwrapAesKey(wrapped: string) {
  const privateKey = await subtle.importKey(
    'pkcs8',
    fromBase64(vectors.privateKey),
    { hash: 'SHA-256', name: 'RSA-OAEP' },
    false,
    ['decrypt'],
  );
  return new Uint8Array(
    await subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, fromBase64(wrapped)),
  );
}

async function withSecureContext<T>(secure: boolean, run: () => Promise<T>) {
  const original = globalThis.isSecureContext;
  Object.defineProperty(globalThis, 'isSecureContext', {
    configurable: true,
    value: secure,
  });
  try {
    return await run();
  } finally {
    Object.defineProperty(globalThis, 'isSecureContext', {
      configurable: true,
      value: original,
    });
  }
}

const engines: [string, ApiCryptoEngine][] = [
  ['WebCrypto', webCryptoEngine(subtle)],
  ['纯 JavaScript', scriptCryptoEngine],
];

describe.each(engines)('接口加密协议 v1（%s）', (_, engine) => {
  it('给定密钥与随机数时，请求密文与测试向量完全一致', async () => {
    const result = await encryptRequest(
      engine,
      key,
      JSON.parse(request.plaintext),
      {
        aesKey: fromBase64(request.aesKey),
        iv: fromBase64(envelope.iv),
        nonce: fromBase64(envelope.nonce),
        ts: envelope.ts,
      },
    );

    expect(result.envelope.data).toBe(envelope.data);
    expect(result.envelope.kid).toBe(envelope.kid);
    expect(result.envelope.nonce).toBe(envelope.nonce);
    expect(result.envelope.v).toBe(1);
  });

  it('后端私钥能解开用 RSA-OAEP（SHA-256）包装的 AES 密钥', async () => {
    const result = await encryptRequest(engine, key, { password: 'x' });

    expect(toBase64(await unwrapAesKey(result.envelope.key))).toBe(
      toBase64(result.aesKey),
    );
    expect(await unwrapAesKey(envelope.key)).toEqual(
      fromBase64(request.aesKey),
    );
  });

  it('每次加密的 AES 密钥、iv、nonce 与包装结果都不同', async () => {
    const first = await encryptRequest(engine, key, {});
    const second = await encryptRequest(engine, key, {});

    expect(first.envelope.iv).not.toBe(second.envelope.iv);
    expect(first.nonce).not.toBe(second.nonce);
    expect(toBase64(first.aesKey)).not.toBe(toBase64(second.aesKey));
    expect(first.envelope.key).not.toBe(second.envelope.key);
  });

  it('解密测试向量中的响应', async () => {
    const plain = await decryptResponse(
      engine,
      vectors.response.envelope,
      fromBase64(request.aesKey),
      envelope.nonce,
    );

    expect(plain).toBe(vectors.response.plaintext);
  });

  it('nonce 不对时响应解密失败', async () => {
    await expect(
      decryptResponse(
        engine,
        vectors.response.envelope,
        fromBase64(request.aesKey),
        toBase64(new Uint8Array(16)),
      ),
    ).rejects.toThrow(RESPONSE_DECRYPT_FAILED);
  });

  it('密文被改动时响应解密失败', async () => {
    const data = fromBase64(vectors.response.envelope.data);
    data[0] = (data[0] ?? 0) ^ 0x01;

    await expect(
      decryptResponse(
        engine,
        { ...vectors.response.envelope, data: toBase64(data) },
        fromBase64(request.aesKey),
        envelope.nonce,
      ),
    ).rejects.toThrow(RESPONSE_DECRYPT_FAILED);
  });
});

describe('纯 JavaScript 的 RSA-OAEP', () => {
  it('同一个种子得到同样的密文，后端私钥能解开', async () => {
    const message = fromBase64(request.aesKey);
    const seed = new Uint8Array(32).fill(7);
    const spki = fromBase64(vectors.publicKey);

    const first = rsaOaepEncrypt(spki, message, seed);
    const second = rsaOaepEncrypt(spki, message, seed);

    expect(toBase64(first)).toBe(toBase64(second));
    expect(first.length).toBe(parseRsaPublicKey(spki).size);
    expect(await unwrapAesKey(toBase64(first))).toEqual(message);
  });

  it('拒绝超过 OAEP 上限的内容', () => {
    const spki = fromBase64(vectors.publicKey);
    const size = parseRsaPublicKey(spki).size;

    expect(() =>
      rsaOaepEncrypt(spki, new Uint8Array(size - 2 * 32 - 1)),
    ).toThrow('过长');
  });

  it('拒绝不是 RSA 的公钥与过短的 RSA 公钥', async () => {
    const ec = await subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify'],
    );
    const ecSpki = new Uint8Array(await subtle.exportKey('spki', ec.publicKey));
    expect(() => parseRsaPublicKey(ecSpki)).toThrow('不是 RSA');

    const weak = await subtle.generateKey(
      {
        hash: 'SHA-256',
        modulusLength: 1024,
        name: 'RSA-OAEP',
        publicExponent: new Uint8Array([1, 0, 1]),
      },
      true,
      ['encrypt', 'decrypt'],
    );
    const weakSpki = new Uint8Array(
      await subtle.exportKey('spki', weak.publicKey),
    );
    expect(() => parseRsaPublicKey(weakSpki)).toThrow('强度不足');
  });
});

describe('选择加密引擎', () => {
  it('安全上下文中使用 WebCrypto', async () => {
    const engine = await withSecureContext(true, () =>
      resolveCryptoEngine({ ...key, requireHttps: false }),
    );

    expect(engine).not.toBe(scriptCryptoEngine);
  });

  it('非安全上下文且后端要求 HTTPS 时拒绝，并给出可展示的提示', async () => {
    await withSecureContext(false, async () => {
      await expect(resolveCryptoEngine(key)).rejects.toThrow(
        ApiCryptoUnavailableError,
      );
      await expect(resolveCryptoEngine(key)).rejects.toThrow('HTTPS');
    });
  });

  it('非安全上下文且后端允许非 HTTPS 时改用纯 JavaScript 实现', async () => {
    const engine = await withSecureContext(false, () =>
      resolveCryptoEngine({ ...key, requireHttps: false }),
    );

    expect(engine).toBe(scriptCryptoEngine);
  });
});
