import { describe, expect, it, vi } from 'vitest';

import {
  HTML_TAG_PATTERN,
  isAuthorizeUrl,
  MOBILE_PATTERN,
  parseSocialCallback,
  resolveProfileTab,
  socialPlatformName,
  sortDevices,
  splitGroup,
  toFormValues,
  toProfileForm,
  unboundSources,
} from '../data';

vi.mock('#/locales', () => ({ $t: (key: string) => key }));

describe('个人中心：数据处理', () => {
  it('手机号规则与后端一致（可带 0、86、+86 前缀）', () => {
    for (const phone of ['13800138000', '+8613800138000', '8619912345678']) {
      expect(MOBILE_PATTERN.test(phone)).toBe(true);
    }
    for (const phone of ['12800138000', '1380013800', '138001380001', 'abc']) {
      expect(MOBILE_PATTERN.test(phone)).toBe(false);
    }
  });

  it('昵称不能包含 HTML 标签（与后端 @Xss 一致）', () => {
    expect(HTML_TAG_PATTERN.test('<b>名字</b>')).toBe(true);
    expect(HTML_TAG_PATTERN.test('<img src=x>')).toBe(true);
    expect(HTML_TAG_PATTERN.test('a < b')).toBe(false);
    expect(HTML_TAG_PATTERN.test('普通昵称')).toBe(false);
  });

  it('个人信息转为表单值，空值显示为空字符串', () => {
    expect(
      toFormValues({
        email: null,
        gender: '1',
        nickName: '张三',
        phoneNumber: null,
        userId: '1',
        userName: 'zhangsan',
      }),
    ).toEqual({
      email: '',
      gender: '1',
      nickName: '张三',
      phoneNumber: '',
      userName: 'zhangsan',
    });
  });

  it('提交时去掉空白；手机号、邮箱为空字符串表示清空；不提交账号', () => {
    expect(
      toProfileForm({
        email: '  ',
        gender: '',
        nickName: ' 张三 ',
        phoneNumber: '',
        userName: 'zhangsan',
      }),
    ).toEqual({
      email: '',
      gender: undefined,
      nickName: '张三',
      phoneNumber: '',
    });
    expect(
      toProfileForm({
        email: 'a@example.com',
        gender: '0',
        nickName: '李四',
        phoneNumber: ' 13800138000 ',
      }),
    ).toEqual({
      email: 'a@example.com',
      gender: '0',
      nickName: '李四',
      phoneNumber: '13800138000',
    });
  });

  it('表单中没有手机号、邮箱时不提交，避免误清空', () => {
    expect(toProfileForm({ nickName: '王五' })).toEqual({
      email: undefined,
      gender: undefined,
      nickName: '王五',
      phoneNumber: undefined,
    });
  });

  it('已保存的手机号作为表单初始值，清空后提交空字符串', () => {
    const values = toFormValues({
      nickName: '张三',
      phoneNumber: '13800138000',
      userId: '1',
      userName: 'zhangsan',
    });
    expect(values.phoneNumber).toBe('13800138000');
    expect(toProfileForm({ ...values, phoneNumber: '' }).phoneNumber).toBe('');
  });

  it('角色、岗位名称按逗号拆分', () => {
    expect(splitGroup('超级管理员,普通角色')).toEqual([
      '超级管理员',
      '普通角色',
    ]);
    expect(splitGroup(' 董事长 , ')).toEqual(['董事长']);
    expect(splitGroup(null)).toEqual([]);
    expect(splitGroup('')).toEqual([]);
  });

  it('在线设备：当前设备在最前，其余按登录时间从新到旧', () => {
    const sorted = sortDevices([
      { loginTime: 1, sessionId: 'a', userName: 'u' },
      { current: true, loginTime: 2, sessionId: 'b', userName: 'u' },
      { loginTime: 3, sessionId: 'c', userName: 'u' },
      { sessionId: 'd', userName: 'u' },
    ]);
    expect(sorted.map((device) => device.sessionId)).toEqual([
      'b',
      'c',
      'a',
      'd',
    ]);
  });

  it('页签可以用查询参数指定，无效时为基本资料', () => {
    expect(resolveProfileTab('social')).toBe('social');
    expect(resolveProfileTab(['devices', 'social'])).toBe('devices');
    expect(resolveProfileTab('unknown')).toBe('basic');
    expect(resolveProfileTab(undefined)).toBe('basic');
    expect(resolveProfileTab(null)).toBe('basic');
  });

  it('第三方平台显示名：已知编码取文案，未知编码原样显示', () => {
    expect(socialPlatformName('gitee')).toBe('page.profile.platforms.gitee');
    expect(socialPlatformName('DingTalk')).toBe(
      'page.profile.platforms.dingtalk',
    );
    expect(socialPlatformName('wechat_open')).toBe(
      'page.profile.platforms.wechat_open',
    );
    expect(socialPlatformName('my_sso')).toBe('my_sso');
  });

  it('可绑定的平台：已配置但本人尚未绑定，保持顺序、去重', () => {
    expect(
      unboundSources(
        ['gitee', 'dingtalk', 'github', 'GITEE', ' ', 'wechat_open'],
        [{ source: 'github' }, { source: 'Dingtalk' }],
      ),
    ).toEqual(['gitee', 'wechat_open']);
    expect(unboundSources([], [{ source: 'gitee' }])).toEqual([]);
    expect(unboundSources(['gitee'], [{ source: 'gitee' }])).toEqual([]);
  });

  it('授权页地址只接受 http / https', () => {
    expect(isAuthorizeUrl('https://gitee.com/oauth/authorize?x=1')).toBe(true);
    expect(isAuthorizeUrl('http://127.0.0.1:1989/authorize')).toBe(true);
    expect(isAuthorizeUrl('javascript:alert(1)')).toBe(false);
    expect(isAuthorizeUrl('/relative/path')).toBe(false);
    expect(isAuthorizeUrl('')).toBe(false);
    expect(isAuthorizeUrl(null)).toBe(false);
  });

  it('授权回跳参数：平台、code、state 都有时才绑定', () => {
    expect(
      parseSocialCallback({ code: ' c1 ', source: 'gitee', state: 's1' }),
    ).toEqual({ socialCode: 'c1', socialState: 's1', source: 'gitee' });
    expect(
      parseSocialCallback({ code: ['c1', 'c2'], source: 'gitee', state: 's1' }),
    ).toEqual({ socialCode: 'c1', socialState: 's1', source: 'gitee' });
    expect(parseSocialCallback({ code: 'c1', source: 'gitee' })).toBeNull();
    expect(
      parseSocialCallback({ code: '', source: 'gitee', state: 's1' }),
    ).toBeNull();
    expect(
      parseSocialCallback({ code: 'c1', source: null, state: 's1' }),
    ).toBeNull();
    expect(parseSocialCallback({})).toBeNull();
  });
});
