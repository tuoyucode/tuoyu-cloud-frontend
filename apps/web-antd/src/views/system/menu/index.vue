<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { MenuApi } from '#/api/system/menu';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { Button, message, Popconfirm, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { listMenu, removeMenu } from '#/api/system/menu';
import { $t } from '#/locales';
// 菜单表不分租户、全局共享，后端的增删改同时要求超级管理员角色与权限码，按钮按同样的规则显示
import { hasSuperAdminPermission } from '#/utils/permission';

import { isIconifyName, MenuType, useColumns, useSearchSchema } from './data';
import MenuDrawer from './menu-drawer.vue';

defineOptions({ name: 'SystemMenu' });

/** 菜单类型的标签：文案与颜色 */
const TYPE_TAGS: Record<MenuApi.MenuType, { color: string; label: string }> = {
  C: { color: 'success', label: 'system.menu.typeMenu' },
  F: { color: 'default', label: 'system.menu.typeButton' },
  M: { color: 'processing', label: 'system.menu.typeDir' },
};

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: MenuDrawer,
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
        // 菜单一次返回全部数据，由表格按上级菜单组装成树
        query: async (_params, formValues) => {
          const rows = await listMenu(formValues);
          const first = !loaded;
          loaded = true;
          // 等表格载入数据后再展开
          setTimeout(() =>
            expandAfterQuery(rows, hasFilter(formValues), first),
          );
          return { rows };
        },
      },
    },
    rowConfig: { isHover: true, keyField: 'menuId' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
    treeConfig: {
      expandAll: false,
      parentField: 'parentId',
      // 重新查询后保留展开状态（例如保存之后）
      reserve: true,
      rowField: 'menuId',
      transform: true,
    },
  } as VxeTableGridOptions<MenuApi.Menu>,
});

/** 查询条件中是否填了值 */
function hasFilter(values?: Record<string, unknown>) {
  return Object.values(values ?? {}).some(
    (value) => value !== undefined && value !== null && value !== '',
  );
}

/**
 * 首次查询默认展开第一层；按条件查询时全部展开，方便看到匹配的菜单；其他情况保留原来的展开状态
 */
function expandAfterQuery(
  rows: MenuApi.Menu[],
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
  const ids = new Set(rows.map((row) => String(row.menuId)));
  const roots = rows
    .filter((row) => !ids.has(String(row.parentId)))
    .map((row) => grid.getRowById(row.menuId))
    .filter(Boolean);
  grid.setTreeExpand(roots, true);
}

function reload() {
  gridApi.query();
}

function expandAll(expand: boolean) {
  gridApi.grid.setAllTreeExpand(expand);
}

function onCreate(parent?: MenuApi.Menu) {
  // 目录下默认新增菜单，菜单下默认新增按钮
  const values = parent
    ? {
        menuType:
          parent.menuType === MenuType.MENU ? MenuType.BUTTON : MenuType.MENU,
        parentId: parent.menuId,
      }
    : { menuType: MenuType.DIR };
  drawerApi.setData({ values }).open();
}

function onEdit(row: MenuApi.Menu) {
  drawerApi.setData({ menuId: row.menuId }).open();
}

async function onDelete(row: MenuApi.Menu) {
  // 有下级菜单或已分配给角色时后端拒绝删除，请求层会显示后端返回的原因
  await removeMenu(row.menuId);
  message.success($t('crud.deleted'));
  reload();
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Grid :table-title="$t('system.menu.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <Button
            v-if="hasSuperAdminPermission('system:menu:add')"
            type="primary"
            @click="onCreate()"
          >
            {{ $t('system.menu.create') }}
          </Button>
          <Button @click="expandAll(true)">{{ $t('crud.expandAll') }}</Button>
          <Button @click="expandAll(false)">
            {{ $t('crud.collapseAll') }}
          </Button>
        </div>
      </template>

      <template #menuName="{ row }">
        <span class="inline-flex items-center gap-2">
          <IconifyIcon
            v-if="isIconifyName(row.icon)"
            :icon="row.icon"
            class="size-4 shrink-0"
          />
          <span>{{ row.menuName }}</span>
        </span>
      </template>

      <template #menuType="{ row }">
        <Tag
          v-if="TYPE_TAGS[row.menuType as MenuApi.MenuType]"
          :color="TYPE_TAGS[row.menuType as MenuApi.MenuType].color"
        >
          {{ $t(TYPE_TAGS[row.menuType as MenuApi.MenuType].label) }}
        </Tag>
      </template>

      <template #actions="{ row }">
        <Button
          v-if="
            hasSuperAdminPermission('system:menu:add') &&
            row.menuType !== MenuType.BUTTON
          "
          size="small"
          type="link"
          @click="onCreate(row)"
        >
          {{ $t('crud.addChild') }}
        </Button>
        <Button
          v-if="hasSuperAdminPermission('system:menu:edit')"
          size="small"
          type="link"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </Button>
        <Popconfirm
          v-if="hasSuperAdminPermission('system:menu:remove')"
          :description="$t('system.menu.deleteHelp')"
          :ok-button-props="{ danger: true }"
          :ok-text="$t('system.menu.delete')"
          :title="$t('crud.confirmDelete', { name: row.menuName })"
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
