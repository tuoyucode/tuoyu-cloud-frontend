<script lang="ts" setup>
import type { CategoryApi } from '@tuoyu/shared/api/workflow/category';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import {
  exportCategory,
  listCategory,
  removeCategory,
} from '@tuoyu/shared/api/workflow/category';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { Button, message, Popconfirm } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import CategoryDrawer from './category-drawer.vue';
import { useColumns, useSearchSchema } from './data';

defineOptions({ name: 'WorkflowCategory' });

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: CategoryDrawer,
  destroyOnClose: true,
});

/** 是否已完成首次查询：首次查询后默认展开第一层，之后保留原来的展开状态 */
let loaded = false;

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useSearchSchema(),
    submitOnChange: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  },
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    pagerConfig: { enabled: false },
    proxyConfig: {
      ajax: {
        // 分类一次返回全部数据，由表格按上级分类组装成树
        query: async (_params, formValues) => {
          const rows = await listCategory(formValues);
          const first = !loaded;
          loaded = true;
          setTimeout(() =>
            expandAfterQuery(rows, !!formValues?.categoryName, first),
          );
          return { items: rows };
        },
      },
    },
    rowConfig: { isHover: true, keyField: 'categoryId' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
    treeConfig: {
      expandAll: false,
      parentField: 'parentId',
      reserve: true,
      rowField: 'categoryId',
      transform: true,
    },
  } as VxeTableGridOptions<CategoryApi.Category>,
});

/**
 * 首次查询默认展开第一层；按名称查询时全部展开；其他情况保留原来的展开状态
 */
function expandAfterQuery(
  rows: CategoryApi.Category[],
  filtered: boolean,
  first: boolean,
) {
  const grid = gridApi.grid;
  if (filtered) {
    grid.setAllTreeExpand(true);
    return;
  }
  if (!first) {
    return;
  }
  const ids = new Set(rows.map((row) => String(row.categoryId)));
  const roots = rows
    .filter((row) => !ids.has(String(row.parentId)))
    .map((row) => grid.getRowById(row.categoryId))
    .filter(Boolean);
  grid.setTreeExpand(roots, true);
}

function reload() {
  gridApi.query();
}

function expandAll(expand: boolean) {
  gridApi.grid.setAllTreeExpand(expand);
}

function onCreate(parent?: CategoryApi.Category) {
  drawerApi
    .setData({ values: parent ? { parentId: parent.categoryId } : {} })
    .open();
}

function onEdit(row: CategoryApi.Category) {
  drawerApi.setData({ categoryId: row.categoryId }).open();
}

async function onDelete(row: CategoryApi.Category) {
  // 有下级分类或已被流程定义使用时后端拒绝删除，请求层会显示原因
  await removeCategory(row.categoryId);
  message.success($t('crud.deleted'));
  reload();
}

async function onExport() {
  const query = await gridApi.formApi.getValues();
  const fileName = `${$t('workflow.category.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportCategory(query, fileName);
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Grid :table-title="$t('workflow.category.list')">
      <template #toolbar-actions>
        <div class="flex flex-wrap gap-2">
          <Button
            v-if="hasPermission('workflow:category:add')"
            type="primary"
            @click="onCreate()"
          >
            {{ $t('workflow.category.create') }}
          </Button>
          <Button @click="expandAll(true)">{{ $t('crud.expandAll') }}</Button>
          <Button @click="expandAll(false)">
            {{ $t('crud.collapseAll') }}
          </Button>
          <Button
            v-if="hasPermission('workflow:category:export')"
            @click="onExport"
          >
            {{ $t('crud.export') }}
          </Button>
        </div>
      </template>

      <template #actions="{ row }">
        <Button
          v-if="hasPermission('workflow:category:add')"
          size="small"
          type="link"
          @click="onCreate(row)"
        >
          {{ $t('crud.addChild') }}
        </Button>
        <Button
          v-if="hasPermission('workflow:category:edit')"
          size="small"
          type="link"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </Button>
        <Popconfirm
          v-if="hasPermission('workflow:category:remove')"
          :description="$t('workflow.category.deleteHelp')"
          :ok-button-props="{ danger: true }"
          :ok-text="$t('workflow.category.delete')"
          :title="$t('crud.confirmDelete', { name: row.categoryName })"
          placement="left"
          @confirm="onDelete(row)"
        >
          <Button danger size="small" type="link">
            {{ $t('common.delete') }}
          </Button>
        </Popconfirm>
      </template>
    </Grid>
  </Page>
</template>
