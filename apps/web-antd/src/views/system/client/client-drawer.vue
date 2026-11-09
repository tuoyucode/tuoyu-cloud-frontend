<script lang="ts" setup>
import type { ClientApi } from '@tuoyu/shared/api/system/client';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  addClient,
  getClient,
  updateClient,
} from '@tuoyu/shared/api/system/client';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { loadFormOptions, useFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

/** 编辑时的客户端主键；新增时为空 */
const recordId = ref<string>();

/** 编辑时从后端读取的记录，提交时沿用其中不可修改的字段 */
const editing = ref<ClientApi.Client>();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-4',
});

/** 规则列表在表单中每行一条 */
function toLines(list?: string[]) {
  return list?.join('\n') ?? '';
}

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    drawerApi.lock();
    try {
      const values = (await formApi.getValues()) as ClientApi.Form;
      const record = editing.value;
      if (recordId.value && !record) {
        return;
      }
      await (record
        ? updateClient({
            ...values,
            // 客户端 ID 由 Key 与密钥生成，编辑时两者都不修改；
            // 不传密钥，后端保留原值（详情接口也不返回密钥）
            clientId: record.clientId,
            clientKey: record.clientKey,
            clientSecret: undefined,
            id: record.id,
          })
        : addClient(values));
      message.success($t('crud.saved'));
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
    const data = drawerApi.getData() as undefined | { id?: string };
    recordId.value = data?.id;
    editing.value = undefined;
    await formApi.resetForm();
    drawerApi.lock();
    try {
      const options = await loadFormOptions();
      const isEdit = Boolean(recordId.value);
      formApi.updateSchema([
        {
          componentProps: { options: options.grantType },
          fieldName: 'grantTypeList',
        },
        {
          componentProps: { options: options.deviceType },
          fieldName: 'deviceType',
        },
        { componentProps: { options: options.status }, fieldName: 'status' },
        {
          componentProps: { disabled: isEdit },
          fieldName: 'clientKey',
          help: isEdit ? $t('system.client.clientKeyReadonly') : undefined,
        },
        // 编辑时不显示密钥，提交时不传，后端保留原值
        { fieldName: 'clientSecret', hide: isEdit },
      ]);
      if (recordId.value) {
        const record = await getClient(recordId.value);
        editing.value = record;
        await formApi.setValues({
          accessPath: toLines(record.accessPathList),
          activeTimeout: record.activeTimeout,
          clientKey: record.clientKey,
          deviceType: record.deviceType,
          grantTypeList: record.grantTypeList ?? [],
          ipWhitelist: toLines(record.ipWhitelistList),
          status: record.status,
          timeout: record.timeout,
        });
      }
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  recordId.value ? $t('system.client.edit') : $t('system.client.create'),
);
</script>

<template>
  <Drawer
    :confirm-text="$t('crud.save')"
    :title="title"
    class="w-full max-w-[640px]"
  >
    <Form />
  </Drawer>
</template>
