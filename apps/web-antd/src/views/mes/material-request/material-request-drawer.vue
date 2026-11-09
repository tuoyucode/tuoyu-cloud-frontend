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
import {
  Button,
  Input,
  InputNumber,
  message,
  Select,
  Table,
} from 'ant-design-vue';

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
  requestQty?: number;
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

const itemColumns = computed(() => [
  {
    dataIndex: 'materialId',
    key: 'materialId',
    title: $t('mes.materialRequest.material'),
    width: 260,
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
    width: 130,
  },
  {
    dataIndex: 'batchCode',
    key: 'batchCode',
    title: $t('mes.materialRequest.batchCode'),
    width: 140,
  },
  {
    dataIndex: 'locationId',
    key: 'locationId',
    title: $t('mes.materialRequest.location'),
    width: 160,
  },
  {
    dataIndex: 'remark',
    key: 'remark',
    title: $t('crud.remark'),
  },
  { key: 'actions', title: '', width: 60 },
]);

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
    message.warning($t('mes.materialRequest.itemsRequired'));
    return false;
  }
  const seen = new Set<string>();
  for (const [index, row] of items.value.entries()) {
    const line = index + 1;
    if (!row.materialId) {
      message.warning($t('mes.materialRequest.itemMaterialRequired', { line }));
      return false;
    }
    if (!row.requestQty || row.requestQty <= 0) {
      message.warning($t('mes.materialRequest.itemQtyRequired', { line }));
      return false;
    }
    if (seen.has(row.materialId)) {
      message.warning($t('mes.materialRequest.itemDuplicate', { line }));
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
          locationId: row.locationId,
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
      message.success($t('crud.saved'));
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
      <Button size="small" type="primary" ghost @click="addRow">
        {{ $t('mes.materialRequest.addItem') }}
      </Button>
    </div>
    <Table
      :columns="itemColumns"
      :data-source="items"
      :pagination="false"
      :scroll="{ x: 960 }"
      row-key="key"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <Select
          v-if="column.key === 'materialId'"
          v-model:value="record.materialId"
          :filter-option="false"
          :loading="materialSearching"
          :options="materialOptions"
          :placeholder="$t('mes.materialRequest.materialPlaceholder')"
          class="w-full"
          show-search
          @search="onMaterialSearch"
        />
        <span v-else-if="column.key === 'planQty'" class="tabular-nums">
          {{ formatQty(record.planQty) }}
        </span>
        <InputNumber
          v-else-if="column.key === 'requestQty'"
          v-model:value="record.requestQty"
          :min="0"
          :precision="6"
          :step="1"
          class="w-full"
        />
        <Input
          v-else-if="column.key === 'batchCode'"
          v-model:value="record.batchCode"
          :maxlength="64"
          :placeholder="$t('crud.inputPlaceholder')"
        />
        <Select
          v-else-if="column.key === 'locationId'"
          v-model:value="record.locationId"
          :options="locationOptions"
          :placeholder="$t('crud.selectPlaceholder')"
          allow-clear
          class="w-full"
        />
        <Input
          v-else-if="column.key === 'remark'"
          v-model:value="record.remark"
          :maxlength="500"
        />
        <Button
          v-else-if="column.key === 'actions'"
          :aria-label="$t('mes.materialRequest.removeItem')"
          danger
          size="small"
          type="link"
          @click="removeRow(record.key)"
        >
          {{ $t('common.delete') }}
        </Button>
      </template>
    </Table>
  </Drawer>
</template>
