<script lang="ts" setup>
import type { EquipmentApi } from '@tuoyu/shared/api/mes/equipment';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { getCheckRecord } from '@tuoyu/shared/api/mes/equipment';
import {
  formatDecimal,
  limitsText,
} from '@tuoyu/shared/pages/mes/equipment-utils';
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
import {
  ElDescriptions,
  ElDescriptionsItem,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { $t } from '#/locales';

import EquipmentTag from '../common/equipment-tag.vue';

/** 点检详情：基本信息与逐项结果 */
const record = ref<EquipmentApi.CheckRecord>();

/** 描述列表的列数：窄屏 1 列，sm 2 列，xl 3 列 */
const breakpoints = useBreakpoints(breakpointsTailwind);
const isSm = breakpoints.greaterOrEqual('sm');
const isXl = breakpoints.greaterOrEqual('xl');
const descColumns = computed(() => {
  if (isXl.value) {
    return 3;
  }
  return isSm.value ? 2 : 1;
});

const columns = computed(() => [
  {
    dataIndex: 'itemName',
    key: 'itemName',
    title: $t('mes.equipment.checkItem.itemName'),
  },
  {
    dataIndex: 'checkStandard',
    key: 'checkStandard',
    title: $t('mes.equipment.checkItem.checkStandard'),
  },
  { key: 'limits', title: $t('mes.equipment.checkItem.limits') },
  {
    key: 'measuredValue',
    title: $t('mes.equipment.checkRecord.measuredValue'),
  },
  { key: 'itemResult', title: $t('mes.equipment.checkRecord.result') },
  {
    dataIndex: 'remark',
    key: 'remark',
    title: $t('mes.equipment.checkRecord.itemRemark'),
  },
]);

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    const { checkRecordId } = drawerApi.getData() as { checkRecordId: string };
    record.value = undefined;
    drawerApi.lock();
    try {
      record.value = await getCheckRecord(checkRecordId);
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  record.value
    ? `${$t('mes.equipment.checkRecord.detail')} ${record.value.recordCode}`
    : $t('mes.equipment.checkRecord.detail'),
);

function detailOf(row: Record<string, any>) {
  return row as EquipmentApi.CheckRecordDetail;
}
</script>

<template>
  <Drawer :title="title" class="w-full max-w-[960px]">
    <template v-if="record">
      <ElDescriptions :column="descColumns" border size="small">
        <ElDescriptionsItem :label="$t('mes.equipment.checkRecord.recordCode')">
          {{ record.recordCode }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.equipment.common.device')">
          {{ record.deviceCode }} {{ record.deviceName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem
          :label="$t('mes.equipment.checkRecord.checkResult')"
        >
          <div class="flex flex-wrap items-center gap-2">
            <EquipmentTag :value="record.checkResult" type="CheckResult" />
            <span v-if="record.abnormalCount > 0">
              {{ $t('mes.equipment.checkRecord.abnormalCount') }}
              {{ record.abnormalCount }}
            </span>
          </div>
        </ElDescriptionsItem>
        <ElDescriptionsItem
          :label="$t('mes.equipment.checkRecord.recordStatus')"
        >
          <EquipmentTag :value="record.recordStatus" type="CheckRecordStatus" />
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.equipment.checkRecord.checker')">
          {{ record.checkerName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.equipment.checkRecord.checkTime')">
          {{ record.checkTime }}
        </ElDescriptionsItem>
        <ElDescriptionsItem
          :label="$t('mes.equipment.checkRecord.andonRaised')"
        >
          <template v-if="record.andonRaised === 'Y'">
            {{ $t('mes.equipment.common.yes') }} · {{ record.andonTime }}
          </template>
          <template v-else>{{ $t('mes.equipment.common.no') }}</template>
        </ElDescriptionsItem>
        <ElDescriptionsItem
          v-if="record.voidReason"
          :label="$t('mes.equipment.checkRecord.voidReason')"
        >
          {{ record.voidReason }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('crud.remark')">
          {{ record.remark }}
        </ElDescriptionsItem>
      </ElDescriptions>

      <div class="mb-2 mt-4 font-medium">
        {{ $t('mes.equipment.checkRecord.items') }}
      </div>
      <ElTable :data="record.details ?? []" row-key="detailId" size="small">
        <ElTableColumn
          v-for="column in columns"
          :key="column.key"
          :label="column.title"
          min-width="100"
        >
          <template #default="{ row }">
            <template v-if="column.key === 'itemName'">
              <span
                v-if="detailOf(row).mandatory === 'Y'"
                class="text-destructive mr-1"
              >
                *
              </span>
              {{ detailOf(row).itemName }}
            </template>
            <template v-else-if="column.key === 'limits'">
              {{
                limitsText(
                  detailOf(row).lowerLimit,
                  detailOf(row).upperLimit,
                  detailOf(row).unit,
                )
              }}
            </template>
            <template v-else-if="column.key === 'measuredValue'">
              {{ formatDecimal(detailOf(row).measuredValue) }}
              <template
                v-if="
                  detailOf(row).measuredValue !== null &&
                  detailOf(row).measuredValue !== undefined
                "
              >
                {{ detailOf(row).unit }}
              </template>
            </template>
            <template v-else-if="column.key === 'itemResult'">
              <EquipmentTag
                v-if="detailOf(row).itemResult"
                :value="detailOf(row).itemResult"
                type="CheckItemResult"
              />
              <ElTag v-else type="info">
                {{ $t('mes.equipment.checkRecord.notChecked') }}
              </ElTag>
            </template>
            <template v-else-if="column.dataIndex">
              {{ row[column.dataIndex] }}
            </template>
          </template>
        </ElTableColumn>
      </ElTable>
    </template>
  </Drawer>
</template>
