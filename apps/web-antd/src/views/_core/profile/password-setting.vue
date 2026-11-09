<script lang="ts" setup>
import { ref } from 'vue';

import { updatePassword } from '@tuoyu/shared/api/system/profile';
import { Alert, Button, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { usePasswordSchema } from './data';

const saving = ref(false);
/** 修改成功后显示说明（后端不会让其他会话失效） */
const changed = ref(false);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: usePasswordSchema(),
  showDefaultActions: false,
});

async function handleSubmit() {
  const { valid } = await formApi.validate();
  if (!valid) {
    return;
  }
  saving.value = true;
  try {
    const values = await formApi.getValues();
    await updatePassword({
      newPassword: values.newPassword as string,
      oldPassword: values.oldPassword as string,
    });
    message.success($t('page.profile.passwordChanged'));
    changed.value = true;
    await formApi.resetForm();
  } catch (error: any) {
    // 后端返回的错误（例如当前密码错误）已由请求层提示；
    // 浏览器无法加密、获取公钥失败等前端错误请求层不会提示，在这里说明原因
    if (!error?.response && !error?.isAxiosError && error?.message) {
      message.error(error.message);
    }
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="max-w-md">
    <Alert
      v-if="changed"
      :description="$t('page.profile.passwordChangedDesc')"
      :message="$t('page.profile.passwordChanged')"
      class="mb-4"
      closable
      show-icon
      type="success"
      @close="changed = false"
    />
    <Form />
    <Button :loading="saving" type="primary" @click="handleSubmit">
      {{ $t('page.profile.changePassword') }}
    </Button>
  </div>
</template>
