import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  readRememberedTenant,
  rememberTenant,
  resolveLoginTenant,
} from '../tenant';

const tenantA = {
  domain: 'a.example.com',
  tenantId: 'tenant-a',
  tenantName: '租户 A',
};
const tenants = [
  tenantA,
  { domain: null, tenantId: 'tenant-b', tenantName: '租户 B' },
];

describe('resolveLoginTenant', () => {
  it('关闭多租户或接口失败时不显示租户', () => {
    expect(
      resolveLoginTenant({ enabled: false, tenants: [] }, 'x').enabled,
    ).toBe(false);
    expect(resolveLoginTenant(null, 'x')).toEqual({
      enabled: false,
      locked: false,
      options: [],
    });
  });

  it('只返回一个租户且绑定了当前域名时选中并锁定（不区分大小写）', () => {
    const state = resolveLoginTenant(
      { enabled: true, tenants: [tenantA] },
      'A.Example.com',
      'tenant-b',
    );
    expect(state).toEqual({
      enabled: true,
      locked: true,
      options: [{ label: '租户 A', value: 'tenant-a' }],
      value: 'tenant-a',
    });
  });

  it('只有一个租户但域名不匹配时选中、不锁定', () => {
    const state = resolveLoginTenant(
      { enabled: true, tenants: [tenantA] },
      'localhost',
    );
    expect(state.locked).toBe(false);
    expect(state.value).toBe('tenant-a');
  });

  it('多个租户时优先选中上次登录的租户，不在列表中则不选', () => {
    const data = { enabled: true, tenants };
    expect(resolveLoginTenant(data, 'localhost', 'tenant-b').value).toBe(
      'tenant-b',
    );
    expect(
      resolveLoginTenant(data, 'localhost', 'removed').value,
    ).toBeUndefined();
    expect(resolveLoginTenant(data, 'localhost').options).toHaveLength(2);
  });
});

describe('rememberTenant', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('记住并读取上次登录的租户', () => {
    rememberTenant('tenant-a');
    expect(readRememberedTenant()).toBe('tenant-a');
  });

  it('浏览器禁止读写存储时不抛出异常', () => {
    const denied = () => {
      throw new Error('denied');
    };
    vi.stubGlobal('localStorage', { getItem: denied, setItem: denied });
    expect(() => rememberTenant('tenant-a')).not.toThrow();
    expect(readRememberedTenant()).toBeNull();
  });
});
