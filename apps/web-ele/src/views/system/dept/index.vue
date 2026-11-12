<script lang="ts" setup>
import type { DeptApi } from '@tuoyu/shared/api/system/dept';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { listDept, removeDept } from '@tuoyu/shared/api/system/dept';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { ElButton, ElMessage, ElPopconfirm } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import { useColumns, useSearchSchema } from './data';
import DeptDrawer from './dept-drawer.vue';

defineOptions({ name: 'SystemDept' });

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: DeptDrawer,
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
        // 部门一次返回全部数据，由表格按上级部门组装成树
        query: async (_params, formValues) => {
          const rows = await listDept(formValues);
          const first = !loaded;
          loaded = true;
          // 等表格载入数据后再展开
          setTimeout(() =>
            expandAfterQuery(rows, hasFilter(formValues), first),
          );
          return { items: rows };
        },
      },
    },
    rowConfig: { isHover: true, keyField: 'deptId' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
    treeConfig: {
      expandAll: false,
      parentField: 'parentId',
      // 重新查询后保留展开状态（例如保存之后）
      reserve: true,
      rowField: 'deptId',
      transform: true,
    },
  } as VxeTableGridOptions<DeptApi.Dept>,
});

/** 查询条件中是否填了值 */
function hasFilter(values?: Record<string, unknown>) {
  return Object.values(values ?? {}).some(
    (value) => value !== undefined && value !== null && value !== '',
  );
}

/**
 * 首次查询默认展开第一层；按条件查询时全部展开，方便看到匹配的部门；其他情况保留原来的展开状态
 */
function expandAfterQuery(
  rows: DeptApi.Dept[],
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
  const ids = new Set(rows.map((row) => String(row.deptId)));
  const roots = rows
    .filter((row) => !ids.has(String(row.parentId)))
    .map((row) => grid.getRowById(row.deptId))
    .filter(Boolean);
  grid.setTreeExpand(roots, true);
}

function reload() {
  gridApi.query();
}

function expandAll(expand: boolean) {
  gridApi.grid.setAllTreeExpand(expand);
}

function onCreate(parent?: DeptApi.Dept) {
  drawerApi
    .setData({ values: parent ? { parentId: parent.deptId } : {} })
    .open();
}

function onEdit(row: DeptApi.Dept) {
  drawerApi.setData({ deptId: row.deptId }).open();
}

async function onDelete(row: DeptApi.Dept) {
  // 有下级部门、用户或岗位时后端拒绝删除，请求层会显示后端返回的原因
  await removeDept(row.deptId);
  ElMessage.success($t('crud.deleted'));
  reload();
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Grid :table-title="$t('system.dept.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <ElButton
            v-if="hasPermission('system:dept:add')"
            type="primary"
            @click="onCreate()"
          >
            {{ $t('system.dept.create') }}
          </ElButton>
          <ElButton @click="expandAll(true)">
            {{ $t('crud.expandAll') }}
          </ElButton>
          <ElButton @click="expandAll(false)">
            {{ $t('crud.collapseAll') }}
          </ElButton>
        </div>
      </template>

      <template #actions="{ row }">
        <ElButton
          v-if="hasPermission('system:dept:add')"
          link
          size="small"
          type="primary"
          @click="onCreate(row)"
        >
          {{ $t('crud.addChild') }}
        </ElButton>
        <ElButton
          v-if="hasPermission('system:dept:edit')"
          link
          size="small"
          type="primary"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </ElButton>
        <ElPopconfirm
          v-if="hasPermission('system:dept:remove')"
          :cancel-button-text="$t('common.cancel')"
          :confirm-button-text="$t('system.dept.delete')"
          :title="`${$t('crud.confirmDelete', { name: row.deptName })} ${$t('system.dept.deleteHelp')}`"
          confirm-button-type="danger"
          placement="left"
          width="280"
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
  </Page>
</template>
