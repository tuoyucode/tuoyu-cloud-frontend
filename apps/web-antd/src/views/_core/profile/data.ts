import type { OnlineApi } from '@tuoyu/shared/api/monitor/online';
import type { ProfileApi } from '@tuoyu/shared/api/system/profile';
import type { SocialApi } from '@tuoyu/shared/api/system/social';

import type { VbenFormSchema } from '#/adapter/form';

import { z } from '#/adapter/form';
import { $t } from '#/locales';

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

/** 基本资料表单 */
export function useBaseSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { disabled: true },
      fieldName: 'userName',
      label: $t('page.profile.userName'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: NICK_NAME_MAX,
        placeholder: $t('page.profile.nickNamePlaceholder'),
      },
      fieldName: 'nickName',
      label: $t('page.profile.nickName'),
      rules: z
        .string({ error: $t('page.profile.nickNameRequired') })
        .trim()
        .min(1, { message: $t('page.profile.nickNameRequired') })
        .max(NICK_NAME_MAX, { message: $t('page.profile.nickNameLength') })
        .refine((value) => !HTML_TAG_PATTERN.test(value), {
          message: $t('page.profile.nickNameHtml'),
        }),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('page.profile.phonePlaceholder') },
      fieldName: 'phoneNumber',
      label: $t('page.profile.phoneNumber'),
      rules: z
        .string()
        .trim()
        .refine((value) => value === '' || MOBILE_PATTERN.test(value), {
          message: $t('page.profile.phoneInvalid'),
        })
        .optional(),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: EMAIL_MAX,
        placeholder: $t('page.profile.emailPlaceholder'),
      },
      fieldName: 'email',
      label: $t('page.profile.email'),
      rules: z
        .union([
          z.literal(''),
          z
            .email({ message: $t('page.profile.emailInvalid') })
            .max(EMAIL_MAX, { message: $t('page.profile.emailLength') }),
        ])
        .optional(),
    },
    {
      component: 'RadioGroup',
      // 选项在页面加载时从字典读取
      componentProps: { options: [] },
      fieldName: 'gender',
      label: $t('page.profile.gender'),
    },
  ];
}

/** 修改密码表单 */
export function usePasswordSchema(): VbenFormSchema[] {
  return [
    {
      component: 'InputPassword',
      componentProps: {
        autocomplete: 'current-password',
        placeholder: $t('page.profile.oldPasswordPlaceholder'),
      },
      fieldName: 'oldPassword',
      label: $t('page.profile.oldPassword'),
      rules: z
        .string({ error: $t('page.profile.oldPasswordPlaceholder') })
        .min(1, { message: $t('page.profile.oldPasswordPlaceholder') }),
    },
    {
      component: 'InputPassword',
      componentProps: {
        autocomplete: 'new-password',
        placeholder: $t('page.profile.newPasswordPlaceholder'),
      },
      dependencies: {
        rules(values) {
          const { oldPassword } = values;
          return z
            .string({ error: $t('page.profile.passwordLength') })
            .min(PASSWORD_MIN, { message: $t('page.profile.passwordLength') })
            .max(PASSWORD_MAX, { message: $t('page.profile.passwordLength') })
            .refine((value) => !oldPassword || value !== oldPassword, {
              message: $t('page.profile.passwordSame'),
            });
        },
        triggerFields: ['oldPassword'],
      },
      fieldName: 'newPassword',
      label: $t('page.profile.newPassword'),
    },
    {
      component: 'InputPassword',
      componentProps: {
        autocomplete: 'new-password',
        placeholder: $t('page.profile.confirmPasswordPlaceholder'),
      },
      dependencies: {
        rules(values) {
          const { newPassword } = values;
          return z
            .string({ error: $t('page.profile.confirmPasswordPlaceholder') })
            .min(1, { message: $t('page.profile.confirmPasswordPlaceholder') })
            .refine((value) => value === newPassword, {
              message: $t('page.profile.passwordMismatch'),
            });
        },
        triggerFields: ['newPassword'],
      },
      fieldName: 'confirmPassword',
      label: $t('page.profile.confirmPassword'),
    },
  ];
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
