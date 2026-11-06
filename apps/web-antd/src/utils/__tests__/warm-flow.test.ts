import { describe, expect, it } from 'vitest';

import {
  buildWarmFlowUrl,
  clearWarmFlowStorage,
  parseWarmFlowMessage,
  resolveOrigin,
  themeMessage,
} from '../warm-flow';

describe('流程设计器（Warm-Flow）页面地址', () => {
  it('设计器：带定义 ID、令牌与客户端 ID', () => {
    const url = buildWarmFlowUrl({
      apiURL: '/api/',
      clientId: 'pc',
      id: '100',
      theme: 'dark',
      token: 'abc',
    });
    const [path, search] = url.split('?');
    expect(path).toBe('/api/warm-flow-ui/index.html');
    const params = new URLSearchParams(search);
    expect(params.get('id')).toBe('100');
    expect(params.get('Authorization')).toBe('Bearer abc');
    expect(params.get('clientid')).toBe('pc');
    expect(params.get('theme')).toBe('theme-dark');
    expect(params.has('type')).toBe(false);
    expect(params.has('disabled')).toBe(false);
  });

  it('流程图：type=FlowChart，只读；没有令牌时不带 Authorization', () => {
    const url = buildWarmFlowUrl({
      apiURL: 'https://example.com/api',
      clientId: 'pc',
      disabled: true,
      id: '7',
      page: 'FlowChart',
      token: null,
    });
    const params = new URLSearchParams(url.split('?')[1]);
    expect(url.startsWith('https://example.com/api/warm-flow-ui/')).toBe(true);
    expect(params.get('type')).toBe('FlowChart');
    expect(params.get('disabled')).toBe('true');
    expect(params.has('Authorization')).toBe(false);
  });

  it('来源按页面地址解析', () => {
    expect(resolveOrigin('/api/x', 'http://localhost:5666/#/a')).toBe(
      'http://localhost:5666',
    );
    expect(resolveOrigin('https://b.com/api/x', 'http://localhost:5666/')).toBe(
      'https://b.com',
    );
  });
});

describe('流程设计器（Warm-Flow）消息', () => {
  const frame = {} as Window;
  const origin = 'http://localhost:5666';

  it('只接受指定 iframe、指定来源的 { method } 消息', () => {
    expect(
      parseWarmFlowMessage(
        { data: { method: 'close' }, origin, source: frame },
        frame,
        origin,
      ),
    ).toEqual({ method: 'close' });
    // 来源不同
    expect(
      parseWarmFlowMessage(
        {
          data: { method: 'close' },
          origin: 'http://evil.test',
          source: frame,
        },
        frame,
        origin,
      ),
    ).toBeUndefined();
    // 不是这个 iframe
    expect(
      parseWarmFlowMessage(
        { data: { method: 'close' }, origin, source: {} as Window },
        frame,
        origin,
      ),
    ).toBeUndefined();
    // 格式不对
    expect(
      parseWarmFlowMessage(
        { data: 'close', origin, source: frame },
        frame,
        origin,
      ),
    ).toBeUndefined();
    expect(
      parseWarmFlowMessage(
        { data: { method: 'close' }, origin, source: frame },
        undefined,
        origin,
      ),
    ).toBeUndefined();
  });

  it('主题消息', () => {
    expect(themeMessage(true)).toEqual({ type: 'theme-dark' });
    expect(themeMessage(false)).toEqual({ type: 'theme-light' });
  });
});

describe('退出登录时清除 Warm-Flow 保存的令牌', () => {
  it('只删除 Warm- 开头的键', () => {
    const storage = new Map<string, string>([
      ['tuoyu-web-preferences', '{}'],
      ['Warm-Authorization', 'Bearer abc'],
      ['Warm-clientid', 'pc'],
      ['Warm-TokenName', 'Authorization,clientid'],
    ]);
    const fake = {
      get length() {
        return storage.size;
      },
      key: (index: number) => [...storage.keys()][index] ?? null,
      removeItem: (key: string) => storage.delete(key),
    } as unknown as Storage;
    clearWarmFlowStorage(fake);
    expect([...storage.keys()]).toEqual(['tuoyu-web-preferences']);
  });

  it('无法访问存储时不报错', () => {
    const broken = {
      get length(): number {
        throw new Error('blocked');
      },
    } as unknown as Storage;
    expect(() => clearWarmFlowStorage(broken)).not.toThrow();
  });
});
