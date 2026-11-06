import { describe, expect, it } from 'vitest';

import { toHashCallbackUrl } from '../social-callback';

describe('第三方授权回跳：hash 路由下的地址改写', () => {
  it('把 /social-callback?... 改写到 # 之后，保留全部参数', () => {
    expect(
      toHashCallbackUrl({
        pathname: '/social-callback',
        search: '?source=gitee&code=c1&state=s1',
      }),
    ).toBe('/#/social-callback?source=gitee&code=c1&state=s1');
    expect(
      toHashCallbackUrl({ pathname: '/social-callback/', search: '' }),
    ).toBe('/#/social-callback');
  });

  it('部署在子路径时按 base 判断', () => {
    expect(
      toHashCallbackUrl(
        { pathname: '/admin/social-callback', search: '?source=qq' },
        '/admin/',
      ),
    ).toBe('/admin/#/social-callback?source=qq');
    expect(
      toHashCallbackUrl(
        { pathname: '/admin/social-callback', search: '' },
        '/admin',
      ),
    ).toBe('/admin/#/social-callback');
    expect(
      toHashCallbackUrl(
        { pathname: '/social-callback', search: '' },
        '/admin/',
      ),
    ).toBeNull();
  });

  it('不是回调地址时不改写', () => {
    expect(toHashCallbackUrl({ pathname: '/', search: '' })).toBeNull();
    expect(
      toHashCallbackUrl({ pathname: '/index.html', search: '?a=1' }),
    ).toBeNull();
    expect(
      toHashCallbackUrl({ pathname: '/x/social-callback', search: '' }),
    ).toBeNull();
  });
});
