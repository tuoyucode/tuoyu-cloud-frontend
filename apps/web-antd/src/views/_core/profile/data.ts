import type { VbenFormSchema } from '#/adapter/form';

import {
  EMAIL_MAX,
  HTML_TAG_PATTERN,
  MOBILE_PATTERN,
  NICK_NAME_MAX,
  PASSWORD_MAX,
  PASSWORD_MIN,
} from '@tuoyu/shared/pages/profile/profile';

import { z } from '#/adapter/form';
import { $t } from '#/locales';

export {
  AVATAR_ACCEPT,
  AVATAR_EXTENSIONS,
  AVATAR_MAX_SIZE,
  avatarRejection,
  EMAIL_MAX,
  HTML_TAG_PATTERN,
  isAuthorizeUrl,
  MOBILE_PATTERN,
  NICK_NAME_MAX,
  parseSocialCallback,
  PASSWORD_MAX,
  PASSWORD_MIN,
  PROFILE_TABS,
  type ProfileTab,
  resolveProfileTab,
  SOCIAL_PLATFORMS,
  socialPlatformName,
  sortDevices,
  splitGroup,
  toFormValues,
  toProfileForm,
  unboundSources,
} from '@tuoyu/shared/pages/profile/profile';

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
