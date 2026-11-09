<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CodeRuleApi } from '#/api/mes/codeRule';

import { ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import {
  Button,
  message,
  Modal,
  Popconfirm,
  Switch,
  Tag,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  listCodeRule,
  previewCodeRule,
  removeCodeRule,
  updateCodeRule,
} from '#/api/mes/codeRule';
import { $t } from '#/locales';
import { toPageQuery } from '#/utils/page-query';
import { hasPermission } from '#/utils/permission';

import EnumTag from '../_shared/enum-tag.vue';
import CodeRuleDrawer from './code-rule-drawer.vue';
import { useColumns, useSearchSchema } from './data';

defineOptions({ name: 'MesCodeRule' });

/** 0 正常，1 停用 */
const STATUS_NORMAL = '0';
const STATUS_DISABLED = '1';

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: CodeRuleDrawer,
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
          return await listCodeRule({
            ...toPageQuery(page, sorts),
            ...formValues,
          });
        },
      },
      sort: true,
    },
    rowConfig: { isHover: true, keyField: 'ruleId' },
    sortConfig: { remote: true },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<CodeRuleApi.CodeRule>,
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

function onEdit(row: CodeRuleApi.CodeRule) {
  drawerApi.setData({ ruleId: row.ruleId }).open();
}

/** 删除内置规则时说明影响 */
function deleteConfirmText(row: CodeRuleApi.CodeRule) {
  return row.builtin
    ? $t('mes.codeRule.confirmDeleteBuiltin', { name: row.ruleName })
    : $t('crud.confirmDelete', { name: row.ruleName });
}

async function onDelete(row: CodeRuleApi.CodeRule) {
  await removeCodeRule([row.ruleId]);
  message.success($t('crud.deleted'));
  reload();
}

function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as CodeRuleApi.CodeRule[];
  if (rows.length === 0) {
    return;
  }
  const builtin = rows.filter((row) => row.builtin).length;
  Modal.confirm({
    content:
      builtin > 0
        ? $t('mes.codeRule.confirmBatchDeleteBuiltin', {
            builtin,
            count: rows.length,
          })
        : $t('crud.confirmBatchDelete', { count: rows.length }),
    okButtonProps: { danger: true },
    okText: $t('crud.batchDelete'),
    async onOk() {
      await removeCodeRule(rows.map((row) => row.ruleId));
      message.success($t('crud.deleted'));
      reload();
    },
  });
}

async function onPreview(row: CodeRuleApi.CodeRule) {
  const code = await previewCodeRule(row.ruleId);
  Modal.info({
    content: $t(
      row.status === STATUS_NORMAL
        ? 'mes.codeRule.previewResult'
        : 'mes.codeRule.previewDisabled',
      { code },
    ),
    title: $t('mes.codeRule.previewTitle', { name: row.ruleName }),
  });
}

async function onStatusChange(row: CodeRuleApi.CodeRule, checked: boolean) {
  const status = checked ? STATUS_NORMAL : STATUS_DISABLED;
  switching.value.add(row.ruleId);
  try {
    // 没有单独修改状态的接口，带上整行数据修改
    await updateCodeRule({
      ...row,
      datePattern: row.datePattern ?? '',
      status,
    });
    row.status = status;
    message.success(
      $t(checked ? 'crud.enabledName' : 'crud.disabledName', {
        name: row.ruleName,
      }),
    );
  } finally {
    switching.value.delete(row.ruleId);
  }
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Grid :table-title="$t('mes.codeRule.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <Button
            v-if="hasPermission('mes:codeRule:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('mes.codeRule.create') }}
          </Button>
          <Button
            v-if="hasPermission('mes:codeRule:remove')"
            :disabled="selectedCount === 0"
            danger
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </Button>
        </div>
      </template>

      <template #ruleCode="{ row }">
        <span class="font-mono">{{ row.ruleCode }}</span>
        <Tag v-if="row.builtin" class="ml-2" color="blue">
          {{ $t('mes.codeRule.builtin') }}
        </Tag>
      </template>

      <template #resetCycle="{ row }">
        <EnumTag :value="row.resetCycle" type="ResetCycle" />
      </template>

      <template #status="{ row }">
        <Switch
          :checked="row.status === STATUS_NORMAL"
          :disabled="!hasPermission('mes:codeRule:edit')"
          :loading="switching.has(row.ruleId)"
          @change="(checked) => onStatusChange(row, checked as boolean)"
        />
      </template>

      <template #actions="{ row }">
        <Button
          v-if="hasPermission('mes:codeRule:query')"
          size="small"
          type="link"
          @click="onPreview(row)"
        >
          {{ $t('mes.codeRule.preview') }}
        </Button>
        <Button
          v-if="hasPermission('mes:codeRule:edit')"
          size="small"
          type="link"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </Button>
        <Popconfirm
          v-if="hasPermission('mes:codeRule:remove')"
          :ok-button-props="{ danger: true }"
          :ok-text="$t('mes.codeRule.delete')"
          :title="deleteConfirmText(row)"
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
