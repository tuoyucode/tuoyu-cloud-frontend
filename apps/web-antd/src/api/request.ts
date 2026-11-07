/**
 * 请求层：适配后端统一返回结构 ApiResult（code / message / data / traceId），并支持接口加密。
 * 成功为 HTTP 200 + code 0，取 data；失败时 HTTP 状态码表达错误类别，响应体结构相同
 */
import type { RequestClientConfig, RequestClientOptions } from '@vben/request';

import type { Bytes } from '#/utils/api-crypto';

import { h } from 'vue';

import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import {
  authenticateResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from '@vben/request';
import { useAccessStore } from '@vben/stores';
import { downloadFileFromBlobPart } from '@vben/utils';

import { message, Typography } from 'ant-design-vue';

import { $t } from '#/locales';
import { useAuthStore } from '#/store';
import {
  API_CRYPTO_HEADER,
  decryptResponse,
  encryptRequest,
  resolveSubtle,
} from '#/utils/api-crypto';
import { isSuccess, parseBlobBody, requestErrorInfo } from '#/utils/api-result';

import { clearApiCryptoPublicKey, getApiCryptoPublicKey } from './core/crypto';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

/** 后端客户端 ID（sys_client.client_id），登录和每个请求都要带上 */
export const CLIENT_ID: string = import.meta.env.VITE_APP_CLIENT_ID;

/** 后端解密失败时的统一提示，见接口加密协议 */
const DECRYPT_FAILED = '请求解密失败';

/** 请求配置中的标记：出错时不弹出提示（见 silentErrors） */
const SILENT_ERRORS_KEY = 'silentErrors';

/**
 * 请求配置上附带的加密信息，用于解密响应。
 * 用字符串键而不是 Symbol：axios 合并请求配置时只保留字符串键
 */
const CRYPTO_CONTEXT = '__apiCryptoContext';

type CryptoContext = { aesKey: Bytes; nonce: string; subtle: SubtleCrypto };

export function formatToken(token: null | string) {
  return token ? `Bearer ${token}` : null;
}

/** 后端按 zh_CN 的形式解析语言 */
export function contentLanguage() {
  return preferences.app.locale.replace('-', '_');
}

/** 后端没有返回 message 时，按 HTTP 状态码给出的提示（Vben 没有提供的状态） */
function statusMessage(status?: number): string | undefined {
  switch (status) {
    case 413: {
      return $t('request.payloadTooLarge');
    }
    case 429: {
      return $t('request.tooManyRequests');
    }
    case 502:
    case 503:
    case 504: {
      return $t('request.serviceUnavailable');
    }
    default: {
      return undefined;
    }
  }
}

/** 提示中附带 traceId 的时长（秒）：比普通提示长，鼠标悬停时不会关闭，便于复制 */
const TRACE_MESSAGE_DURATION = 8;

/**
 * 显示请求错误：优先用后端的 message。服务端错误（5xx）附上可复制的 traceId，便于对照日志排查；
 * 4xx 的 message 已经说明了原因，不附加
 */
function showRequestError(error: unknown, fallback: string) {
  const info = requestErrorInfo(error);
  const text = info.message ?? statusMessage(info.status) ?? fallback;
  const serverError = info.status === undefined || info.status >= 500;
  if (!info.traceId || !serverError) {
    message.error(text);
    return;
  }
  message.error({
    content: h('span', { class: 'inline-flex flex-col items-start' }, [
      h('span', text),
      h(
        Typography.Text,
        {
          class: 'text-xs',
          copyable: { text: info.traceId },
          type: 'secondary',
        },
        () => $t('request.traceId', { traceId: info.traceId }),
      ),
    ]),
    duration: TRACE_MESSAGE_DURATION,
  });
}

function createRequestClient(baseURL: string, options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL,
  });

  /**
   * 登录失效：清除登录状态，按配置弹出登录框或回到登录页
   */
  async function doReAuthenticate() {
    const accessStore = useAccessStore();
    const authStore = useAuthStore();
    accessStore.setAccessToken(null);
    if (
      preferences.app.loginExpiredMode === 'modal' &&
      accessStore.isAccessChecked
    ) {
      accessStore.setLoginExpired(true);
    } else {
      await authStore.logout();
    }
  }

  // 请求头
  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const accessStore = useAccessStore();
      config.headers.Authorization = formatToken(accessStore.accessToken);
      config.headers.clientid = CLIENT_ID;
      config.headers['Content-Language'] = contentLanguage();
      return config;
    },
  });

  /**
   * 加密响应：用请求时生成的 AES 密钥解密，之后按普通响应处理。
   * 加密接口失败时（例如登录失败）响应体同样是密文，出错时也要解密
   */
  async function decryptIfNeeded(response: any) {
    const context = (response?.config as Record<string, unknown> | undefined)?.[
      CRYPTO_CONTEXT
    ] as CryptoContext | undefined;
    if (
      context &&
      response.headers?.[API_CRYPTO_HEADER.toLowerCase()] === '1'
    ) {
      const plain = await decryptResponse(
        context.subtle,
        response.data,
        context.aesKey,
        context.nonce,
      );
      response.data = JSON.parse(plain);
    }
  }

  client.addResponseInterceptor({
    fulfilled: async (response) => {
      await decryptIfNeeded(response);
      return response;
    },
    rejected: async (error) => {
      const response = error?.response;
      if (response) {
        try {
          await decryptIfNeeded(response);
        } catch {
          // 错误响应无法解密时保留原样，按状态码提示
        }
        // 下载类请求出错时响应体是 Blob，解析成 JSON 以便读取 message
        response.data = await parseBlobBody(response.data);
      }
      throw error;
    },
  });

  // 统一返回结构：code 为 0 时取 data；HTTP 成功但 code 不为 0 时按失败处理
  client.addResponseInterceptor({
    fulfilled: (response) => {
      const { config, data: body } = response;
      if (config.responseReturn === 'raw') {
        return response;
      }
      if (config.responseReturn === 'body') {
        return body;
      }
      if (isSuccess(body)) {
        return body.data;
      }
      throw Object.assign({}, response, { response });
    },
    rejected: (error) => {
      if (requestErrorInfo(error).message === DECRYPT_FAILED) {
        // 可能遇到了密钥轮换，下次请求重新获取公钥
        clearApiCryptoPublicKey();
      }
      throw error;
    },
  });

  // 登录失效（HTTP 401）
  client.addResponseInterceptor(
    authenticateResponseInterceptor({
      client,
      doReAuthenticate,
      doRefreshToken: async () => '',
      enableRefreshToken: false,
      formatToken,
    }),
  );

  // 其他错误：优先显示后端返回的 message，没有时按 HTTP 状态码提示；用 silentErrors 发出的请求不提示
  client.addResponseInterceptor(
    errorMessageResponseInterceptor((fallback: string, error) => {
      if (error?.config?.[SILENT_ERRORS_KEY]) {
        return;
      }
      showRequestError(error, fallback);
    }),
  );

  return client;
}

/**
 * 出错时不弹出提示的请求配置，用于可有可无的辅助功能（例如消息中心）：
 * 服务不可用时由调用方静默处理，不打扰用户。登录失效仍按统一规则处理
 */
export function silentErrors<T extends RequestClientConfig>(config: T): T {
  return Object.assign(config, { [SILENT_ERRORS_KEY]: true });
}

export const requestClient = createRequestClient(apiURL, {
  // 数组参数按 sort=a&sort=b 发送（不带 []），后端按可重复参数接收
  paramsSerializer: { indexes: null },
  responseReturn: 'data',
});

/** 不经过统一拦截器的客户端，返回完整响应 */
export const baseRequestClient = new RequestClient({ baseURL: apiURL });

/**
 * 加密发送 POST 请求，用于后端标注了 @ApiEncrypt 的接口。
 * 后端未开启接口加密时按明文发送；浏览器无法安全加密时抛出 ApiCryptoUnavailableError
 */
export async function postEncrypted<T = any>(
  url: string,
  data: unknown,
  config: RequestClientConfig = {},
): Promise<T> {
  return sendEncrypted<T>('post', url, data, config);
}

/**
 * 加密发送 PUT 请求，例如修改密码、重置密码（后端标注了 @ApiEncrypt）
 */
export async function putEncrypted<T = any>(
  url: string,
  data: unknown,
  config: RequestClientConfig = {},
): Promise<T> {
  return sendEncrypted<T>('put', url, data, config);
}

async function sendEncrypted<T>(
  method: 'post' | 'put',
  url: string,
  data: unknown,
  config: RequestClientConfig,
): Promise<T> {
  const key = await getApiCryptoPublicKey();
  if (!key.enabled) {
    return requestClient[method]<T>(url, data, config);
  }
  const subtle = resolveSubtle(key);
  const { aesKey, envelope, nonce } = await encryptRequest(subtle, key, data);
  const context: CryptoContext = { aesKey, nonce, subtle };
  return requestClient[method]<T>(url, envelope, {
    ...config,
    headers: { ...config.headers, [API_CRYPTO_HEADER]: '1' },
    [CRYPTO_CONTEXT]: context,
  } as RequestClientConfig);
}

/**
 * 导出 Excel 并保存为文件。后端出错时（例如超过导出行数上限）由请求层提示
 *
 * @param url 导出接口，例如 /system/post/export
 * @param params 查询条件，与列表查询相同
 * @param fileName 保存的文件名
 */
export async function exportExcel(
  url: string,
  params: Record<string, unknown>,
  fileName: string,
) {
  const blob = await requestClient.download<Blob>(url, {
    method: 'POST',
    params,
  });
  downloadFileFromBlobPart({ fileName, source: blob });
}
