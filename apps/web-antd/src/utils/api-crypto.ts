/**
 * 接口加密协议 v1（RSA-OAEP-256 + AES-256-GCM）的浏览器端实现。
 * 协议以后端仓库 docs/adr/0001-接口加密.md 为准；前端不保存任何密钥，公钥运行时从后端获取。
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

/**
 * 取得可用的 WebCrypto。只有 HTTPS 或 localhost（安全上下文）下浏览器才提供。
 * 后端允许非 HTTPS（requireHttps 为 false）时，按协议应改用 JavaScript 加密库，目前尚未接入。
 */
export function resolveSubtle(key: ApiCryptoPublicKey): SubtleCrypto {
  const subtle = globalThis.isSecureContext
    ? globalThis.crypto?.subtle
    : undefined;
  if (subtle) {
    return subtle;
  }
  if (key.requireHttps === false) {
    throw new ApiCryptoUnavailableError(
      '当前不是 HTTPS 访问，非 HTTPS 下的加密方式尚未接入，请使用 HTTPS 访问',
    );
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

function importAesKey(subtle: SubtleCrypto, raw: Bytes) {
  return subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/**
 * 加密请求体
 */
export async function encryptRequest(
  subtle: SubtleCrypto,
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

  const publicKey = await subtle.importKey(
    'spki',
    fromBase64(key.publicKey),
    { hash: 'SHA-256', name: 'RSA-OAEP' },
    false,
    ['encrypt'],
  );
  const wrappedKey = await subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    aesKey,
  );
  const data = await subtle.encrypt(
    {
      additionalData: requestAad(key.kid, ts, nonce),
      iv,
      name: 'AES-GCM',
      tagLength: 128,
    },
    await importAesKey(subtle, aesKey),
    encoder.encode(JSON.stringify(body)),
  );
  return {
    aesKey,
    envelope: {
      data: toBase64(new Uint8Array(data)),
      iv: toBase64(iv),
      key: toBase64(new Uint8Array(wrappedKey)),
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
  subtle: SubtleCrypto,
  envelope: ApiCryptoResponseEnvelope,
  aesKey: Bytes,
  nonce: string,
): Promise<string> {
  if (envelope?.v !== VERSION) {
    throw new Error('不支持的接口加密协议版本');
  }
  let plain: ArrayBuffer;
  try {
    plain = await subtle.decrypt(
      {
        additionalData: responseAad(nonce),
        iv: fromBase64(envelope.iv),
        name: 'AES-GCM',
        tagLength: 128,
      },
      await importAesKey(subtle, aesKey),
      fromBase64(envelope.data),
    );
  } catch {
    // 认证标签不对（内容被改动，或密钥、nonce 不匹配）时 WebCrypto 只给出笼统的错误
    throw new Error(RESPONSE_DECRYPT_FAILED);
  }
  return decoder.decode(plain);
}
