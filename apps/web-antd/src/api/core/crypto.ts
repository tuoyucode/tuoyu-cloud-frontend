import type { ApiCryptoPublicKey } from '#/utils/api-crypto';
import type { ApiResult } from '#/utils/api-result';

import { baseRequestClient } from '#/api/request';
import { isSuccess } from '#/utils/api-result';

/** 公钥缓存时间。后端轮换密钥后，旧公钥最晚在这个时间后失效 */
const CACHE_MILLIS = 10 * 60 * 1000;

let cached: null | { expiresAt: number; value: ApiCryptoPublicKey } = null;

/**
 * 获取接口加密的公钥（无需登录），带缓存
 */
export async function getApiCryptoPublicKey(): Promise<ApiCryptoPublicKey> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  // baseRequestClient 返回完整响应，data 才是后端的 ApiResult
  const response = await baseRequestClient.get<{
    data: ApiResult<ApiCryptoPublicKey>;
  }>('/auth/crypto/public-key');
  const body = response.data;
  if (!isSuccess(body) || !body.data) {
    throw new Error(body?.message || '获取接口加密公钥失败');
  }
  cached = { expiresAt: Date.now() + CACHE_MILLIS, value: body.data };
  return body.data;
}

/**
 * 清除公钥缓存。收到“请求解密失败”时调用，下次请求会重新获取（可能遇到了密钥轮换）
 */
export function clearApiCryptoPublicKey() {
  cached = null;
}
