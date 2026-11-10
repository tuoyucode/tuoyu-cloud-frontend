<script lang="ts" setup>
import type { MaterialRequestApi } from '@tuoyu/shared/api/mes/materialRequest';

import { computed } from 'vue';

import { Descriptions, DescriptionsItem, Table } from 'ant-design-vue';

import { $t } from '#/locales';
import EnumTag from '#/views/mes/_shared/enum-tag.vue';

import { formatQty } from './data';

/**
 * 领退料单的表头与明细（物料、需求数、申请数、实发数、批次、库位）。
 * 单据详情抽屉与流程办理中的“业务详情”共用
 */
defineProps<{ detail: MaterialRequestApi.Request }>();

const columns = computed(() => [
  {
    dataIndex: 'materialCode',
    key: 'materialCode',
    title: $t('mes.materialRequest.materialCode'),
    width: 120,
  },
  {
    dataIndex: 'materialName',
    key: 'materialName',
    title: $t('mes.materialRequest.materialName'),
  },
  {
    dataIndex: 'unit',
    key: 'unit',
    title: $t('mes.materialRequest.unit'),
    width: 70,
  },
  {
    dataIndex: 'planQty',
    key: 'planQty',
    title: $t('mes.materialRequest.planQty'),
    width: 100,
  },
  {
    dataIndex: 'requestQty',
    key: 'requestQty',
    title: $t('mes.materialRequest.requestQty'),
    width: 100,
  },
  {
    dataIndex: 'actualQty',
    key: 'actualQty',
    title: $t('mes.materialRequest.actualQty'),
    width: 100,
  },
  {
    dataIndex: 'batchCode',
    key: 'batchCode',
    title: $t('mes.materialRequest.batchCode'),
    width: 130,
  },
  {
    dataIndex: 'locationName',
    key: 'locationName',
    title: $t('mes.materialRequest.location'),
    width: 120,
  },
]);

const QTY_KEYS = new Set(['actualQty', 'planQty', 'requestQty']);
</script>

<template>
  <div>
    <Descriptions :column="{ xs: 1, md: 3 }" bordered size="small">
      <DescriptionsItem :label="$t('mes.materialRequest.requestCode')">
        {{ detail.requestCode }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.materialRequest.requestType')">
        <EnumTag :value="detail.requestType" type="MaterialRequestType" />
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.materialRequest.requestStatus')">
        <EnumTag :value="detail.requestStatus" type="MaterialRequestStatus" />
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.materialRequest.workorderCode')">
        {{ detail.workorderCode }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.materialRequest.productName')">
        {{ detail.productName }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.materialRequest.warehouse')">
        {{ detail.warehouseName }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.materialRequest.submitTime')">
        {{ detail.submitTime }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.materialRequest.completeTime')">
        {{ detail.completeTime }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.materialRequest.operator')">
        {{ detail.operatorUserName }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('crud.remark')" :span="3">
        {{ detail.remark }}
      </DescriptionsItem>
    </Descriptions>
    <div class="mb-2 mt-4 font-medium">
      {{ $t('mes.materialRequest.items') }}
    </div>
    <Table
      :columns="columns"
      :data-source="detail.items ?? []"
      :pagination="false"
      row-key="itemId"
      size="small"
    >
      <template #bodyCell="{ column, text }">
        <span v-if="QTY_KEYS.has(String(column.key))" class="tabular-nums">
          {{ formatQty(text) }}
        </span>
        <template v-else>{{ text }}</template>
      </template>
    </Table>
  </div>
</template>
