import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  accessStore: {
    accessToken: 'token-1',
    isAccessChecked: true,
    setAccessToken: vi.fn(),
    setLoginExpired: vi.fn(),
  },
  clearApiCryptoPublicKey: vi.fn(),
  errorMessage: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('@vben/hooks', () => ({
  useAppConfig: () => ({ apiURL: '/api' }),
}));
vi.mock('@vben/preferences', () => ({
  preferences: { app: { locale: 'zh-CN', loginExpiredMode: 'page' } },
}));
vi.mock('@vben/stores', () => ({
  useAccessStore: () => mocks.accessStore,
}));
vi.mock('@vben/locales', () => ({ $t: (key: string) => key }));
vi.mock('../core/crypto', () => ({
  clearApiCryptoPublicKey: mocks.clearApiCryptoPublicKey,
  getApiCryptoPublicKey: vi.fn(),
}));

const { requestClient, setupRequestHandlers, silentErrors } =
  await import('../request');

setupRequestHandlers({ logout: mocks.logout, showError: mocks.errorMessage });

type Adapter = (config: any) => Promise<any>;

/** 模拟后端响应：2xx 返回，其他状态按 axios 的方式抛出带 response 的错误 */
function respond(status: number, data: unknown, seen?: any[]): Adapter {
  return async (config) => {
    seen?.push(config);
    const response = { config, data, headers: {}, status, statusText: '' };
    if (status >= 200 && status < 300) {
      return response;
    }
    throw Object.assign(
      new Error(`Request failed with status code ${status}`),
      { config, isAxiosError: true, response },
    );
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('请求层：成功', () => {
  it('hTTP 200 + code 0 时返回 data', async () => {
    const result = await requestClient.get('/system/post/1', {
      adapter: respond(200, {
        code: 0,
        data: { postId: '1' },
        message: '操作成功',
        traceId: 't',
      }),
    });
    expect(result).toEqual({ postId: '1' });
    expect(mocks.errorMessage).not.toHaveBeenCalled();
  });

  it('分页结果原样返回 { items, total }', async () => {
    const result = await requestClient.get('/system/post/list', {
      adapter: respond(200, {
        code: 0,
        data: { items: [{ postId: '1' }], total: 1 },
        message: '操作成功',
      }),
    });
    expect(result).toEqual({ items: [{ postId: '1' }], total: 1 });
  });

  it('sort 按可重复参数发送（不带 []）', async () => {
    const seen: any[] = [];
    await requestClient.get('/monitor/operlog/list', {
      adapter: respond(200, { code: 0, data: { items: [], total: 0 } }, seen),
      params: { page: 2, pageSize: 20, sort: ['operTime,desc', 'operId,asc'] },
    });
    const uri = requestClient.instance.getUri(seen[0]);
    expect(uri).toContain('page=2');
    expect(uri).toContain('pageSize=20');
    expect(uri).toContain('sort=operTime,desc&sort=operId,asc');
    expect(uri).not.toContain('sort[]');
  });
});

describe('请求层：失败', () => {
  it('hTTP 4xx 时提示后端的 message，不附 traceId', async () => {
    await expect(
      requestClient.post(
        '/system/post',
        {},
        {
          adapter: respond(400, {
            code: 400,
            message: '岗位编码已存在',
            traceId: 'trace-400',
          }),
        },
      ),
    ).rejects.toBeTruthy();
    expect(mocks.errorMessage).toHaveBeenCalledWith('岗位编码已存在');
  });

  it('hTTP 200 但 code 不为 0 时按失败处理', async () => {
    await expect(
      requestClient.get('/x', {
        adapter: respond(200, { code: 10_001, message: '业务规则不满足' }),
      }),
    ).rejects.toBeTruthy();
    expect(mocks.errorMessage).toHaveBeenCalledWith('业务规则不满足');
  });

  it('hTTP 5xx 时提示中附带 traceId', async () => {
    await expect(
      requestClient.get('/x', {
        adapter: respond(500, {
          code: 500,
          message: '系统错误，错误编号 E1',
          traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        }),
      }),
    ).rejects.toBeTruthy();
    expect(mocks.errorMessage).toHaveBeenCalledTimes(1);
    expect(mocks.errorMessage).toHaveBeenCalledWith(
      '系统错误，错误编号 E1',
      '4bf92f3577b34da6a3ce929d0e0e4736',
    );
  });

  it('413、429 没有 message 时用可读的提示', async () => {
    await expect(
      requestClient.post(
        '/resource/oss/upload',
        {},
        {
          adapter: respond(413, ''),
        },
      ),
    ).rejects.toBeTruthy();
    await expect(
      requestClient.post('/system/user', {}, { adapter: respond(429, null) }),
    ).rejects.toBeTruthy();
    expect(mocks.errorMessage.mock.calls).toEqual([
      ['request.payloadTooLarge'],
      ['request.tooManyRequests'],
    ]);
  });

  it('hTTP 403 时提示后端的 message，没有时用无权限的通用提示', async () => {
    await expect(
      requestClient.get('/system/user/list', {
        adapter: respond(403, { code: 403, message: '没有访问权限' }),
      }),
    ).rejects.toBeTruthy();
    await expect(
      requestClient.get('/system/user/list', { adapter: respond(403, '') }),
    ).rejects.toBeTruthy();
    expect(mocks.errorMessage.mock.calls[0]).toEqual(['没有访问权限']);
    expect(mocks.errorMessage.mock.calls[1]?.[0]).toBeTypeOf('string');
    expect(mocks.errorMessage.mock.calls[1]?.[0]).not.toBe('没有访问权限');
  });

  it('hTTP 401 时清除令牌并走登录失效流程', async () => {
    await expect(
      requestClient.get('/system/user/getInfo', {
        adapter: respond(401, { code: 401, message: '登录已失效' }),
      }),
    ).rejects.toBeTruthy();
    expect(mocks.accessStore.setAccessToken).toHaveBeenCalledWith(null);
    expect(mocks.logout).toHaveBeenCalledTimes(1);
  });

  it('silentErrors 的请求失败时不提示', async () => {
    await expect(
      requestClient.get(
        '/resource/message/box',
        silentErrors({
          adapter: respond(503, { code: 503, message: '不可用' }),
        }),
      ),
    ).rejects.toBeTruthy();
    expect(mocks.errorMessage).not.toHaveBeenCalled();
  });

  it('下载出错时解析 Blob 中的 JSON，提示后端的 message', async () => {
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
    await expect(
      requestClient.download('/system/user/export', {
        adapter: respond(400, blob),
        method: 'POST',
      }),
    ).rejects.toBeTruthy();
    expect(mocks.errorMessage).toHaveBeenCalledWith('超过导出行数上限');
  });

  it('解密失败（message 为“请求解密失败”）时清除公钥缓存', async () => {
    await expect(
      requestClient.post(
        '/auth/login',
        {},
        {
          adapter: respond(400, { code: 400, message: '请求解密失败' }),
        },
      ),
    ).rejects.toBeTruthy();
    expect(mocks.clearApiCryptoPublicKey).toHaveBeenCalledTimes(1);
    expect(mocks.errorMessage).toHaveBeenCalledWith('请求解密失败');
  });
});

describe('导入用户', () => {
  const defaults = requestClient.instance.defaults;
  const originalAdapter = defaults.adapter;

  async function importWith(adapter: Adapter) {
    defaults.adapter = adapter;
    try {
      const { importUser } = await import('../system/user');
      return await importUser(new Blob(['x']), false);
    } finally {
      defaults.adapter = originalAdapter;
    }
  }

  it('成功时明细取自 message（data 为 null），不弹出提示', async () => {
    const result = await importWith(
      respond(200, {
        code: 0,
        data: null,
        message: '恭喜您，数据已全部导入成功！共 2 条',
        traceId: 't',
      }),
    );
    expect(result).toEqual({
      message: '恭喜您，数据已全部导入成功！共 2 条',
      success: true,
    });
    expect(mocks.errorMessage).not.toHaveBeenCalled();
  });

  it('失败（4xx）时明细取自错误响应的 message，不弹出提示', async () => {
    const result = await importWith(
      respond(400, {
        code: 400,
        message: '导入失败！共 1 条数据格式不正确',
        traceId: 't',
      }),
    );
    expect(result).toEqual({
      message: '导入失败！共 1 条数据格式不正确',
      success: false,
    });
    expect(mocks.errorMessage).not.toHaveBeenCalled();
  });
});
