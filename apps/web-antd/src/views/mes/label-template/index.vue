<script lang="ts" setup>
import type { LabelTemplateApi } from '@tuoyu/shared/api/mes/labelTemplate';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import {
  listLabelTemplate,
  removeLabelTemplate,
  updateLabelTemplate,
} from '@tuoyu/shared/api/mes/labelTemplate';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import {
  Button,
  message,
  Modal,
  Popconfirm,
  Switch,
  Tag,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import { toTemplateForm, useColumns, useSearchSchema } from './data';
import LabelTemplateDrawer from './label-template-drawer.vue';

defineOptions({ name: 'MesLabelTemplate' });

/** 0 正常，1 停用 */
const STATUS_NORMAL = '0';
const STATUS_DISABLED = '1';

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: LabelTemplateDrawer,
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
          return await listLabelTemplate({
            ...toPageQuery(page, sorts),
            ...formValues,
          });
        },
      },
      sort: true,
    },
    rowConfig: { isHover: true, keyField: 'labelTemplateId' },
    sortConfig: { remote: true },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<LabelTemplateApi.Template>,
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

function onEdit(row: LabelTemplateApi.Template) {
  drawerApi.setData({ labelTemplateId: row.labelTemplateId }).open();
}

async function onDelete(row: LabelTemplateApi.Template) {
  await removeLabelTemplate([row.labelTemplateId]);
  message.success($t('crud.deleted'));
  reload();
}

function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as LabelTemplateApi.Template[];
  if (rows.length === 0) {
    return;
  }
  Modal.confirm({
    content: $t('crud.confirmBatchDelete', { count: rows.length }),
    okButtonProps: { danger: true },
    okText: $t('crud.batchDelete'),
    async onOk() {
      await removeLabelTemplate(rows.map((row) => row.labelTemplateId));
      message.success($t('crud.deleted'));
      reload();
    },
  });
}

async function onStatusChange(
  row: LabelTemplateApi.Template,
  checked: boolean,
) {
  const status = checked ? STATUS_NORMAL : STATUS_DISABLED;
  switching.value.add(row.labelTemplateId);
  try {
    // 没有单独修改状态的接口，带上整行数据修改
    await updateLabelTemplate({
      ...toTemplateForm({ ...row, status }),
      labelTemplateId: row.labelTemplateId,
    });
    row.status = status;
    message.success(
      $t(checked ? 'crud.enabledName' : 'crud.disabledName', {
        name: row.templateName,
      }),
    );
  } finally {
    switching.value.delete(row.labelTemplateId);
  }
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Grid :table-title="$t('mes.labelTemplate.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <Button
            v-if="hasPermission('mes:labelTemplate:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('mes.labelTemplate.create') }}
          </Button>
          <Button
            v-if="hasPermission('mes:labelTemplate:remove')"
            :disabled="selectedCount === 0"
            danger
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </Button>
        </div>
      </template>

      <template #templateName="{ row }">
        {{ row.templateName }}
        <Tag v-if="row.defaultFlag === '1'" class="ml-2" color="processing">
          {{ $t('mes.labelTemplate.default') }}
        </Tag>
      </template>

      <template #status="{ row }">
        <Switch
          :checked="row.status === STATUS_NORMAL"
          :disabled="
            !hasPermission('mes:labelTemplate:edit') || row.defaultFlag === '1'
          "
          :loading="switching.has(row.labelTemplateId)"
          @change="(checked) => onStatusChange(row, checked as boolean)"
        />
      </template>

      <template #actions="{ row }">
        <Button
          v-if="hasPermission('mes:labelTemplate:edit')"
          size="small"
          type="link"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </Button>
        <Popconfirm
          v-if="hasPermission('mes:labelTemplate:remove')"
          :ok-button-props="{ danger: true }"
          :ok-text="$t('mes.labelTemplate.delete')"
          :title="$t('crud.confirmDelete', { name: row.templateName })"
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
