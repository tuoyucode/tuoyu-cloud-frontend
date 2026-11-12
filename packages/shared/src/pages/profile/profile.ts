/**
 * 个人中心与界面无关的部分：表单的校验规则与取值转换、头像检查、在线设备排序、页签与第三方账号绑定
 */
import type { OnlineApi } from '../../api/monitor/online';
import type { ProfileApi } from '../../api/system/profile';
import type { SocialApi } from '../../api/system/social';

import { $t } from '@vben/locales';

/** 与后端 SysUserProfileBo 一致：昵称最多 30 个字符，邮箱最多 50 个字符 */
export const NICK_NAME_MAX = 30;
export const EMAIL_MAX = 50;

/** 与登录接口一致：密码 5 ~ 30 个字符（超出范围的密码改了之后无法登录） */
export const PASSWORD_MIN = 5;
export const PASSWORD_MAX = 30;

/** 与后端 RegexConstants.MOBILE 一致：可带 0、86、+86 前缀的 11 位手机号 */
export const MOBILE_PATTERN = /^(?:0|86|\+86)?1[3-9]\d{9}$/;

/** 与后端 @Xss 一致：不能包含 HTML 标签 */
export const HTML_TAG_PATTERN = /<[^<]*?>/;

/** 头像接受的扩展名，与后端 SysProfileController 一致 */
export const AVATAR_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;

/** 头像的大小上限（2MB），与后端一致 */
export const AVATAR_MAX_SIZE = 2 * 1024 * 1024;

/** 选择头像时的 accept 属性 */
export const AVATAR_ACCEPT = AVATAR_EXTENSIONS.map((ext) => `.${ext}`).join(
  ',',
);

/**
 * 上传头像前检查：类型或大小不符时返回原因的文案键，否则返回 undefined（服务端再按文件头校验）
 */
export function avatarRejection(file: {
  name: string;
  size: number;
}):
  | 'page.profile.avatarTooLarge'
  | 'page.profile.avatarTypeInvalid'
  | undefined {
  const index = file.name.lastIndexOf('.');
  const ext = index > 0 ? file.name.slice(index + 1).toLowerCase() : '';
  if (!(AVATAR_EXTENSIONS as readonly string[]).includes(ext)) {
    return 'page.profile.avatarTypeInvalid';
  }
  if (file.size > AVATAR_MAX_SIZE) {
    return 'page.profile.avatarTooLarge';
  }
  return undefined;
}

/** 个人信息转为表单的初始值（空值显示为空字符串） */
export function toFormValues(user: ProfileApi.User) {
  return {
    email: user.email ?? '',
    gender: user.gender ?? undefined,
    nickName: user.nickName ?? '',
    phoneNumber: user.phoneNumber ?? '',
    userName: user.userName,
  };
}

/**
 * 表单值转为修改个人信息的请求：
 * - 去掉首尾空白；
 * - 手机号、邮箱为空字符串表示清空（后端约定：空字符串清空，不传表示不修改）；
 *   表单中没有这个字段（不是字符串）时不提交，避免误清空；
 * - 用户账号不能修改，不提交
 */
export function toProfileForm(
  values: Record<string, unknown>,
): ProfileApi.Form {
  const text = (value: unknown) =>
    typeof value === 'string' ? value.trim() : undefined;
  const gender = text(values.gender);
  return {
    email: text(values.email),
    gender: gender === '' ? undefined : gender,
    nickName: text(values.nickName),
    phoneNumber: text(values.phoneNumber),
  };
}

/** 后端以逗号分隔的角色、岗位名称转为列表 */
export function splitGroup(group?: null | string): string[] {
  return (group ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name !== '');
}

/** 在线设备排序：当前设备在最前，其余按登录时间从新到旧 */
export function sortDevices(devices: readonly OnlineApi.Online[]) {
  const time = (device: OnlineApi.Online) => Number(device.loginTime ?? 0) || 0;
  return devices.toSorted((a, b) => {
    if (!!a.current !== !!b.current) {
      return a.current ? -1 : 1;
    }
    return time(b) - time(a);
  });
}

/** 个人中心的页签，可以用查询参数 tab 指定（例如第三方账号绑定后回到 social） */
export const PROFILE_TABS = ['basic', 'password', 'devices', 'social'] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number];

/** 查询参数转为页签，无效时为基本资料 */
export function resolveProfileTab(value: unknown): ProfileTab {
  const tab = Array.isArray(value) ? value[0] : value;
  return PROFILE_TABS.find((item) => item === tab) ?? 'basic';
}

/**
 * 有显示名的第三方平台：后端 tuoyu-auth.yml 中 justauth.type 的编码，
 * 显示名在文案 page.profile.platforms.* 中；不在其中的平台直接显示编码
 */
export const SOCIAL_PLATFORMS: readonly string[] = [
  'alipay_wallet',
  'baidu',
  'coding',
  'csdn',
  'dingtalk',
  'gitea',
  'gitee',
  'github',
  'gitlab',
  'maxkey',
  'oschina',
  'qq',
  'topiam',
  'wechat_enterprise',
  'wechat_mp',
  'wechat_open',
  'weibo',
];

/** 第三方平台的显示名 */
export function socialPlatformName(source: string): string {
  const code = source.trim().toLowerCase();
  return SOCIAL_PLATFORMS.includes(code)
    ? $t(`page.profile.platforms.${code}`)
    : source;
}

/** 已配置但本人尚未绑定的平台：保持后端返回的顺序，去掉重复与空值 */
export function unboundSources(
  sources: readonly string[],
  accounts: readonly Pick<SocialApi.Social, 'source'>[],
): string[] {
  const bound = new Set(
    accounts.map((account) => account.source.trim().toLowerCase()),
  );
  const result: string[] = [];
  for (const source of sources) {
    const code = source.trim().toLowerCase();
    if (code !== '' && !bound.has(code)) {
      bound.add(code);
      result.push(source.trim());
    }
  }
  return result;
}

/** 授权页地址只接受 http / https，不跳转到 javascript: 等其他地址 */
export function isAuthorizeUrl(url: unknown): url is string {
  if (typeof url !== 'string') {
    return false;
  }
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * 读取第三方授权回跳的参数：后端配置的回调地址带 source，
 * 第三方再追加 code 与 state。缺少任何一项时为 null
 */
export function parseSocialCallback(
  query: Record<string, unknown>,
): null | SocialApi.BindForm {
  const read = (value: unknown) => {
    const first = Array.isArray(value) ? value[0] : value;
    return typeof first === 'string' ? first.trim() : '';
  };
  const source = read(query.source);
  const socialCode = read(query.code);
  const socialState = read(query.state);
  if (source === '' || socialCode === '' || socialState === '') {
    return null;
  }
  return { socialCode, socialState, source };
}
