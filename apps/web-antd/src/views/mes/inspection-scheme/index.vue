<script lang="ts" setup>
import type { InspectionSchemeApi } from '@tuoyu/shared/api/mes/inspectionScheme';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import {
  exportInspectionScheme,
  listInspectionScheme,
  removeInspectionScheme,
  updateInspectionScheme,
} from '@tuoyu/shared/api/mes/inspectionScheme';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { Button, message, Modal, Popconfirm, Switch } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';
import EnumTag from '#/views/mes/_shared/enum-tag.vue';

import { useColumns, useSearchSchema } from './data';
import InspectionSchemeDrawer from './inspection-scheme-drawer.vue';

defineOptions({ name: 'MesInspectionScheme' });

/** 0 正常，1 停用 */
const STATUS_NORMAL = '0';
const STATUS_DISABLED = '1';

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: InspectionSchemeDrawer,
  destroyOnClose: true,
});

/** 已勾选的行数，用于启用“删除所选” */
const selectedCount = ref(0);

/** 正在切换状态的行，避免重复点击 */
const switching = ref(new Set<string>());

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useSearchSchema(),
    submitOnChange: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  },
  gridEvents: {
    checkboxAll: updateSelectedCount,
    checkboxChange: updateSelectedCount,
  },
  gridOptions: {
    checkboxConfig: { highlight: true },
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    pagerConfig: { pageSize: 10, pageSizes: [10, 20, 50, 100] },
    proxyConfig: {
      ajax: {
        query: async ({ page, sorts }, formValues) => {
          selectedCount.value = 0;
          return await listInspectionScheme({
            ...toPageQuery(page, sorts),
            ...formValues,
          });
        },
      },
      sort: true,
    },
    rowConfig: { isHover: true, keyField: 'schemeId' },
    sortConfig: { remote: true },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<InspectionSchemeApi.Scheme>,
});

function updateSelectedCount() {
  selectedCount.value = gridApi.grid.getCheckboxRecords().length;
}

function reload() {
  gridApi.query();
}

function onCreate() {
  drawerApi.setData({}).open();
}

function onEdit(row: InspectionSchemeApi.Scheme) {
  drawerApi.setData({ schemeId: row.schemeId }).open();
}

async function onDelete(row: InspectionSchemeApi.Scheme) {
  await removeInspectionScheme([row.schemeId]);
  message.success($t('crud.deleted'));
  reload();
}

function onBatchDelete() {
  const rows =
    gridApi.grid.getCheckboxRecords() as InspectionSchemeApi.Scheme[];
  if (rows.length === 0) {
    return;
  }
  Modal.confirm({
    content: $t('crud.confirmBatchDelete', { count: rows.length }),
    okButtonProps: { danger: true },
    okText: $t('crud.batchDelete'),
    async onOk() {
      await removeInspectionScheme(rows.map((row) => row.schemeId));
      message.success($t('crud.deleted'));
      reload();
    },
  });
}

async function onStatusChange(
  row: InspectionSchemeApi.Scheme,
  checked: boolean,
) {
  const status = checked ? STATUS_NORMAL : STATUS_DISABLED;
  switching.value.add(row.schemeId);
  try {
    // 没有单独修改状态的接口，带上整行数据修改
    await updateInspectionScheme({ ...row, status });
    row.status = status;
    message.success(
      $t(checked ? 'crud.enabledName' : 'crud.disabledName', {
        name: row.schemeName,
      }),
    );
  } finally {
    switching.value.delete(row.schemeId);
  }
}

async function onExport() {
  const query = await gridApi.formApi.getValues();
  const fileName = `${$t('mes.inspectionScheme.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportInspectionScheme(query, fileName);
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Grid :table-title="$t('mes.inspectionScheme.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <Button
            v-if="hasPermission('mes:inspectionScheme:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('mes.inspectionScheme.create') }}
          </Button>
          <Button
            v-if="hasPermission('mes:inspectionScheme:remove')"
            :disabled="selectedCount === 0"
            danger
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </Button>
          <Button
            v-if="hasPermission('mes:inspectionScheme:export')"
            @click="onExport"
          >
            {{ $t('crud.export') }}
          </Button>
        </div>
      </template>

      <template #inspectionType="{ row }">
        <EnumTag :value="row.inspectionType" type="InspectionType" />
      </template>

      <template #status="{ row }">
        <Switch
          :checked="row.status === STATUS_NORMAL"
          :disabled="!hasPermission('mes:inspectionScheme:edit')"
          :loading="switching.has(row.schemeId)"
          @change="(checked) => onStatusChange(row, checked as boolean)"
        />
      </template>

      <template #actions="{ row }">
        <Button
          v-if="hasPermission('mes:inspectionScheme:edit')"
          size="small"
          type="link"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </Button>
        <Popconfirm
          v-if="hasPermission('mes:inspectionScheme:remove')"
          :ok-button-props="{ danger: true }"
          :ok-text="$t('mes.inspectionScheme.delete')"
          :title="$t('crud.confirmDelete', { name: row.schemeName })"
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
