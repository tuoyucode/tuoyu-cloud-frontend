<script lang="ts" setup>
import type { RouteApi } from '@tuoyu/shared/api/mes/route';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { addRoute, getRoute, updateRoute } from '@tuoyu/shared/api/mes/route';
import { trimFixedDecimal } from '@tuoyu/shared/pages/mes/decimal';
import {
  ElAlert,
  ElButton,
  ElCheckbox,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElTable,
  ElTableColumn,
} from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { loadFormOptions, NO, SEQ_STEP, useFormSchema, YES } from './data';

const emit = defineEmits<{ success: [] }>();

/** 工序表格中的一行（key 只用于渲染） */
interface OperationRow {
  firstInspection: boolean;
  key: number;
  operationCode?: string;
  operationName?: string;
  remark?: string;
  seqNo?: number;
  standardMinutes?: number;
  stationType?: string;
}

/** 编辑时的工艺路线 ID；新增时为空 */
const routeId = ref<string>();
/** 已被工单使用：只能修改表头，产品与工序不能修改（与后端规则一致） */
const used = ref(false);
const operations = ref<OperationRow[]>([]);
let nextKey = 1;

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-4',
});

/** 标准工时去掉补齐的末尾 0 */
const minutesFormatter = trimFixedDecimal(4);

function toRow(operation: RouteApi.Operation): OperationRow {
  return {
    firstInspection: operation.firstInspection === YES,
    key: nextKey++,
    operationCode: operation.operationCode,
    operationName: operation.operationName,
    remark: operation.remark,
    seqNo: operation.seqNo,
    standardMinutes:
      operation.standardMinutes === undefined
        ? 0
        : Number(operation.standardMinutes),
    stationType: operation.stationType,
  };
}

/** 新增一道工序，顺序号接在最大的后面 */
function onAddOperation() {
  const maxSeq = Math.max(0, ...operations.value.map((row) => row.seqNo ?? 0));
  operations.value = [
    ...operations.value,
    {
      firstInspection: false,
      key: nextKey++,
      seqNo: maxSeq + SEQ_STEP,
      standardMinutes: 0,
    },
  ];
}

function onRemoveOperation(key: number) {
  operations.value = operations.value.filter((row) => row.key !== key);
}

/** 工序的前端校验（后端会再校验一遍），返回第一条错误；没有错误时为空 */
function validateOperations(): string | undefined {
  if (operations.value.length === 0) {
    return $t('mes.route.operation.required');
  }
  const seen = new Set<number>();
  for (const [index, row] of operations.value.entries()) {
    const line = index + 1;
    if (!row.seqNo || row.seqNo <= 0) {
      return $t('mes.route.operation.seqNoRequired', { line });
    }
    if (seen.has(row.seqNo)) {
      return $t('mes.route.operation.seqNoDuplicate', { seqNo: row.seqNo });
    }
    seen.add(row.seqNo);
    if (!row.operationCode?.trim() || !row.operationName?.trim()) {
      return $t('mes.route.operation.nameRequired', { line });
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
    const error = validateOperations();
    if (error) {
      ElMessage.warning(error);
      return;
    }
    drawerApi.lock();
    try {
      const values = (await formApi.getValues()) as Omit<
        RouteApi.Form,
        'operations'
      >;
      const data: RouteApi.Form = {
        ...values,
        operations: operations.value.map((row) => ({
          firstInspection: row.firstInspection ? YES : NO,
          operationCode: (row.operationCode ?? '').trim(),
          operationName: (row.operationName ?? '').trim(),
          remark: row.remark,
          seqNo: row.seqNo as number,
          standardMinutes: row.standardMinutes ?? 0,
          stationType: row.stationType,
        })),
      };
      await (routeId.value
        ? updateRoute({ ...data, routeId: routeId.value })
        : addRoute(data));
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
    const data = drawerApi.getData() as undefined | { routeId?: string };
    routeId.value = data?.routeId;
    used.value = false;
    operations.value = [];
    await formApi.resetForm();
    drawerApi.lock();
    try {
      const options = await loadFormOptions();
      formApi.updateSchema([
        { componentProps: { options: options.status }, fieldName: 'status' },
      ]);
      if (routeId.value) {
        const route = await getRoute(routeId.value);
        used.value = route.used === true;
        formApi.updateSchema([
          {
            componentProps: {
              disabled: used.value,
              initialLabel: `${route.materialCode ?? ''} ${route.materialName ?? ''}`,
            },
            fieldName: 'materialId',
          },
        ]);
        await formApi.setValues(route);
        operations.value = (route.operations ?? []).map((item) => toRow(item));
      } else {
        formApi.updateSchema([
          { componentProps: { disabled: false }, fieldName: 'materialId' },
        ]);
        onAddOperation();
      }
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  routeId.value ? $t('mes.route.edit') : $t('mes.route.create'),
);
</script>

<template>
  <Drawer
    :confirm-text="$t('crud.save')"
    :title="title"
    class="w-full max-w-[1080px]"
  >
    <Form />
    <ElAlert
      v-if="used"
      :closable="false"
      :title="$t('mes.route.operation.lockedHint')"
      class="mt-2"
      show-icon
      type="info"
    />
    <div class="mb-2 mt-4 flex items-center justify-between">
      <span class="font-medium">
        {{ $t('mes.route.operation.title', { count: operations.length }) }}
      </span>
      <ElButton :disabled="used" type="primary" @click="onAddOperation">
        {{ $t('mes.route.operation.add') }}
      </ElButton>
    </div>
    <ElTable :data="operations" row-key="key" size="small">
      <ElTableColumn :label="$t('mes.route.operation.seqNo')" width="100">
        <template #default="{ row }">
          <ElInputNumber
            v-model="row.seqNo"
            :disabled="used"
            :min="1"
            :precision="0"
            class="w-full"
            controls-position="right"
          />
        </template>
      </ElTableColumn>
      <ElTableColumn
        :label="$t('mes.route.operation.operationCode')"
        width="130"
      >
        <template #default="{ row }">
          <ElInput
            v-model="row.operationCode"
            :disabled="used"
            :maxlength="64"
            :placeholder="$t('mes.route.operation.operationCodePlaceholder')"
          />
        </template>
      </ElTableColumn>
      <ElTableColumn
        :label="$t('mes.route.operation.operationName')"
        width="160"
      >
        <template #default="{ row }">
          <ElInput
            v-model="row.operationName"
            :disabled="used"
            :maxlength="128"
            :placeholder="$t('mes.route.operation.operationNamePlaceholder')"
          />
        </template>
      </ElTableColumn>
      <ElTableColumn :label="$t('mes.route.operation.stationType')" width="120">
        <template #default="{ row }">
          <ElInput v-model="row.stationType" :disabled="used" :maxlength="32" />
        </template>
      </ElTableColumn>
      <ElTableColumn
        :label="$t('mes.route.operation.standardMinutes')"
        width="130"
      >
        <template #default="{ row }">
          <ElInputNumber
            v-model="row.standardMinutes"
            :disabled="used"
            :formatter="minutesFormatter"
            :min="0"
            :precision="4"
            class="w-full"
            controls-position="right"
          />
        </template>
      </ElTableColumn>
      <ElTableColumn
        :label="$t('mes.route.operation.firstInspection')"
        align="center"
        width="80"
      >
        <template #default="{ row }">
          <ElCheckbox v-model="row.firstInspection" :disabled="used" />
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
            @click="onRemoveOperation(row.key)"
          >
            {{ $t('common.delete') }}
          </ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
    <p class="text-muted-foreground mt-2 text-xs">
      {{ $t('mes.route.operation.help') }}
    </p>
  </Drawer>
</template>
