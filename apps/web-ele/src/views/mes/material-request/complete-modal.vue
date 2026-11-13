<script lang="ts" setup>
import type { MaterialRequestApi } from '@tuoyu/shared/api/mes/materialRequest';
import type { BatchRow } from '@tuoyu/shared/pages/mes/material-request';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  completeMaterialRequest,
  getMaterialRequest,
} from '@tuoyu/shared/api/mes/materialRequest';
import { trimFixedDecimal } from '@tuoyu/shared/pages/mes/decimal';
import {
  batchRequired,
  firstMissingBatch,
} from '@tuoyu/shared/pages/mes/material-request';
import {
  ElInput,
  ElInputNumber,
  ElMessage,
  ElSelectV2,
  ElTable,
  ElTableColumn,
} from 'element-plus';

import { $t } from '#/locales';

import { formatQty, loadLocationOptions } from './data';

/** 完成时逐行填写的实发（实退）数量，默认等于申请数量 */
interface CompleteRow {
  actualQty?: null | number;
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

/** 必须填写却还没有填写批次号的行，输入框以警示色标出 */
function batchMissing(row: BatchRow) {
  return batchRequired(row) && !row.batchCode?.trim();
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (!request.value) {
      return;
    }
    const missing = rows.value.findIndex(
      (row) => row.actualQty === undefined || row.actualQty === null,
    );
    if (missing !== -1) {
      ElMessage.warning(
        $t('mes.materialRequest.actualQtyRequired', { line: missing + 1 }),
      );
      return;
    }
    const missingBatch = firstMissingBatch(rows.value);
    if (missingBatch !== -1) {
      ElMessage.warning(
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
          locationId: row.locationId || undefined,
        })),
      );
      ElMessage.success($t('mes.materialRequest.completed'));
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

/** 数量框的显示：失去焦点后去掉末尾多余的 0 */
const qtyFormatter = trimFixedDecimal(6);
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
    <ElTable :data="rows" row-key="itemId" size="small">
      <ElTableColumn
        :label="$t('mes.materialRequest.material')"
        min-width="160"
      >
        <template #default="{ row }">
          <span
            v-if="row.traceMode === 'batch'"
            :title="$t('mes.materialRequest.batchTraced')"
            class="text-destructive mr-1"
          >
            *
          </span>
          {{ row.materialCode }} {{ row.materialName }}
          <span v-if="row.unit" class="text-muted-foreground">
            （{{ row.unit }}）
          </span>
        </template>
      </ElTableColumn>
      <ElTableColumn :label="$t('mes.materialRequest.requestQty')" width="110">
        <template #default="{ row }">
          <span class="tabular-nums">{{ formatQty(row.requestQty) }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn
        :label="
          isReturn
            ? $t('mes.materialRequest.actualReturnQty')
            : $t('mes.materialRequest.actualQty')
        "
        width="150"
      >
        <template #default="{ row }">
          <ElInputNumber
            v-model="row.actualQty"
            :formatter="qtyFormatter"
            :min="0"
            :precision="6"
            class="!w-full"
            controls-position="right"
          />
        </template>
      </ElTableColumn>
      <ElTableColumn :label="$t('mes.materialRequest.batchCode')" width="150">
        <template #default="{ row }">
          <ElInput
            v-model="row.batchCode"
            :class="{ 'batch-missing': batchMissing(row) }"
            :maxlength="64"
            :placeholder="
              row.traceMode === 'batch'
                ? $t('mes.materialRequest.batchTraced')
                : $t('crud.inputPlaceholder')
            "
          />
        </template>
      </ElTableColumn>
      <ElTableColumn :label="$t('mes.materialRequest.location')" width="160">
        <template #default="{ row }">
          <ElSelectV2
            v-model="row.locationId"
            :options="locationOptions"
            :placeholder="$t('crud.selectPlaceholder')"
            class="w-full"
            clearable
          />
        </template>
      </ElTableColumn>
    </ElTable>
    <p v-if="hasBatchTraced" class="text-muted-foreground mt-3 text-sm">
      {{ $t('mes.materialRequest.batchTracedHint') }}
    </p>
    <p v-if="isReturn" class="text-muted-foreground mt-3 text-sm">
      {{ $t('mes.materialRequest.returnLimitHint') }}
    </p>
  </Modal>
</template>

<style scoped>
/* 按批次追溯却没有填写批次号：警示色边框 */
.batch-missing :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-warning) inset;
}
</style>
