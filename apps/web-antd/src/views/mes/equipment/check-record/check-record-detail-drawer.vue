<script lang="ts" setup>
import type { EquipmentApi } from '@tuoyu/shared/api/mes/equipment';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { getCheckRecord } from '@tuoyu/shared/api/mes/equipment';
import { Descriptions, DescriptionsItem, Table, Tag } from 'ant-design-vue';

import { $t } from '#/locales';

import EquipmentTag from '../common/equipment-tag.vue';
import { formatDecimal, limitsText } from '../common/utils';

/** 点检详情：基本信息与逐项结果 */
const record = ref<EquipmentApi.CheckRecord>();

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
      <Descriptions :column="{ xs: 1, sm: 2, xl: 3 }" bordered size="small">
        <DescriptionsItem :label="$t('mes.equipment.checkRecord.recordCode')">
          {{ record.recordCode }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.equipment.common.device')">
          {{ record.deviceCode }} {{ record.deviceName }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.equipment.checkRecord.checkResult')">
          <EquipmentTag :value="record.checkResult" type="CheckResult" />
          <span v-if="record.abnormalCount > 0">
            {{ $t('mes.equipment.checkRecord.abnormalCount') }}
            {{ record.abnormalCount }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.equipment.checkRecord.recordStatus')">
          <EquipmentTag :value="record.recordStatus" type="CheckRecordStatus" />
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.equipment.checkRecord.checker')">
          {{ record.checkerName }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.equipment.checkRecord.checkTime')">
          {{ record.checkTime }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.equipment.checkRecord.andonRaised')">
          <template v-if="record.andonRaised === 'Y'">
            {{ $t('mes.equipment.common.yes') }} · {{ record.andonTime }}
          </template>
          <template v-else>{{ $t('mes.equipment.common.no') }}</template>
        </DescriptionsItem>
        <DescriptionsItem
          v-if="record.voidReason"
          :label="$t('mes.equipment.checkRecord.voidReason')"
        >
          {{ record.voidReason }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('crud.remark')">
          {{ record.remark }}
        </DescriptionsItem>
      </Descriptions>

      <div class="mb-2 mt-4 font-medium">
        {{ $t('mes.equipment.checkRecord.items') }}
      </div>
      <Table
        :columns="columns"
        :data-source="record.details ?? []"
        :pagination="false"
        row-key="detailId"
        size="small"
      >
        <template #bodyCell="{ column, record: row }">
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
            <Tag v-else>{{ $t('mes.equipment.checkRecord.notChecked') }}</Tag>
          </template>
        </template>
      </Table>
    </template>
  </Drawer>
</template>
