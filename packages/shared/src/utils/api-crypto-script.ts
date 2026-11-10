/**
 * 接口加密协议 v1 的纯 JavaScript 实现，供浏览器不提供 WebCrypto 的场合使用（非 HTTPS、且不是 localhost）。
 * 只在后端允许非 HTTPS（requireHttps 为 false）时由 api-crypto.ts 按需加载，HTTPS 下不会下载本模块。
 *
 * - AES-256-GCM 与 SHA-256 使用 @noble/ciphers、@noble/hashes（MIT）；
 * - RSA-OAEP 只需要公钥加密：按 RFC 8017 第 7.1.1 节实现 OAEP 编码（SHA-256、MGF1-SHA-256、空标签），
 *   再用 BigInt 做模幂运算。公钥运算不涉及私钥，不存在需要防护的计时侧信道。
 *
 * 非 HTTPS 页面本身可能被篡改，这种方式只能防止被动窃听，不能防止中间人。
 */
import type { ApiCryptoEngine, Bytes } from './api-crypto';

import { gcm } from '@noble/ciphers/aes.js';
import { sha256 } from '@noble/hashes/sha2.js';

const HASH_LENGTH = 32;

/**
 * rsaEncryption 的算法标识 1.2.840.113549.1.1.1 的 DER 编码（2A 86 48 86 F7 0D 01 01 01）。
 * 含字母的十六进制字面量会被格式化与 lint 规则来回改写，这里和下面的掩码都写成十进制
 */
const RSA_ENCRYPTION_OID = [42, 134, 72, 134, 247, 13, 1, 1, 1];

interface RsaPublicKey {
  exponent: bigint;
  modulus: bigint;
  /** 模数的字节长度 */
  size: number;
}

interface DerElement {
  /** 内容之后的位置 */
  end: number;
  /** 内容的起始位置 */
  start: number;
  tag: number;
}

function readDer(
  bytes: Uint8Array,
  offset: number,
  expectedTag: number,
): DerElement {
  const tag = bytes[offset];
  if (tag !== expectedTag) {
    throw new Error('接口加密公钥格式不正确');
  }
  let length = bytes[offset + 1] ?? 0;
  let start = offset + 2;
  if (length & 128) {
    const count = length & 127;
    if (count === 0 || count > 4) {
      throw new Error('接口加密公钥格式不正确');
    }
    length = 0;
    for (let i = 0; i < count; i++) {
      length = length * 256 + (bytes[start + i] ?? 0);
    }
    start += count;
  }
  const end = start + length;
  if (end > bytes.length) {
    throw new Error('接口加密公钥格式不正确');
  }
  return { end, start, tag };
}

function toBigInt(bytes: Uint8Array): bigint {
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }
  return value;
}

/**
 * 解析 SubjectPublicKeyInfo（DER）中的 RSA 公钥：
 * SEQUENCE { SEQUENCE { OID rsaEncryption, NULL }, BIT STRING { SEQUENCE { INTEGER n, INTEGER e } } }
 */
export function parseRsaPublicKey(spki: Uint8Array): RsaPublicKey {
  const outer = readDer(spki, 0, 0x30);
  const algorithm = readDer(spki, outer.start, 0x30);
  const oid = readDer(spki, algorithm.start, 0x06);
  const oidBytes = spki.subarray(oid.start, oid.end);
  if (
    oidBytes.length !== RSA_ENCRYPTION_OID.length ||
    oidBytes.some((byte, i) => byte !== RSA_ENCRYPTION_OID[i])
  ) {
    throw new Error('接口加密公钥不是 RSA 公钥');
  }
  const bitString = readDer(spki, algorithm.end, 0x03);
  // BIT STRING 内容的第一个字节是未使用的位数，必须为 0
  if (spki[bitString.start] !== 0) {
    throw new Error('接口加密公钥格式不正确');
  }
  const key = readDer(spki, bitString.start + 1, 0x30);
  const n = readDer(spki, key.start, 0x02);
  const e = readDer(spki, n.end, 0x02);
  const modulus = toBigInt(spki.subarray(n.start, n.end));
  const exponent = toBigInt(spki.subarray(e.start, e.end));
  const size = Math.ceil(modulus.toString(16).length / 2);
  if (size < 256 || exponent < 3n) {
    throw new Error('接口加密公钥强度不足');
  }
  return { exponent, modulus, size };
}

function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = 1n;
  let b = base % modulus;
  let e = exponent;
  while (e > 0n) {
    if (e & 1n) {
      result = (result * b) % modulus;
    }
    b = (b * b) % modulus;
    e >>= 1n;
  }
  return result;
}

/** 大整数按大端写成定长字节（RFC 8017 的 I2OSP） */
function toFixedBytes(value: bigint, length: number): Bytes {
  const bytes = new Uint8Array(length);
  let v = value;
  for (let i = length - 1; i >= 0; i--) {
    bytes[i] = Number(v & 255n);
    v >>= 8n;
  }
  if (v !== 0n) {
    throw new Error('RSA 运算结果超出长度');
  }
  return bytes;
}

/** MGF1（SHA-256） */
function mgf1(seed: Uint8Array, length: number): Uint8Array {
  const mask = new Uint8Array(length);
  const input = new Uint8Array(seed.length + 4);
  input.set(seed);
  for (let counter = 0, offset = 0; offset < length; counter++) {
    input[seed.length] = (counter >>> 24) & 255;
    input[seed.length + 1] = (counter >>> 16) & 255;
    input[seed.length + 2] = (counter >>> 8) & 255;
    input[seed.length + 3] = counter & 255;
    const digest = sha256(input);
    mask.set(
      digest.subarray(0, Math.min(HASH_LENGTH, length - offset)),
      offset,
    );
    offset += HASH_LENGTH;
  }
  return mask;
}

/**
 * RSAES-OAEP 加密（SHA-256、MGF1-SHA-256、空标签），与 WebCrypto 的 { name: 'RSA-OAEP', hash: 'SHA-256' } 相同。
 * seed 只在测试中指定
 */
export function rsaOaepEncrypt(
  spki: Uint8Array,
  message: Uint8Array,
  seed: Uint8Array = globalThis.crypto.getRandomValues(
    new Uint8Array(HASH_LENGTH),
  ),
): Bytes {
  const key = parseRsaPublicKey(spki);
  const k = key.size;
  if (message.length > k - 2 * HASH_LENGTH - 2) {
    throw new Error('RSA-OAEP 加密的内容过长');
  }
  if (seed.length !== HASH_LENGTH) {
    throw new Error('RSA-OAEP 的种子长度不正确');
  }
  // DB = lHash || PS（全 0）|| 0x01 || M
  const db = new Uint8Array(k - HASH_LENGTH - 1);
  db.set(sha256(new Uint8Array(0)));
  db[db.length - message.length - 1] = 0x01;
  db.set(message, db.length - message.length);

  const dbMask = mgf1(seed, db.length);
  const maskedDb = db.map((byte, i) => byte ^ (dbMask[i] ?? 0));
  const seedMask = mgf1(maskedDb, HASH_LENGTH);
  const maskedSeed = seed.map((byte, i) => byte ^ (seedMask[i] ?? 0));

  // EM = 0x00 || maskedSeed || maskedDB
  const em = new Uint8Array(k);
  em.set(maskedSeed, 1);
  em.set(maskedDb, 1 + HASH_LENGTH);
  return toFixedBytes(modPow(toBigInt(em), key.exponent, key.modulus), k);
}

/** 纯 JavaScript 的加密引擎 */
export const scriptCryptoEngine: ApiCryptoEngine = {
  async aesGcmDecrypt(key, iv, aad, data) {
    // 认证标签不对时 noble 抛出异常，由调用方转换为统一的提示
    return Uint8Array.from(gcm(key, iv, aad).decrypt(data));
  },
  async aesGcmEncrypt(key, iv, aad, plain) {
    return Uint8Array.from(gcm(key, iv, aad).encrypt(plain));
  },
  async rsaOaepEncrypt(spki, plain) {
    return rsaOaepEncrypt(spki, plain);
  },
};
