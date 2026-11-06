<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import type { Recordable } from '@vben/types';

import type { AuthApi } from '#/api';
import type { LoginTenantState } from '#/utils/tenant';

import { computed, h, nextTick, onMounted, ref, useTemplateRef } from 'vue';

import { AuthenticationLogin, z } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { getCaptchaApi, getLoginTenantsApi } from '#/api';
import { $t } from '#/locales';
import { useAuthStore } from '#/store';
import {
  readRememberedTenant,
  rememberTenant,
  resolveLoginTenant,
} from '#/utils/tenant';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();
const loginRef = useTemplateRef<{ getFormApi: () => any }>('loginRef');

/** 图形验证码；后端关闭验证码时 captchaEnabled 为 false，不显示验证码输入框 */
const captcha = ref<AuthApi.CaptchaResult>({ captchaEnabled: false });

async function refreshCaptcha() {
  try {
    captcha.value = await getCaptchaApi();
  } catch {
    // 错误提示已由请求层显示
  }
  loginRef.value?.getFormApi().setFieldValue('code', '');
}

/** 租户：关闭多租户时 enabled 为 false，登录页不显示租户 */
const tenant = ref<LoginTenantState>({
  enabled: false,
  locked: false,
  options: [],
});

async function loadTenants() {
  const hostname = window.location.hostname;
  try {
    const result = await getLoginTenantsApi(hostname);
    tenant.value = resolveLoginTenant(result, hostname, readRememberedTenant());
  } catch {
    // 错误提示已由请求层显示；开启多租户时后端会拒绝不带租户的登录
    return;
  }
  if (tenant.value.value) {
    // 等表单按新的字段渲染后再填入
    await nextTick();
    loginRef.value?.getFormApi().setFieldValue('tenantId', tenant.value.value);
  }
}

const formSchema = computed((): VbenFormSchema[] => {
  const schema: VbenFormSchema[] = [];
  if (tenant.value.enabled) {
    schema.push({
      component: 'VbenSelect',
      componentProps: {
        disabled: tenant.value.locked,
        options: tenant.value.options,
        placeholder: $t('page.auth.tenantTip'),
      },
      defaultValue: tenant.value.value,
      fieldName: 'tenantId',
      label: $t('page.auth.tenant'),
      rules: z
        .string({ error: $t('page.auth.tenantTip') })
        .min(1, { message: $t('page.auth.tenantTip') }),
    });
  }
  schema.push(
    {
      component: 'VbenInput',
      componentProps: {
        autocomplete: 'username',
        placeholder: $t('authentication.usernameTip'),
      },
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z.string().min(1, { message: $t('authentication.usernameTip') }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        autocomplete: 'current-password',
        placeholder: $t('authentication.password'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
  );
  if (captcha.value.captchaEnabled) {
    schema.push({
      component: 'VbenInput',
      componentProps: {
        autocomplete: 'off',
        placeholder: $t('page.auth.captchaTip'),
      },
      fieldName: 'code',
      label: $t('page.auth.captcha'),
      rules: z.string().min(1, { message: $t('page.auth.captchaTip') }),
      suffix: () =>
        h('img', {
          alt: $t('page.auth.captchaRefresh'),
          class: 'h-10 w-28 cursor-pointer rounded-md border border-border',
          onClick: refreshCaptcha,
          src: captcha.value.img
            ? `data:image/png;base64,${captcha.value.img}`
            : undefined,
          title: $t('page.auth.captchaRefresh'),
        }),
    });
  }
  return schema;
});

async function handleSubmit(values: Recordable<any>) {
  // 只在开启多租户时发送租户
  const tenantId: string | undefined = tenant.value.enabled
    ? values.tenantId
    : undefined;
  try {
    await authStore.authLogin({
      code: values.code,
      password: values.password,
      tenantId,
      username: values.username,
      uuid: captcha.value.uuid,
    });
    if (tenantId) {
      rememberTenant(tenantId);
    }
  } catch (error: any) {
    // 后端返回的错误已由请求层提示；加密不可用、获取公钥失败等前端错误在这里提示
    if (!error?.response && error?.message) {
      message.error(error.message);
    }
    if (captcha.value.captchaEnabled) {
      await refreshCaptcha();
    }
  }
}

onMounted(() => {
  refreshCaptcha();
  loadTenants();
});
</script>

<template>
  <AuthenticationLogin
    ref="loginRef"
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    :show-code-login="false"
    :show-forget-password="false"
    :show-qrcode-login="false"
    :show-register="false"
    :show-third-party-login="false"
    @submit="handleSubmit"
  />
</template>
