<script lang="ts" setup>
import type { CodeRuleApi } from '@tuoyu/shared/api/mes/codeRule';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import {
  listCodeRule,
  previewCodeRule,
  removeCodeRule,
  updateCodeRule,
} from '@tuoyu/shared/api/mes/codeRule';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import {
  ElButton,
  ElMessage,
  ElMessageBox,
  ElPopconfirm,
  ElSwitch,
  ElTag,
} from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

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
    // 内置规则供系统单据生成编号，不能删除（只能修改或停用），不参与勾选
    checkboxConfig: {
      checkMethod: ({ row }) => !row.builtin,
      highlight: true,
    },
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

async function onDelete(row: CodeRuleApi.CodeRule) {
  await removeCodeRule([row.ruleId]);
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as CodeRuleApi.CodeRule[];
  if (rows.length === 0) {
    return;
  }
  try {
    await ElMessageBox.confirm(
      $t('crud.confirmBatchDelete', { count: rows.length }),
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
  await removeCodeRule(rows.map((row) => row.ruleId));
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onPreview(row: CodeRuleApi.CodeRule) {
  const code = await previewCodeRule(row.ruleId);
  try {
    await ElMessageBox.alert(
      $t(
        row.status === STATUS_NORMAL
          ? 'mes.codeRule.previewResult'
          : 'mes.codeRule.previewDisabled',
        { code },
      ),
      $t('mes.codeRule.previewTitle', { name: row.ruleName }),
      { confirmButtonText: $t('common.confirm'), type: 'info' },
    );
  } catch {
    // 关闭
  }
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
    ElMessage.success(
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
          <ElButton
            v-if="hasPermission('mes:codeRule:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('mes.codeRule.create') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('mes:codeRule:remove')"
            :disabled="selectedCount === 0"
            plain
            type="danger"
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </ElButton>
        </div>
      </template>

      <template #ruleCode="{ row }">
        <span class="font-mono">{{ row.ruleCode }}</span>
        <ElTag v-if="row.builtin" class="ml-2" type="primary">
          {{ $t('mes.codeRule.builtin') }}
        </ElTag>
      </template>

      <template #resetCycle="{ row }">
        <EnumTag :value="row.resetCycle" type="ResetCycle" />
      </template>

      <template #status="{ row }">
        <ElSwitch
          :disabled="!hasPermission('mes:codeRule:edit')"
          :loading="switching.has(row.ruleId)"
          :model-value="row.status === STATUS_NORMAL"
          @change="(checked) => onStatusChange(row, checked as boolean)"
        />
      </template>

      <template #actions="{ row }">
        <ElButton
          v-if="hasPermission('mes:codeRule:query')"
          link
          size="small"
          type="primary"
          @click="onPreview(row)"
        >
          {{ $t('mes.codeRule.preview') }}
        </ElButton>
        <ElButton
          v-if="hasPermission('mes:codeRule:edit')"
          link
          size="small"
          type="primary"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </ElButton>
        <ElPopconfirm
          v-if="hasPermission('mes:codeRule:remove') && !row.builtin"
          :cancel-button-text="$t('common.cancel')"
          :confirm-button-text="$t('mes.codeRule.delete')"
          :title="$t('crud.confirmDelete', { name: row.ruleName })"
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
  </Page>
</template>
