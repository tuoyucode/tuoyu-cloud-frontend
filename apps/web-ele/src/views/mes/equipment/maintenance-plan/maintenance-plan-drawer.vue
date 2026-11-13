<script lang="ts" setup>
import type { EquipmentApi } from '@tuoyu/shared/api/mes/equipment';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  addMaintenancePlan,
  getMaintenancePlan,
  updateMaintenancePlan,
} from '@tuoyu/shared/api/mes/equipment';
import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';
import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { useFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

/** 编辑时的计划 ID；新增时为空 */
const planId = ref<string>();

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
    const values =
      (await formApi.getValues()) as EquipmentApi.MaintenancePlanForm;
    if (
      values.leadDays !== undefined &&
      values.leadDays !== null &&
      values.leadDays >= values.cycleDays
    ) {
      ElMessage.warning($t('mes.equipment.maintenancePlan.leadDaysHelp'));
      return;
    }
    drawerApi.lock();
    try {
      await (planId.value
        ? updateMaintenancePlan({ ...values, planId: planId.value })
        : addMaintenancePlan(values));
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
    const data = drawerApi.getData() as undefined | { planId?: string };
    planId.value = data?.planId;
    await formApi.resetForm();
    drawerApi.lock();
    try {
      const status = await getDictOptions(DictType.NORMAL_DISABLE);
      formApi.updateSchema([
        {
          // 单选框只需要文字与值
          componentProps: {
            options: status.map(({ label, value }) => ({ label, value })),
          },
          fieldName: 'status',
        },
        // 修改时必须有下次到期日期；新增时可以留空，由后端计算
        { fieldName: 'nextDueDate', rules: planId.value ? 'required' : null },
      ]);
      if (planId.value) {
        await formApi.setValues(await getMaintenancePlan(planId.value));
      }
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  planId.value
    ? $t('mes.equipment.maintenancePlan.edit')
    : $t('mes.equipment.maintenancePlan.create'),
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
