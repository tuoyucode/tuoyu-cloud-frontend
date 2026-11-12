<script lang="ts" setup>
import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { resetUserPassword } from '@tuoyu/shared/api/system/user';
import { ApiCryptoUnavailableError } from '@tuoyu/shared/utils/api-crypto';
import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { useResetPasswordSchema } from './data';

/** 要重置密码的用户 */
const user = ref<{ nickName: string; userId: string; userName: string }>();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useResetPasswordSchema(),
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (!user.value) {
      return;
    }
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    modalApi.lock();
    try {
      const { password } = await formApi.getValues();
      await resetUserPassword(user.value.userId, password as string);
      ElMessage.success($t('system.user.passwordReset'));
      modalApi.close();
    } catch (error) {
      // 浏览器无法加密时请求不会发出，请求层不会提示，这里说明原因
      if (error instanceof ApiCryptoUnavailableError) {
        ElMessage.error(error.message);
        return;
      }
      throw error;
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    user.value = modalApi.getData() as typeof user.value;
    await formApi.resetForm();
  },
});
</script>

<template>
  <Modal
    :confirm-text="$t('system.user.resetPassword')"
    :title="$t('system.user.resetPasswordTitle')"
    class="w-full max-w-[480px]"
  >
    <p v-if="user" class="text-muted-foreground mb-4">
      {{
        $t('system.user.resetPasswordFor', {
          account: user.userName,
          name: user.nickName,
        })
      }}
    </p>
    <Form />
  </Modal>
</template>
