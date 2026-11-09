<script lang="ts" setup>
import type { OssApi } from '@tuoyu/shared/api/system/oss';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';
import {
  addOssConfig,
  getOssConfig,
  updateOssConfig,
} from '@tuoyu/shared/api/system/oss';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { useConfigFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

/** 密钥字段与接口中“是否已设置”标记的对应关系：编辑时不回显，留空表示不修改 */
const KEY_FIELDS = [
  ['accessKey', 'accessKeySet'],
  ['secretKey', 'secretKeySet'],
] as const;

/** 编辑时的配置 ID；新增时为空 */
const ossConfigId = ref<string>();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useConfigFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-4',
});

/**
 * 新增时密钥必填；编辑时不回显原值，按是否已设置给出提示，留空表示不修改
 */
function updateKeyFields(detail?: OssApi.ConfigDetail) {
  formApi.updateSchema(
    KEY_FIELDS.map(([fieldName, setFlag]) => {
      let placeholder = $t('system.oss.config.keyPlaceholder');
      if (detail) {
        placeholder = detail[setFlag]
          ? $t('system.oss.config.keyKeepPlaceholder')
          : $t('system.oss.config.keyEmptyPlaceholder');
      }
      return {
        componentProps: { placeholder },
        fieldName,
        rules: detail ? null : 'required',
      };
    }),
  );
}

/** 编辑时去掉留空的密钥，后端不会修改这些字段 */
function withoutEmptyKeys(values: OssApi.ConfigForm): OssApi.ConfigForm {
  const { accessKey, secretKey, ...rest } = values;
  return {
    ...rest,
    ...(accessKey ? { accessKey } : {}),
    ...(secretKey ? { secretKey } : {}),
  };
}

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    drawerApi.lock();
    try {
      const values = (await formApi.getValues()) as OssApi.ConfigForm;
      await (ossConfigId.value
        ? updateOssConfig({
            ...withoutEmptyKeys(values),
            ossConfigId: ossConfigId.value,
          })
        : addOssConfig(values));
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
    const data = drawerApi.getData() as undefined | { ossConfigId?: string };
    ossConfigId.value = data?.ossConfigId;
    await formApi.resetForm();
    drawerApi.lock();
    try {
      const yesNo = await getDictOptions(DictType.YES_NO);
      formApi.updateSchema([
        { componentProps: { options: yesNo }, fieldName: 'isHttps' },
      ]);
      if (ossConfigId.value) {
        const { accessKeySet, secretKeySet, ...detail } = await getOssConfig(
          ossConfigId.value,
        );
        updateKeyFields({ ...detail, accessKeySet, secretKeySet });
        // 是否已设置的标记不是表单字段
        await formApi.setValues(detail);
      } else {
        updateKeyFields();
      }
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  ossConfigId.value
    ? $t('system.oss.config.edit')
    : $t('system.oss.config.create'),
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
