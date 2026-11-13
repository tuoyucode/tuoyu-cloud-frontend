<script lang="ts" setup>
import type { BomApi } from '@tuoyu/shared/api/mes/bom';
import type { MesApi } from '@tuoyu/shared/api/mes/common';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { addBom, getBom, updateBom } from '@tuoyu/shared/api/mes/bom';
import { trimFixedDecimal } from '@tuoyu/shared/pages/mes/decimal';
import {
  ElAlert,
  ElButton,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElTable,
  ElTableColumn,
} from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import MaterialSelect from '../material/material-select.vue';
import { loadFormOptions, useFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

/** 明细表格中的一行（key 只用于渲染） */
interface ItemRow {
  key: number;
  label?: string;
  lossRate?: number;
  materialId?: string;
  qty?: number;
  remark?: string;
  specification?: string;
  unit?: string;
}

/** 编辑时的物料清单 ID；新增时为空 */
const bomId = ref<string>();
/** 已被工单使用：只能修改表头，产品、基准数量与明细不能修改（与后端规则一致） */
const used = ref(false);
const items = ref<ItemRow[]>([]);
/** 当前选择的产品：子件中不能再选它 */
const productId = ref<string>();
let nextKey = 1;

const [Form, formApi] = useVbenForm({
  handleValuesChange(values, fieldsChanged) {
    if (fieldsChanged.includes('materialId')) {
      productId.value = values.materialId as string | undefined;
    }
  },
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-4',
});

/** 明细中的数量、损耗率去掉补齐的末尾 0 */
const qtyFormatter = trimFixedDecimal(6);
const lossRateFormatter = trimFixedDecimal(4);

function toNumber(value?: null | number | string) {
  return value === undefined || value === null || value === ''
    ? undefined
    : Number(value);
}

function toRow(item: BomApi.Item): ItemRow {
  return {
    key: nextKey++,
    label: item.materialCode
      ? `${item.materialCode} ${item.materialName ?? ''}`
      : undefined,
    lossRate: toNumber(item.lossRate) ?? 0,
    materialId: item.materialId,
    qty: toNumber(item.qty),
    remark: item.remark,
    specification: item.specification,
    unit: item.unit,
  };
}

function onAddItem() {
  items.value = [...items.value, { key: nextKey++, lossRate: 0 }];
}

function onRemoveItem(key: number) {
  items.value = items.value.filter((row) => row.key !== key);
}

/** 换了子件物料时，单位与规格要等保存后从后端带出 */
function onMaterialSelect(row: ItemRow, option?: MesApi.Option) {
  row.label = option ? `${option.code} ${option.name}` : undefined;
  row.unit = undefined;
  row.specification = undefined;
}

/** 明细的前端校验（后端会再校验一遍），返回第一条错误；没有错误时为空 */
function validateItems(): string | undefined {
  if (items.value.length === 0) {
    return $t('mes.bom.item.required');
  }
  const seen = new Set<string>();
  for (const [index, row] of items.value.entries()) {
    const line = index + 1;
    if (!row.materialId) {
      return $t('mes.bom.item.materialRequired', { line });
    }
    if (row.materialId === productId.value) {
      return $t('mes.bom.item.selfReference', { line });
    }
    if (seen.has(row.materialId)) {
      return $t('mes.bom.item.duplicate', { line });
    }
    seen.add(row.materialId);
    if (row.qty === undefined || row.qty <= 0) {
      return $t('mes.bom.item.qtyRequired', { line });
    }
  }
  return undefined;
}

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    const error = validateItems();
    if (error) {
      ElMessage.warning(error);
      return;
    }
    drawerApi.lock();
    try {
      const values = (await formApi.getValues()) as Omit<BomApi.Form, 'items'>;
      const data: BomApi.Form = {
        ...values,
        items: items.value.map((row, index) => ({
          lossRate: row.lossRate ?? 0,
          materialId: row.materialId as string,
          qty: row.qty as number,
          remark: row.remark,
          sortNo: index + 1,
        })),
      };
      await (bomId.value
        ? updateBom({ ...data, bomId: bomId.value })
        : addBom(data));
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
    const data = drawerApi.getData() as undefined | { bomId?: string };
    bomId.value = data?.bomId;
    used.value = false;
    items.value = [];
    productId.value = undefined;
    await formApi.resetForm();
    drawerApi.lock();
    try {
      const options = await loadFormOptions();
      formApi.updateSchema([
        { componentProps: { options: options.status }, fieldName: 'status' },
      ]);
      if (bomId.value) {
        const bom = await getBom(bomId.value);
        used.value = bom.used === true;
        formApi.updateSchema([
          {
            componentProps: {
              disabled: used.value,
              initialLabel: `${bom.materialCode ?? ''} ${bom.materialName ?? ''}`,
            },
            fieldName: 'materialId',
          },
          { componentProps: { disabled: used.value }, fieldName: 'baseQty' },
        ]);
        productId.value = bom.materialId;
        await formApi.setValues({ ...bom, baseQty: toNumber(bom.baseQty) });
        items.value = (bom.items ?? []).map((item) => toRow(item));
      } else {
        formApi.updateSchema([
          { componentProps: { disabled: false }, fieldName: 'materialId' },
          { componentProps: { disabled: false }, fieldName: 'baseQty' },
        ]);
        onAddItem();
      }
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  bomId.value ? $t('mes.bom.edit') : $t('mes.bom.create'),
);
</script>

<template>
  <Drawer
    :confirm-text="$t('crud.save')"
    :title="title"
    class="w-full max-w-[960px]"
  >
    <Form />
    <ElAlert
      v-if="used"
      :closable="false"
      :title="$t('mes.bom.item.lockedHint')"
      class="mt-2"
      show-icon
      type="info"
    />
    <div class="mb-2 mt-4 flex items-center justify-between">
      <span class="font-medium">
        {{ $t('mes.bom.item.title', { count: items.length }) }}
      </span>
      <ElButton :disabled="used" type="primary" @click="onAddItem">
        {{ $t('mes.bom.item.add') }}
      </ElButton>
    </div>
    <ElTable :data="items" row-key="key" size="small">
      <ElTableColumn label="#" type="index" width="48" />
      <ElTableColumn :label="$t('mes.bom.item.material')" width="260">
        <template #default="{ row }">
          <MaterialSelect
            v-model="row.materialId"
            :disabled="used"
            :exclude-ids="productId ? [productId] : []"
            :initial-label="row.label"
            @select="(option) => onMaterialSelect(row as ItemRow, option)"
          />
        </template>
      </ElTableColumn>
      <ElTableColumn :label="$t('mes.bom.unit')" width="70">
        <template #default="{ row }">{{ row.unit ?? '-' }}</template>
      </ElTableColumn>
      <ElTableColumn :label="$t('mes.bom.item.qty')" width="130">
        <template #default="{ row }">
          <ElInputNumber
            v-model="row.qty"
            :disabled="used"
            :formatter="qtyFormatter"
            :min="0"
            :precision="6"
            class="w-full"
            controls-position="right"
          />
        </template>
      </ElTableColumn>
      <ElTableColumn :label="$t('mes.bom.item.lossRate')" width="120">
        <template #default="{ row }">
          <ElInputNumber
            v-model="row.lossRate"
            :disabled="used"
            :formatter="lossRateFormatter"
            :max="1"
            :min="0"
            :precision="4"
            :step="0.01"
            class="w-full"
            controls-position="right"
          />
        </template>
      </ElTableColumn>
      <ElTableColumn :label="$t('crud.remark')" min-width="160">
        <template #default="{ row }">
          <ElInput v-model="row.remark" :disabled="used" :maxlength="500" />
        </template>
      </ElTableColumn>
      <ElTableColumn align="right" width="70">
        <template #default="{ row }">
          <ElButton
            :disabled="used"
            link
            size="small"
            type="danger"
            @click="onRemoveItem(row.key)"
          >
            {{ $t('common.delete') }}
          </ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
    <p class="text-muted-foreground mt-2 text-xs">
      {{ $t('mes.bom.item.help') }}
    </p>
  </Drawer>
</template>
