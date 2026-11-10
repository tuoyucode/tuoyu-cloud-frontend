<script lang="ts" setup>
import type { EquipmentApi } from '@tuoyu/shared/api/mes/equipment';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { getMaintenanceOrder } from '@tuoyu/shared/api/mes/equipment';
import { Descriptions, DescriptionsItem, Tag } from 'ant-design-vue';

import { $t } from '#/locales';

import EquipmentTag from '../common/equipment-tag.vue';

/** 保养工单详情 */
const order = ref<EquipmentApi.MaintenanceOrder>();

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
    <Descriptions
      v-if="order"
      :column="{ xs: 1, sm: 2, xl: 3 }"
      bordered
      size="small"
    >
      <DescriptionsItem :label="$t('mes.equipment.maintenanceOrder.orderCode')">
        {{ order.orderCode }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.equipment.maintenanceOrder.status')">
        <EquipmentTag
          :value="order.orderStatus"
          type="MaintenanceOrderStatus"
        />
        <Tag v-if="order.overdue" color="error">
          {{ $t('mes.equipment.common.overdue') }}
        </Tag>
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.equipment.maintenanceOrder.dueDate')">
        {{ order.dueDate }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.equipment.common.device')">
        {{ order.deviceCode }} {{ order.deviceName }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.equipment.maintenanceOrder.plan')">
        {{ order.planName }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.equipment.maintenanceOrder.executor')">
        {{ order.executorName }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.equipment.maintenanceOrder.startTime')">
        {{ order.startTime }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('mes.equipment.maintenanceOrder.finishTime')"
      >
        {{ order.finishTime }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('mes.equipment.maintenanceOrder.workMinutes')"
      >
        {{ order.workMinutes }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('mes.equipment.maintenanceOrder.maintenanceContent')"
        :span="3"
      >
        <span class="whitespace-pre-wrap">{{ order.maintenanceContent }}</span>
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('mes.equipment.maintenanceOrder.actualContent')"
        :span="3"
      >
        <span class="whitespace-pre-wrap">{{ order.actualContent }}</span>
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('mes.equipment.maintenanceOrder.spareParts')"
        :span="3"
      >
        {{ order.spareParts }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('crud.remark')" :span="3">
        {{ order.remark }}
      </DescriptionsItem>
    </Descriptions>
  </Drawer>
</template>
