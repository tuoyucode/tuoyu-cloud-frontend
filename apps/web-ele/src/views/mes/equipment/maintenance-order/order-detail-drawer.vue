<script lang="ts" setup>
import type { EquipmentApi } from '@tuoyu/shared/api/mes/equipment';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { getMaintenanceOrder } from '@tuoyu/shared/api/mes/equipment';
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
import { ElDescriptions, ElDescriptionsItem, ElTag } from 'element-plus';

import { $t } from '#/locales';

import EquipmentTag from '../common/equipment-tag.vue';

/** 保养工单详情 */
const order = ref<EquipmentApi.MaintenanceOrder>();

/** 描述列表的列数：窄屏 1 列，sm 2 列，xl 3 列；长文本占满一行 */
const breakpoints = useBreakpoints(breakpointsTailwind);
const isSm = breakpoints.greaterOrEqual('sm');
const isXl = breakpoints.greaterOrEqual('xl');
const descColumns = computed(() => {
  if (isXl.value) {
    return 3;
  }
  return isSm.value ? 2 : 1;
});

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    const { orderId } = drawerApi.getData() as { orderId: string };
    order.value = undefined;
    drawerApi.lock();
    try {
      order.value = await getMaintenanceOrder(orderId);
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  order.value
    ? `${$t('mes.equipment.maintenanceOrder.detail')} ${order.value.orderCode}`
    : $t('mes.equipment.maintenanceOrder.detail'),
);
</script>

<template>
  <Drawer :title="title" class="w-full max-w-[860px]">
    <ElDescriptions v-if="order" :column="descColumns" border size="small">
      <ElDescriptionsItem
        :label="$t('mes.equipment.maintenanceOrder.orderCode')"
      >
        {{ order.orderCode }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.equipment.maintenanceOrder.status')">
        <div class="flex flex-wrap items-center gap-2">
          <EquipmentTag
            :value="order.orderStatus"
            type="MaintenanceOrderStatus"
          />
          <ElTag v-if="order.overdue" type="danger">
            {{ $t('mes.equipment.common.overdue') }}
          </ElTag>
        </div>
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.equipment.maintenanceOrder.dueDate')">
        {{ order.dueDate }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.equipment.common.device')">
        {{ order.deviceCode }} {{ order.deviceName }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.equipment.maintenanceOrder.plan')">
        {{ order.planName }}
      </ElDescriptionsItem>
      <ElDescriptionsItem
        :label="$t('mes.equipment.maintenanceOrder.executor')"
      >
        {{ order.executorName }}
      </ElDescriptionsItem>
      <ElDescriptionsItem
        :label="$t('mes.equipment.maintenanceOrder.startTime')"
      >
        {{ order.startTime }}
      </ElDescriptionsItem>
      <ElDescriptionsItem
        :label="$t('mes.equipment.maintenanceOrder.finishTime')"
      >
        {{ order.finishTime }}
      </ElDescriptionsItem>
      <ElDescriptionsItem
        :label="$t('mes.equipment.maintenanceOrder.workMinutes')"
      >
        {{ order.workMinutes }}
      </ElDescriptionsItem>
      <ElDescriptionsItem
        :label="$t('mes.equipment.maintenanceOrder.maintenanceContent')"
        :span="descColumns"
      >
        <span class="whitespace-pre-wrap">{{ order.maintenanceContent }}</span>
      </ElDescriptionsItem>
      <ElDescriptionsItem
        :label="$t('mes.equipment.maintenanceOrder.actualContent')"
        :span="descColumns"
      >
        <span class="whitespace-pre-wrap">{{ order.actualContent }}</span>
      </ElDescriptionsItem>
      <ElDescriptionsItem
        :label="$t('mes.equipment.maintenanceOrder.spareParts')"
        :span="descColumns"
      >
        {{ order.spareParts }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('crud.remark')" :span="descColumns">
        {{ order.remark }}
      </ElDescriptionsItem>
    </ElDescriptions>
  </Drawer>
</template>
