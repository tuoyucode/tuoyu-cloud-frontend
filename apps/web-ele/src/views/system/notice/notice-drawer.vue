<script lang="ts" setup>
import type { NoticeApi } from '@tuoyu/shared/api/system/notice';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  addNotice,
  getNotice,
  updateNotice,
} from '@tuoyu/shared/api/system/notice';
import { ElAlert, ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { loadFormOptions, useFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

/** 编辑时的公告 ID；新增时为空 */
const noticeId = ref<string>();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-4',
});

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    drawerApi.lock();
    try {
      const values = (await formApi.getValues()) as NoticeApi.Form;
      await (noticeId.value
        ? updateNotice({ ...values, noticeId: noticeId.value })
        : addNotice(values));
      ElMessage.success($t('crud.saved'));
      emit('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    const data = drawerApi.getData() as undefined | { noticeId?: string };
    noticeId.value = data?.noticeId;
    await formApi.resetForm();
    drawerApi.lock();
    try {
      const options = await loadFormOptions();
      formApi.updateSchema([
        {
          componentProps: { options: options.noticeType },
          fieldName: 'noticeType',
        },
        { componentProps: { options: options.status }, fieldName: 'status' },
      ]);
      if (noticeId.value) {
        await formApi.setValues(await getNotice(noticeId.value));
      }
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  noticeId.value ? $t('system.notice.edit') : $t('system.notice.create'),
);
</script>

<template>
  <Drawer
    :confirm-text="noticeId ? $t('crud.save') : $t('system.notice.publish')"
    :title="title"
    class="w-full max-w-[720px]"
  >
    <ElAlert
      v-if="!noticeId"
      :closable="false"
      :title="$t('system.notice.pushHint')"
      class="mb-4"
      show-icon
      type="info"
    />
    <Form />
  </Drawer>
</template>
