<script lang="ts" setup>
import type { MaterialRequestApi } from '@tuoyu/shared/api/mes/materialRequest';

import { computed } from 'vue';

import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
import {
  ElDescriptions,
  ElDescriptionsItem,
  ElTable,
  ElTableColumn,
} from 'element-plus';

import { $t } from '#/locales';
import EnumTag from '#/views/mes/_shared/enum-tag.vue';

import { formatQty } from './data';

/**
 * 领退料单的表头与明细（物料、需求数、申请数、实发数、批次、库位）。
 * 单据详情抽屉与流程办理中的“业务详情”共用
 */
defineProps<{ detail: MaterialRequestApi.Request }>();

/** 表头的列数：小屏 1 列，中屏及以上 3 列 */
const breakpoints = useBreakpoints(breakpointsTailwind);
const isMd = breakpoints.greaterOrEqual('md');
const descColumns = computed(() => (isMd.value ? 3 : 1));

/** 明细中按数量显示的列 */
const QTY_COLUMNS = [
  { label: 'mes.materialRequest.planQty', prop: 'planQty' },
  { label: 'mes.materialRequest.requestQty', prop: 'requestQty' },
  { label: 'mes.materialRequest.actualQty', prop: 'actualQty' },
] as const;
</script>

<template>
  <div>
    <ElDescriptions :column="descColumns" border size="small">
      <ElDescriptionsItem :label="$t('mes.materialRequest.requestCode')">
        {{ detail.requestCode }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.materialRequest.requestType')">
        <EnumTag :value="detail.requestType" type="MaterialRequestType" />
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.materialRequest.requestStatus')">
        <EnumTag :value="detail.requestStatus" type="MaterialRequestStatus" />
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.materialRequest.workorderCode')">
        {{ detail.workorderCode }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.materialRequest.productName')">
        {{ detail.productName }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.materialRequest.warehouse')">
        {{ detail.warehouseName }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.materialRequest.submitTime')">
        {{ detail.submitTime }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.materialRequest.completeTime')">
        {{ detail.completeTime }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.materialRequest.operator')">
        {{ detail.operatorUserName }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('crud.remark')" :span="3">
        {{ detail.remark }}
      </ElDescriptionsItem>
    </ElDescriptions>
    <div class="mb-2 mt-4 font-medium">
      {{ $t('mes.materialRequest.items') }}
    </div>
    <ElTable :data="detail.items ?? []" row-key="itemId" size="small">
      <ElTableColumn
        :label="$t('mes.materialRequest.materialCode')"
        prop="materialCode"
        width="120"
      />
      <ElTableColumn
        :label="$t('mes.materialRequest.materialName')"
        min-width="140"
        prop="materialName"
      />
      <ElTableColumn
        :label="$t('mes.materialRequest.unit')"
        prop="unit"
        width="70"
      />
      <ElTableColumn
        v-for="column in QTY_COLUMNS"
        :key="column.prop"
        :label="$t(column.label)"
        width="100"
      >
        <template #default="{ row }">
          <span class="tabular-nums">{{ formatQty(row[column.prop]) }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn
        :label="$t('mes.materialRequest.batchCode')"
        prop="batchCode"
        width="130"
      />
      <ElTableColumn
        :label="$t('mes.materialRequest.location')"
        prop="locationName"
        width="120"
      />
    </ElTable>
  </div>
</template>
