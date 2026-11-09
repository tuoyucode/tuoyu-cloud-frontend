/**
 * 后端统一返回结构 ApiResult 的解析：成功为 HTTP 200 + code 0，
 * 失败时 HTTP 状态码表达错误类别，响应体结构相同（message 给用户看，traceId 用于排查）
 */

/** 后端统一返回结构（ApiResult） */
export interface ApiResult<T = unknown> {
  code: number;
  data?: T;
  message?: string;
  traceId?: string;
}

/** 成功码 */
export const SUCCESS_CODE = 0;

/** 请求错误中可以展示给用户的信息 */
export interface RequestErrorInfo {
  /** 后端返回的 message，没有时为空 */
  message?: string;
  /** HTTP 状态码，网络错误、超时时为空 */
  status?: number;
  /** 后端返回的 traceId，没有时为空 */
  traceId?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** 是否为后端的统一返回结构（至少带数字型的 code） */
export function isApiResult(body: unknown): body is ApiResult {
  return isRecord(body) && typeof body.code === 'number';
}

/** 是否为成功的返回 */
export function isSuccess(body: unknown): body is ApiResult {
  return isApiResult(body) && body.code === SUCCESS_CODE;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/**
 * 从请求错误（axios 错误，或拦截器抛出的带 response 的对象）中取出状态码、message 与 traceId
 */
export function requestErrorInfo(error: unknown): RequestErrorInfo {
  const response = isRecord(error) ? error.response : undefined;
  if (!isRecord(response)) {
    return {};
  }
  const status =
    typeof response.status === 'number' ? response.status : undefined;
  const body = response.data;
  if (!isRecord(body)) {
    return { status };
  }
  return {
    message: nonEmptyString(body.message),
    status,
    traceId: nonEmptyString(body.traceId),
  };
}

/** 后端返回的错误提示，没有时用 fallback */
export function errorMessageOf(error: unknown, fallback: string): string {
  return requestErrorInfo(error).message ?? fallback;
}

/**
 * 下载类请求（responseType 为 blob）出错时，响应体也是 Blob。
 * 内容为 JSON 时解析成对象，便于统一读取 message；其他内容原样返回
 */
export async function parseBlobBody(data: unknown): Promise<unknown> {
  if (typeof Blob === 'undefined' || !(data instanceof Blob)) {
    return data;
  }
  if (!data.type.includes('json')) {
    return data;
  }
  try {
    return JSON.parse(await data.text());
  } catch {
    return data;
  }
}
