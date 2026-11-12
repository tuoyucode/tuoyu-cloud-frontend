<script lang="ts" setup>
import type { MaterialRequestApi } from '@tuoyu/shared/api/mes/materialRequest';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  completeMaterialRequest,
  getMaterialRequest,
} from '@tuoyu/shared/api/mes/materialRequest';
import { Input, InputNumber, message, Select, Table } from 'ant-design-vue';

import { $t } from '#/locales';

import { trimDecimal } from '../_shared/decimal';
import { batchRequired, firstMissingBatch } from './complete';
import { formatQty, loadLocationOptions } from './data';

/** 完成时逐行填写的实发（实退）数量，默认等于申请数量 */
interface CompleteRow {
  actualQty?: number;
  batchCode?: string;
  itemId: string;
  locationId?: string;
  materialCode?: string;
  materialName?: string;
  requestQty: number;
  /** 物料的追溯方式，按批次追溯（batch）时实发数量大于 0 必须填写批次号 */
  traceMode?: string;
  unit?: string;
}

const emit = defineEmits<{ success: [] }>();

const request = ref<MaterialRequestApi.Request>();
const rows = ref<CompleteRow[]>([]);
const locationOptions = ref<{ label: string; value: string }[]>([]);

const isReturn = computed(() => request.value?.requestType === 'return');
const hasBatchTraced = computed(() =>
  rows.value.some((row) => row.traceMode === 'batch'),
);

const columns = computed(() => [
  {
    dataIndex: 'materialName',
    key: 'material',
    title: $t('mes.materialRequest.material'),
  },
  {
    dataIndex: 'requestQty',
    key: 'requestQty',
    title: $t('mes.materialRequest.requestQty'),
    width: 110,
  },
  {
    dataIndex: 'actualQty',
    key: 'actualQty',
    title: isReturn.value
      ? $t('mes.materialRequest.actualReturnQty')
      : $t('mes.materialRequest.actualQty'),
    width: 140,
  },
  {
    dataIndex: 'batchCode',
    key: 'batchCode',
    title: $t('mes.materialRequest.batchCode'),
    width: 150,
  },
  {
    dataIndex: 'locationId',
    key: 'locationId',
    title: $t('mes.materialRequest.location'),
    width: 160,
  },
]);

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (!request.value) {
      return;
    }
    const missing = rows.value.findIndex(
      (row) => row.actualQty === undefined || row.actualQty === null,
    );
    if (missing !== -1) {
      message.warning(
        $t('mes.materialRequest.actualQtyRequired', { line: missing + 1 }),
      );
      return;
    }
    const missingBatch = firstMissingBatch(rows.value);
    if (missingBatch !== -1) {
      message.warning(
        $t('mes.materialRequest.batchCodeRequired', { line: missingBatch + 1 }),
      );
      return;
    }
    modalApi.lock();
    try {
      await completeMaterialRequest(
        request.value.requestId,
        rows.value.map((row) => ({
          actualQty: row.actualQty as number,
          batchCode: row.batchCode?.trim() || undefined,
          itemId: row.itemId,
          locationId: row.locationId,
        })),
      );
      message.success($t('mes.materialRequest.completed'));
      emit('success');
      modalApi.close();
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    const { requestId } = modalApi.getData() as { requestId: string };
    request.value = undefined;
    rows.value = [];
    modalApi.lock();
    try {
      const detail = await getMaterialRequest(requestId);
      request.value = detail;
      locationOptions.value = await loadLocationOptions({
        warehouseId: detail.warehouseId,
      });
      rows.value = (detail.items ?? []).map((item) => ({
        actualQty: Number(item.requestQty),
        batchCode: item.batchCode,
        itemId: item.itemId,
        locationId: item.locationId,
        materialCode: item.materialCode,
        materialName: item.materialName,
        requestQty: item.requestQty,
        traceMode: item.traceMode,
        unit: item.unit,
      }));
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal
    :confirm-text="$t('mes.materialRequest.complete')"
    :title="$t('mes.materialRequest.completeTitle')"
    class="w-full max-w-[900px]"
  >
    <p v-if="request" class="text-muted-foreground mb-3">
      {{
        $t('mes.materialRequest.completeHint', {
          code: request.requestCode,
          warehouse: request.warehouseName ?? '',
        })
      }}
    </p>
    <Table
      :columns="columns"
      :data-source="rows"
      :pagination="false"
      row-key="itemId"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <span v-if="column.key === 'material'">
          <span
            v-if="record.traceMode === 'batch'"
            :title="$t('mes.materialRequest.batchTraced')"
            class="text-destructive mr-1"
          >
            *
          </span>
          {{ record.materialCode }} {{ record.materialName }}
          <span v-if="record.unit" class="text-muted-foreground">
            （{{ record.unit }}）
          </span>
        </span>
        <span v-else-if="column.key === 'requestQty'" class="tabular-nums">
          {{ formatQty(record.requestQty) }}
        </span>
        <InputNumber
          v-else-if="column.key === 'actualQty'"
          v-model:value="record.actualQty"
          :min="0"
          :precision="6"
          :formatter="trimDecimal"
          class="w-full"
        />
        <Input
          v-else-if="column.key === 'batchCode'"
          v-model:value="record.batchCode"
          :maxlength="64"
          :placeholder="
            record.traceMode === 'batch'
              ? $t('mes.materialRequest.batchTraced')
              : $t('crud.inputPlaceholder')
          "
          :status="
            batchRequired(record) && !record.batchCode?.trim()
              ? 'warning'
              : undefined
          "
        />
        <Select
          v-else-if="column.key === 'locationId'"
          v-model:value="record.locationId"
          :options="locationOptions"
          :placeholder="$t('crud.selectPlaceholder')"
          allow-clear
          class="w-full"
        />
      </template>
    </Table>
    <p v-if="hasBatchTraced" class="text-muted-foreground mt-3 text-sm">
      {{ $t('mes.materialRequest.batchTracedHint') }}
    </p>
    <p v-if="isReturn" class="text-muted-foreground mt-3 text-sm">
      {{ $t('mes.materialRequest.returnLimitHint') }}
    </p>
  </Modal>
</template>
