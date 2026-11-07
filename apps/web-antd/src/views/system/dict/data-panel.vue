<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { DictApi } from '#/api/system/dict';

import { computed, ref, watch } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import { Button, message, Modal, Popconfirm, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  exportDictData,
  listDictData,
  removeDictData,
} from '#/api/system/dict';
import { $t } from '#/locales';
import { toPageQuery } from '#/utils/page-query';
import { hasPermission } from '#/utils/permission';

import { LIST_CLASS_COLORS, useDataColumns, useDataSearchSchema } from './data';
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
  message.success($t('crud.deleted'));
  reload();
}

function onBatchDelete() {
  const codes = (gridApi.grid.getCheckboxRecords() as DictApi.DictData[])
    .map((row) => row.dictCode)
    .filter((code): code is string => Boolean(code));
  if (codes.length === 0) {
    return;
  }
  Modal.confirm({
    content: $t('crud.confirmBatchDelete', { count: codes.length }),
    okButtonProps: { danger: true },
    okText: $t('crud.batchDelete'),
    async onOk() {
      await removeDictData(codes);
      message.success($t('crud.deleted'));
      reload();
    },
  });
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
          <Button
            v-if="hasPermission('system:dict:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('system.dict.createData') }}
          </Button>
          <Button
            v-if="hasPermission('system:dict:remove')"
            :disabled="selectedCount === 0"
            danger
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </Button>
          <Button v-if="hasPermission('system:dict:export')" @click="onExport">
            {{ $t('crud.export') }}
          </Button>
        </div>
        <span v-else class="text-muted-foreground">
          {{ $t('system.dict.selectTypeFirst') }}
        </span>
      </template>

      <template #dictLabel="{ row }">
        <Tag
          :bordered="false"
          :class="row.cssClass"
          :color="LIST_CLASS_COLORS[row.listClass ?? 'default'] ?? 'default'"
        >
          {{ row.dictLabel }}
        </Tag>
      </template>

      <template #actions="{ row }">
        <Button
          v-if="hasPermission('system:dict:edit')"
          size="small"
          type="link"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </Button>
        <Popconfirm
          v-if="hasPermission('system:dict:remove')"
          :ok-button-props="{ danger: true }"
          :ok-text="$t('system.dict.deleteData')"
          :title="$t('crud.confirmDelete', { name: row.dictLabel })"
          placement="left"
          @confirm="onDelete(row)"
        >
          <Button danger size="small" type="link">
            {{ $t('common.delete') }}
          </Button>
        </Popconfirm>
      </template>
    </Grid>
  </div>
</template>
