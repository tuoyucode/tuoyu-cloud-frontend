<script lang="ts" setup>
import type { MaterialRequestApi } from '@tuoyu/shared/api/mes/materialRequest';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { getMesOptions, toSelectOptions } from '@tuoyu/shared/api/mes/common';
import {
  addMaterialRequest,
  getMaterialRequest,
  updateMaterialRequest,
} from '@tuoyu/shared/api/mes/materialRequest';
import { trimFixedDecimal } from '@tuoyu/shared/pages/mes/decimal';
import {
  ElButton,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElSelectV2,
  ElTable,
  ElTableColumn,
} from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { formatQty, loadLocationOptions, useFormSchema } from './data';

interface SelectOption {
  label: string;
  value: string;
}

/** 编辑中的明细行 */
interface ItemRow {
  batchCode?: string;
  key: string;
  locationId?: string;
  materialId?: string;
  planQty?: number;
  remark?: string;
  requestQty?: null | number;
}

const emit = defineEmits<{ success: [] }>();

/** 领料、补料、退料的明细物料：原材料、辅料与半成品 */
const CHILD_MATERIAL_TYPES = 'raw,aux,semi';

/** 编辑时的单据 ID；新增时为空 */
const requestId = ref<string>();
const items = ref<ItemRow[]>([]);
const materialOptions = ref<SelectOption[]>([]);
const locationOptions = ref<SelectOption[]>([]);
const materialSearching = ref(false);
let rowSeq = 0;
let searchTimer: ReturnType<typeof setTimeout> | undefined;
let currentWarehouseId: string | undefined;

function newRow(partial: Partial<ItemRow> = {}): ItemRow {
  rowSeq += 1;
  return { key: `row-${rowSeq}`, ...partial };
}

/** 合并物料选项（搜索结果与已选物料），按 ID 去重 */
function mergeMaterialOptions(options: SelectOption[]) {
  const map = new Map(materialOptions.value.map((item) => [item.value, item]));
  for (const option of options) {
    map.set(option.value, option);
  }
  materialOptions.value = [...map.values()];
}

async function searchMaterials(keyword?: string) {
  materialSearching.value = true;
  try {
    const list = await getMesOptions('material', {
      keyword: keyword?.trim() || undefined,
      materialType: CHILD_MATERIAL_TYPES,
    });
    mergeMaterialOptions(toSelectOptions(list));
  } finally {
    materialSearching.value = false;
  }
}

function onMaterialSearch(keyword: string) {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
  searchTimer = setTimeout(() => searchMaterials(keyword), 300);
}

async function reloadLocations(warehouseId?: string) {
  if (warehouseId === currentWarehouseId) {
    return;
  }
  currentWarehouseId = warehouseId;
  locationOptions.value = await loadLocationOptions({ warehouseId });
  // 换了仓库后，已选的库位不属于新仓库，清空
  const valid = new Set(locationOptions.value.map((item) => item.value));
  for (const row of items.value) {
    if (row.locationId && !valid.has(row.locationId)) {
      row.locationId = undefined;
    }
  }
}

const [Form, formApi] = useVbenForm({
  handleValuesChange(values, fieldsChanged) {
    if (fieldsChanged.includes('warehouseId')) {
      reloadLocations(values.warehouseId as string | undefined);
    }
  },
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-4',
});

function addRow() {
  items.value.push(newRow());
}

function removeRow(key: string) {
  items.value = items.value.filter((row) => row.key !== key);
}

/** 明细校验：至少一行、物料与数量必填、物料不重复 */
function validateItems(): boolean {
  if (items.value.length === 0) {
    ElMessage.warning($t('mes.materialRequest.itemsRequired'));
    return false;
  }
  const seen = new Set<string>();
  for (const [index, row] of items.value.entries()) {
    const line = index + 1;
    if (!row.materialId) {
      ElMessage.warning(
        $t('mes.materialRequest.itemMaterialRequired', { line }),
      );
      return false;
    }
    if (!row.requestQty || row.requestQty <= 0) {
      ElMessage.warning($t('mes.materialRequest.itemQtyRequired', { line }));
      return false;
    }
    if (seen.has(row.materialId)) {
      ElMessage.warning($t('mes.materialRequest.itemDuplicate', { line }));
      return false;
    }
    seen.add(row.materialId);
  }
  return true;
}

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid || !validateItems()) {
      return;
    }
    drawerApi.lock();
    try {
      const values = await formApi.getValues();
      const data: MaterialRequestApi.Form = {
        items: items.value.map((row) => ({
          batchCode: row.batchCode?.trim() || undefined,
          locationId: row.locationId || undefined,
          materialId: row.materialId as string,
          remark: row.remark,
          requestQty: row.requestQty as number,
        })),
        remark: values.remark,
        requestType: values.requestType,
        warehouseId: values.warehouseId,
        workorderId: values.workorderId,
      };
      await (requestId.value
        ? updateMaterialRequest({ ...data, requestId: requestId.value })
        : addMaterialRequest(data));
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
    const data = drawerApi.getData() as undefined | { requestId?: string };
    requestId.value = data?.requestId;
    items.value = [];
    materialOptions.value = [];
    locationOptions.value = [];
    currentWarehouseId = undefined;
    await formApi.resetForm();
    formApi.updateSchema([
      {
        componentProps: { disabled: Boolean(requestId.value) },
        fieldName: 'requestType',
      },
    ]);
    drawerApi.lock();
    try {
      await searchMaterials();
      if (requestId.value) {
        const detail = await getMaterialRequest(requestId.value);
        mergeMaterialOptions(
          (detail.items ?? []).map((item) => ({
            label:
              `${item.materialCode ?? ''} ${item.materialName ?? ''}`.trim(),
            value: item.materialId,
          })),
        );
        await formApi.setValues({
          remark: detail.remark,
          requestType: detail.requestType,
          warehouseId: detail.warehouseId,
          workorderId: detail.workorderId,
        });
        await reloadLocations(detail.warehouseId);
        items.value = (detail.items ?? []).map((item) =>
          newRow({
            batchCode: item.batchCode,
            locationId: item.locationId,
            materialId: item.materialId,
            planQty: item.planQty,
            remark: item.remark,
            requestQty: Number(item.requestQty),
          }),
        );
      } else {
        items.value = [newRow()];
      }
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  requestId.value
    ? $t('mes.materialRequest.edit')
    : $t('mes.materialRequest.create'),
);

/** 数量框的显示：失去焦点后去掉末尾多余的 0 */
const qtyFormatter = trimFixedDecimal(6);
</script>

<template>
  <Drawer
    :confirm-text="$t('crud.save')"
    :title="title"
    class="w-full max-w-[1080px]"
  >
    <Form />
    <div class="mb-2 mt-2 flex items-center justify-between">
      <span class="font-medium">{{ $t('mes.materialRequest.items') }}</span>
      <ElButton plain size="small" type="primary" @click="addRow">
        {{ $t('mes.materialRequest.addItem') }}
      </ElButton>
    </div>
    <ElTable :data="items" row-key="key" size="small">
      <ElTableColumn :label="$t('mes.materialRequest.material')" width="260">
        <template #default="{ row }">
          <ElSelectV2
            v-model="row.materialId"
            :loading="materialSearching"
            :options="materialOptions"
            :placeholder="$t('mes.materialRequest.materialPlaceholder')"
            :remote-method="onMaterialSearch"
            class="w-full"
            filterable
            remote
          />
        </template>
      </ElTableColumn>
      <ElTableColumn :label="$t('mes.materialRequest.planQty')" width="100">
        <template #default="{ row }">
          <span class="tabular-nums">{{ formatQty(row.planQty) }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn :label="$t('mes.materialRequest.requestQty')" width="140">
        <template #default="{ row }">
          <ElInputNumber
            v-model="row.requestQty"
            :formatter="qtyFormatter"
            :min="0"
            :precision="6"
            :step="1"
            class="!w-full"
            controls-position="right"
          />
        </template>
      </ElTableColumn>
      <ElTableColumn :label="$t('mes.materialRequest.batchCode')" width="140">
        <template #default="{ row }">
          <ElInput
            v-model="row.batchCode"
            :maxlength="64"
            :placeholder="$t('crud.inputPlaceholder')"
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
      <ElTableColumn :label="$t('crud.remark')" min-width="140">
        <template #default="{ row }">
          <ElInput v-model="row.remark" :maxlength="500" />
        </template>
      </ElTableColumn>
      <ElTableColumn width="70">
        <template #default="{ row }">
          <ElButton
            :aria-label="$t('mes.materialRequest.removeItem')"
            link
            size="small"
            type="danger"
            @click="removeRow(row.key)"
          >
            {{ $t('common.delete') }}
          </ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
  </Drawer>
</template>
