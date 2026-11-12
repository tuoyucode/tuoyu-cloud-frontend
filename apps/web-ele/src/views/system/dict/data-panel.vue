<script lang="ts" setup>
import type { DictApi } from '@tuoyu/shared/api/system/dict';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, ref, watch } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import {
  exportDictData,
  listDictData,
  removeDictData,
} from '@tuoyu/shared/api/system/dict';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import {
  ElButton,
  ElMessage,
  ElMessageBox,
  ElPopconfirm,
  ElTag,
} from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import { LIST_CLASS_TYPES, useDataColumns, useDataSearchSchema } from './data';
import DataDrawer from './data-drawer.vue';

const props = defineProps<{
  /** 左侧选中的字典类型；为空时不显示数据 */
  dictType?: DictApi.DictTypeItem;
}>();

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: DataDrawer,
  destroyOnClose: true,
});

/** 已勾选的行数，用于启用“删除所选” */
const selectedCount = ref(0);

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useDataSearchSchema(),
    submitOnChange: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-2',
  },
  gridEvents: {
    checkboxAll: updateSelectedCount,
    checkboxChange: updateSelectedCount,
  },
  gridOptions: {
    checkboxConfig: { highlight: true },
    columns: useDataColumns(),
    height: 'auto',
    keepSource: true,
    pagerConfig: { pageSize: 10, pageSizes: [10, 20, 50, 100] },
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          selectedCount.value = 0;
          const dictType = props.dictType?.dictType;
          if (!dictType) {
            return { items: [], total: 0 };
          }
          return await listDictData({
            ...toPageQuery(page),
            ...formValues,
            dictType,
          });
        },
      },
    },
    rowConfig: { isHover: true, keyField: 'dictCode' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<DictApi.DictData>,
});

// 切换字典类型（或类型标识被修改）后回到第一页重新查询
watch(
  () => props.dictType?.dictType,
  () => gridApi.reload(),
);

const title = computed(() =>
  props.dictType
    ? $t('system.dict.dataListOf', { name: props.dictType.dictName })
    : $t('system.dict.dataList'),
);

function updateSelectedCount() {
  selectedCount.value = gridApi.grid.getCheckboxRecords().length;
}

function reload() {
  gridApi.query();
}

function onCreate() {
  if (!props.dictType) {
    return;
  }
  drawerApi.setData({ dictType: props.dictType.dictType }).open();
}

function onEdit(row: DictApi.DictData) {
  drawerApi.setData({ dictCode: row.dictCode, dictType: row.dictType }).open();
}

async function onDelete(row: DictApi.DictData) {
  if (!row.dictCode) {
    return;
  }
  await removeDictData([row.dictCode]);
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onBatchDelete() {
  const codes = (gridApi.grid.getCheckboxRecords() as DictApi.DictData[])
    .map((row) => row.dictCode)
    .filter((code): code is string => Boolean(code));
  if (codes.length === 0) {
    return;
  }
  try {
    await ElMessageBox.confirm(
      $t('crud.confirmBatchDelete', { count: codes.length }),
      $t('crud.batchDelete'),
      {
        cancelButtonText: $t('common.cancel'),
        confirmButtonClass: 'el-button--danger',
        confirmButtonText: $t('crud.batchDelete'),
        type: 'warning',
      },
    );
  } catch {
    // 取消
    return;
  }
  await removeDictData(codes);
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onExport() {
  if (!props.dictType) {
    return;
  }
  const query = await gridApi.formApi.getValues();
  const fileName = `${$t('system.dict.dataExportFileName')}_${props.dictType.dictType}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportDictData(
    { ...query, dictType: props.dictType.dictType },
    fileName,
  );
}
</script>

<template>
  <div class="h-full">
    <Drawer @success="reload" />
    <Grid :table-title="title">
      <template #toolbar-actions>
        <div v-if="dictType" class="flex flex-wrap gap-2">
          <ElButton
            v-if="hasPermission('system:dict:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('system.dict.createData') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('system:dict:remove')"
            :disabled="selectedCount === 0"
            plain
            type="danger"
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('system:dict:export')"
            @click="onExport"
          >
            {{ $t('crud.export') }}
          </ElButton>
        </div>
        <span v-else class="text-muted-foreground">
          {{ $t('system.dict.selectTypeFirst') }}
        </span>
      </template>

      <template #dictLabel="{ row }">
        <ElTag
          :class="row.cssClass"
          :type="LIST_CLASS_TYPES[row.listClass ?? 'default'] ?? 'info'"
          disable-transitions
        >
          {{ row.dictLabel }}
        </ElTag>
      </template>

      <template #actions="{ row }">
        <ElButton
          v-if="hasPermission('system:dict:edit')"
          link
          size="small"
          type="primary"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </ElButton>
        <ElPopconfirm
          v-if="hasPermission('system:dict:remove')"
          :cancel-button-text="$t('common.cancel')"
          :confirm-button-text="$t('system.dict.deleteData')"
          :title="$t('crud.confirmDelete', { name: row.dictLabel })"
          confirm-button-type="danger"
          placement="left"
          width="240"
          @confirm="onDelete(row)"
        >
          <template #reference>
            <ElButton link size="small" type="danger">
              {{ $t('common.delete') }}
            </ElButton>
          </template>
        </ElPopconfirm>
      </template>
    </Grid>
  </div>
</template>
