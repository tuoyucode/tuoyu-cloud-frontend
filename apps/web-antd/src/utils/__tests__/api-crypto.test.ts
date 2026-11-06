import { webcrypto } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  decryptResponse,
  encryptRequest,
  fromBase64,
  resolveSubtle,
  RESPONSE_DECRYPT_FAILED,
  toBase64,
} from '../api-crypto';
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

describe('接口加密协议 v1', () => {
  it('给定密钥与随机数时，请求密文与测试向量完全一致', async () => {
    const result = await encryptRequest(
      subtle,
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
    const result = await encryptRequest(subtle, key, { password: 'x' });

    expect(toBase64(await unwrapAesKey(result.envelope.key))).toBe(
      toBase64(result.aesKey),
    );
    expect(await unwrapAesKey(envelope.key)).toEqual(
      fromBase64(request.aesKey),
    );
  });

  it('每次加密的 AES 密钥、iv 与 nonce 都不同', async () => {
    const first = await encryptRequest(subtle, key, {});
    const second = await encryptRequest(subtle, key, {});

    expect(first.envelope.iv).not.toBe(second.envelope.iv);
    expect(first.nonce).not.toBe(second.nonce);
    expect(toBase64(first.aesKey)).not.toBe(toBase64(second.aesKey));
  });

  it('解密测试向量中的响应', async () => {
    const plain = await decryptResponse(
      subtle,
      vectors.response.envelope,
      fromBase64(request.aesKey),
      envelope.nonce,
    );

    expect(plain).toBe(vectors.response.plaintext);
  });

  it('nonce 不对时响应解密失败', async () => {
    await expect(
      decryptResponse(
        subtle,
        vectors.response.envelope,
        fromBase64(request.aesKey),
        toBase64(new Uint8Array(16)),
      ),
    ).rejects.toThrow(RESPONSE_DECRYPT_FAILED);
  });

  it('非安全上下文中不使用 WebCrypto，并给出可展示的提示', () => {
    const original = globalThis.isSecureContext;
    Object.defineProperty(globalThis, 'isSecureContext', {
      configurable: true,
      value: false,
    });
    try {
      expect(() => resolveSubtle(key)).toThrow('HTTPS');
      expect(() => resolveSubtle({ ...key, requireHttps: false })).toThrow(
        'HTTPS',
      );
    } finally {
      Object.defineProperty(globalThis, 'isSecureContext', {
        configurable: true,
        value: original,
      });
    }
  });
});
