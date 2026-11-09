import { describe, expect, it } from 'vitest';

import {
  errorMessageOf,
  isApiResult,
  isSuccess,
  parseBlobBody,
  requestErrorInfo,
} from '../api-result';

describe('isSuccess', () => {
  it('code 为 0 时成功', () => {
    expect(isSuccess({ code: 0, data: { a: 1 }, message: '操作成功' })).toBe(
      true,
    );
    expect(isSuccess({ code: 0 })).toBe(true);
  });

  it('其他 code、缺少 code 或不是对象时不算成功', () => {
    expect(isSuccess({ code: 200, data: null })).toBe(false);
    expect(isSuccess({ code: 400, message: '参数错误' })).toBe(false);
    expect(isSuccess({ code: '0' })).toBe(false);
    expect(isSuccess({ data: [] })).toBe(false);
    expect(isSuccess(null)).toBe(false);
    expect(isSuccess('ok')).toBe(false);
  });

  it('isApiResult 只要求数字型的 code', () => {
    expect(isApiResult({ code: 403 })).toBe(true);
    expect(isApiResult({ msg: 'x' })).toBe(false);
  });
});

describe('requestErrorInfo', () => {
  it('取出 HTTP 状态、message 与 traceId', () => {
    const error = {
      response: {
        data: {
          code: 500,
          message: '系统错误，错误编号 E1',
          traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        },
        status: 500,
      },
    };
    expect(requestErrorInfo(error)).toEqual({
      message: '系统错误，错误编号 E1',
      status: 500,
      traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
    });
  });

  it('业务错误码可以与 HTTP 状态不同，以 HTTP 状态为准', () => {
    const info = requestErrorInfo({
      response: { data: { code: 10_001, message: '名称已存在' }, status: 400 },
    });
    expect(info.status).toBe(400);
    expect(info.message).toBe('名称已存在');
    expect(info.traceId).toBeUndefined();
  });

  it('空字符串、非字符串的 message 与 traceId 视为没有', () => {
    const info = requestErrorInfo({
      response: { data: { code: 403, message: '', traceId: 1 }, status: 403 },
    });
    expect(info).toEqual({
      message: undefined,
      status: 403,
      traceId: undefined,
    });
  });

  it('响应体不是对象（例如代理返回的 HTML）时只有状态码', () => {
    expect(
      requestErrorInfo({ response: { data: '<html></html>', status: 502 } }),
    ).toEqual({ status: 502 });
  });

  it('网络错误、超时没有响应', () => {
    expect(requestErrorInfo(new Error('Network Error'))).toEqual({});
    expect(requestErrorInfo(undefined)).toEqual({});
  });
});

describe('errorMessageOf', () => {
  it('优先用后端的 message，没有时用 fallback', () => {
    expect(
      errorMessageOf(
        {
          response: {
            data: { code: 413, message: '上传内容超过上限' },
            status: 413,
          },
        },
        '上传失败',
      ),
    ).toBe('上传内容超过上限');
    expect(errorMessageOf({ response: { status: 500 } }, '上传失败')).toBe(
      '上传失败',
    );
  });
});

describe('parseBlobBody', () => {
  it('jSON 类型的 Blob 解析为对象', async () => {
    const blob = new Blob(
      [
        JSON.stringify({
          code: 400,
          message: '超过导出行数上限',
          traceId: 't',
        }),
      ],
      { type: 'application/json' },
    );
    await expect(parseBlobBody(blob)).resolves.toEqual({
      code: 400,
      message: '超过导出行数上限',
      traceId: 't',
    });
  });

  it('其他类型的 Blob、无法解析的 JSON 与非 Blob 原样返回', async () => {
    const excel = new Blob(['xlsx'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await expect(parseBlobBody(excel)).resolves.toBe(excel);
    const broken = new Blob(['{'], { type: 'application/json' });
    await expect(parseBlobBody(broken)).resolves.toBe(broken);
    const body = { code: 0 };
    await expect(parseBlobBody(body)).resolves.toBe(body);
  });
});
