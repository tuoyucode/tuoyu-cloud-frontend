/**
 * 接口加密协议 v1（RSA-OAEP-256 + AES-256-GCM）的浏览器端实现。
 * 协议以后端仓库 tuoyu-common-encrypt 中的 ApiCryptoCodec 与测试向量为准；前端不保存任何密钥，公钥运行时从后端获取。
 *
 * 加密运算由 ApiCryptoEngine 完成：HTTPS 或 localhost（安全上下文）下使用浏览器的 WebCrypto；
 * 非安全上下文中浏览器不提供 WebCrypto，后端允许非 HTTPS（requireHttps 为 false）时按需加载纯 JavaScript 实现
 * （api-crypto-script.ts），否则拒绝加密。
 */

/** 字节数组。WebCrypto 只接受以 ArrayBuffer 为底层的视图 */
export type Bytes = Uint8Array<ArrayBuffer>;

/** 后端 /auth/crypto/public-key 返回的公钥信息 */
export interface ApiCryptoPublicKey {
  algorithm?: string;
  enabled: boolean;
  kid?: string;
  publicKey?: string;
  replayWindowSeconds?: number;
  requireHttps?: boolean;
  version?: number;
}

/** 加密请求的信封 */
export interface ApiCryptoEnvelope {
  data: string;
  iv: string;
  key: string;
  kid: string;
  nonce: string;
  ts: number;
  v: number;
}

/** 加密响应的信封 */
export interface ApiCryptoResponseEnvelope {
  data: string;
  iv: string;
  v: number;
}

/** 加密运算。两种实现（WebCrypto 与纯 JavaScript）对同样的输入给出同样的结果 */
export interface ApiCryptoEngine {
  /** AES-256-GCM 解密（data 为密文加 16 字节认证标签），认证失败时抛出 */
  aesGcmDecrypt(key: Bytes, iv: Bytes, aad: Bytes, data: Bytes): Promise<Bytes>;
  /** AES-256-GCM 加密，返回密文加 16 字节认证标签 */
  aesGcmEncrypt(
    key: Bytes,
    iv: Bytes,
    aad: Bytes,
    plain: Bytes,
  ): Promise<Bytes>;
  /** RSA-OAEP（SHA-256、MGF1-SHA-256、空标签），公钥为 SubjectPublicKeyInfo（DER） */
  rsaOaepEncrypt(spki: Bytes, plain: Bytes): Promise<Bytes>;
}

/** 一次加密请求的结果：信封，以及解密响应时需要的密钥和 nonce */
export interface EncryptedRequest {
  aesKey: Bytes;
  envelope: ApiCryptoEnvelope;
  nonce: string;
}

/** 可以指定的随机量，只在测试中使用 */
export interface EncryptOptions {
  aesKey?: Bytes;
  iv?: Bytes;
  nonce?: Bytes;
  ts?: number;
}

/** 标记请求或响应已加密的请求头 */
export const API_CRYPTO_HEADER = 'X-Tuoyu-Encrypted';

const VERSION = 1;
const REQUEST_AAD_PREFIX = 'tuoyu-api-crypto/v1/request|';
const RESPONSE_AAD_PREFIX = 'tuoyu-api-crypto/v1/response|';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** 响应解密失败时的提示 */
export const RESPONSE_DECRYPT_FAILED = '响应解密失败，请刷新页面后重试';

/** 浏览器不能安全加密时抛出，message 可直接展示给用户 */
export class ApiCryptoUnavailableError extends Error {}

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCodePoint(byte);
  }
  return btoa(binary);
}

export function fromBase64(text: string): Bytes {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.codePointAt(i) ?? 0;
  }
  return bytes;
}

function randomBytes(length: number): Bytes {
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

/** 基于浏览器 WebCrypto 的加密引擎 */
export function webCryptoEngine(subtle: SubtleCrypto): ApiCryptoEngine {
  const importAesKey = (raw: Bytes) =>
    subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  return {
    async aesGcmDecrypt(key, iv, aad, data) {
      const plain = await subtle.decrypt(
        { additionalData: aad, iv, name: 'AES-GCM', tagLength: 128 },
        await importAesKey(key),
        data,
      );
      return new Uint8Array(plain);
    },
    async aesGcmEncrypt(key, iv, aad, plain) {
      const data = await subtle.encrypt(
        { additionalData: aad, iv, name: 'AES-GCM', tagLength: 128 },
        await importAesKey(key),
        plain,
      );
      return new Uint8Array(data);
    },
    async rsaOaepEncrypt(spki, plain) {
      const publicKey = await subtle.importKey(
        'spki',
        spki,
        { hash: 'SHA-256', name: 'RSA-OAEP' },
        false,
        ['encrypt'],
      );
      return new Uint8Array(
        await subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, plain),
      );
    },
  };
}

/**
 * 选择加密引擎：安全上下文中用 WebCrypto；否则只有后端允许非 HTTPS 时才加载纯 JavaScript 实现
 * （只能防止被动窃听），不允许时抛出可直接展示的 ApiCryptoUnavailableError
 */
export async function resolveCryptoEngine(
  key: ApiCryptoPublicKey,
): Promise<ApiCryptoEngine> {
  const subtle = globalThis.isSecureContext
    ? globalThis.crypto?.subtle
    : undefined;
  if (subtle) {
    return webCryptoEngine(subtle);
  }
  if (key.requireHttps === false) {
    const { scriptCryptoEngine } = await import('./api-crypto-script');
    return scriptCryptoEngine;
  }
  throw new ApiCryptoUnavailableError(
    '当前不是 HTTPS 访问，无法安全传输密码，请联系管理员配置 HTTPS',
  );
}

function requestAad(kid: string, ts: number, nonce: string) {
  return encoder.encode(`${REQUEST_AAD_PREFIX}${kid}|${ts}|${nonce}`);
}

function responseAad(nonce: string) {
  return encoder.encode(`${RESPONSE_AAD_PREFIX}${nonce}`);
}

/**
 * 加密请求体
 */
export async function encryptRequest(
  engine: ApiCryptoEngine,
  key: ApiCryptoPublicKey,
  body: unknown,
  options: EncryptOptions = {},
): Promise<EncryptedRequest> {
  if (!key.kid || !key.publicKey) {
    throw new Error('接口加密公钥信息不完整');
  }
  const aesKey = options.aesKey ?? randomBytes(32);
  const iv = options.iv ?? randomBytes(12);
  const nonce = toBase64(options.nonce ?? randomBytes(16));
  const ts = options.ts ?? Date.now();

  const wrappedKey = await engine.rsaOaepEncrypt(
    fromBase64(key.publicKey),
    aesKey,
  );
  const data = await engine.aesGcmEncrypt(
    aesKey,
    iv,
    requestAad(key.kid, ts, nonce),
    encoder.encode(JSON.stringify(body)),
  );
  return {
    aesKey,
    envelope: {
      data: toBase64(data),
      iv: toBase64(iv),
      key: toBase64(wrappedKey),
      kid: key.kid,
      nonce,
      ts,
      v: VERSION,
    },
    nonce,
  };
}

/**
 * 解密响应，返回原始 JSON 文本
 */
export async function decryptResponse(
  engine: ApiCryptoEngine,
  envelope: ApiCryptoResponseEnvelope,
  aesKey: Bytes,
  nonce: string,
): Promise<string> {
  if (envelope?.v !== VERSION) {
    throw new Error('不支持的接口加密协议版本');
  }
  let plain: Bytes;
  try {
    plain = await engine.aesGcmDecrypt(
      aesKey,
      fromBase64(envelope.iv),
      responseAad(nonce),
      fromBase64(envelope.data),
    );
  } catch {
    // 认证标签不对（内容被改动，或密钥、nonce 不匹配）时两种实现都只给出笼统的错误
    throw new Error(RESPONSE_DECRYPT_FAILED);
  }
  return decoder.decode(plain);
}
