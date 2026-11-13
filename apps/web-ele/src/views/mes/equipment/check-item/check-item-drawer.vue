<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  addCheckItem,
  getCheckItem,
  getDeviceTypes,
  updateCheckItem,
} from '@tuoyu/shared/api/mes/equipment';
import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';
import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { toCheckItemForm, toCheckItemValues, useFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

/** 编辑时的点检项目 ID；新增时为空 */
const checkItemId = ref<string>();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-4',
});

/** 加载状态字典与已有的设备类型（单选框只需要文字与值） */
async function loadOptions() {
  const [status, types] = await Promise.all([
    getDictOptions(DictType.NORMAL_DISABLE),
    getDeviceTypes().catch(() => [] as string[]),
  ]);
  formApi.updateSchema([
    {
      componentProps: {
        options: status.map(({ label, value }) => ({ label, value })),
      },
      fieldName: 'status',
    },
    {
      componentProps: {
        options: types.map((value) => ({ label: value, value })),
      },
      fieldName: 'deviceType',
    },
  ]);
}

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    const { error, form } = toCheckItemForm(await formApi.getValues());
    if (error) {
      ElMessage.warning($t(error));
      return;
    }
    drawerApi.lock();
    try {
      await (checkItemId.value
        ? updateCheckItem({ ...form, checkItemId: checkItemId.value })
        : addCheckItem(form));
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
    const data = drawerApi.getData() as undefined | { checkItemId?: string };
    checkItemId.value = data?.checkItemId;
    await formApi.resetForm();
    drawerApi.lock();
    try {
      await loadOptions();
      if (checkItemId.value) {
        await formApi.setValues(
          toCheckItemValues(await getCheckItem(checkItemId.value)),
        );
      }
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  checkItemId.value
    ? $t('mes.equipment.checkItem.edit')
    : $t('mes.equipment.checkItem.create'),
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
