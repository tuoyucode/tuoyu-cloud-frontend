<script lang="ts" setup>
import type { DictApi } from '@tuoyu/shared/api/system/dict';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import {
  exportDictType,
  listDictType,
  refreshDictCache,
  removeDictType,
} from '@tuoyu/shared/api/system/dict';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import {
  ElButton,
  ElMessage,
  ElMessageBox,
  ElPopconfirm,
  ElTooltip,
} from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import { useTypeColumns, useTypeSearchSchema } from './data';
import TypeDrawer from './type-drawer.vue';

const props = defineProps<{
  /** 当前选中的字典类型 ID */
  selectedId?: string;
}>();

const emit = defineEmits<{
  /** 选中的字典类型变化；为空表示没有选中 */
  select: [row: DictApi.DictTypeItem | undefined];
}>();

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: TypeDrawer,
  destroyOnClose: true,
});

/** 已勾选的行数，用于启用“删除所选” */
const selectedCount = ref(0);

/** 正在刷新缓存，避免重复点击 */
const refreshing = ref(false);

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useTypeSearchSchema(),
    submitOnChange: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-2',
  },
  gridEvents: {
    checkboxAll: updateSelectedCount,
    checkboxChange: updateSelectedCount,
    currentRowChange: ({ row }: { row: DictApi.DictTypeItem }) => {
      emit('select', row);
    },
    proxyQuery: restoreCurrentRow,
  },
  gridOptions: {
    checkboxConfig: { highlight: true },
    columns: useTypeColumns(),
    height: 'auto',
    keepSource: true,
    pagerConfig: { pageSize: 10, pageSizes: [10, 20, 50, 100] },
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          selectedCount.value = 0;
          return await listDictType({
            ...toPageQuery(page),
            ...formValues,
          });
        },
      },
    },
    rowConfig: { isCurrent: true, isHover: true, keyField: 'dictId' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<DictApi.DictTypeItem>,
});

/**
 * 列表加载后恢复选中行：选中的类型在本页时重新高亮（并带出修改后的类型标识）；
 * 还没有选中任何类型时默认选中第一行
 */
async function restoreCurrentRow() {
  const rows = gridApi.grid.getData() as DictApi.DictTypeItem[];
  const current = props.selectedId
    ? rows.find((row) => row.dictId === props.selectedId)
    : rows[0];
  if (current) {
    await gridApi.grid.setCurrentRow(current);
    emit('select', current);
  }
}

function updateSelectedCount() {
  selectedCount.value = gridApi.grid.getCheckboxRecords().length;
}

function reload() {
  gridApi.query();
}

function onCreate() {
  drawerApi.setData({}).open();
}

function onEdit(row: DictApi.DictTypeItem) {
  drawerApi.setData({ dictId: row.dictId }).open();
}

/** 删除后，如果删掉的是选中的类型，清空右侧的字典数据 */
async function afterDelete(dictIds: string[]) {
  ElMessage.success($t('crud.deleted'));
  if (props.selectedId && dictIds.includes(props.selectedId)) {
    emit('select', undefined);
  }
  reload();
}

async function onDelete(row: DictApi.DictTypeItem) {
  await removeDictType([row.dictId]);
  await afterDelete([row.dictId]);
}

async function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as DictApi.DictTypeItem[];
  if (rows.length === 0) {
    return;
  }
  try {
    await ElMessageBox.confirm(
      $t('system.dict.confirmBatchDeleteType', { count: rows.length }),
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
  const dictIds = rows.map((row) => row.dictId);
  await removeDictType(dictIds);
  await afterDelete(dictIds);
}

async function onExport() {
  const query = await gridApi.formApi.getValues();
  const fileName = `${$t('system.dict.typeExportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportDictType(query, fileName);
}

async function onRefreshCache() {
  refreshing.value = true;
  try {
    await refreshDictCache();
    ElMessage.success($t('system.dict.cacheRefreshed'));
  } finally {
    refreshing.value = false;
  }
}
</script>

<template>
  <div class="h-full">
    <Drawer @success="reload" />
    <Grid :table-title="$t('system.dict.typeList')">
      <template #toolbar-actions>
        <div class="flex flex-wrap gap-2">
          <ElButton
            v-if="hasPermission('system:dict:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('system.dict.createType') }}
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
          <ElTooltip
            v-if="hasPermission('system:dict:remove')"
            :content="$t('system.dict.refreshCacheHelp')"
          >
            <ElButton :loading="refreshing" @click="onRefreshCache">
              {{ $t('system.dict.refreshCache') }}
            </ElButton>
          </ElTooltip>
        </div>
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
          :confirm-button-text="$t('system.dict.deleteType')"
          :title="$t('system.dict.confirmDeleteType', { name: row.dictName })"
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
