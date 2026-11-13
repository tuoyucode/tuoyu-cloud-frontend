<script lang="ts" setup>
import type { AndonRuleApi } from '@tuoyu/shared/api/mes/andonRule';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import {
  listAndonRule,
  removeAndonRule,
  updateAndonRule,
} from '@tuoyu/shared/api/mes/andonRule';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import {
  ElButton,
  ElMessage,
  ElMessageBox,
  ElPopconfirm,
  ElSwitch,
} from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import EnumTag from '../_shared/enum-tag.vue';
import AndonRuleDrawer from './andon-rule-drawer.vue';
import { toFormValues, toRuleForm, useColumns, useSearchSchema } from './data';

defineOptions({ name: 'MesAndonRule' });

/** 0 正常，1 停用 */
const STATUS_NORMAL = '0';
const STATUS_DISABLED = '1';

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: AndonRuleDrawer,
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
          return await listAndonRule({
            ...toPageQuery(page, sorts),
            ...formValues,
          });
        },
      },
      sort: true,
    },
    rowConfig: { isHover: true, keyField: 'andonRuleId' },
    sortConfig: { remote: true },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<AndonRuleApi.Rule>,
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

function onEdit(row: AndonRuleApi.Rule) {
  drawerApi.setData({ andonRuleId: row.andonRuleId }).open();
}

async function onDelete(row: AndonRuleApi.Rule) {
  await removeAndonRule([row.andonRuleId]);
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as AndonRuleApi.Rule[];
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
  await removeAndonRule(rows.map((row) => row.andonRuleId));
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onStatusChange(row: AndonRuleApi.Rule, checked: boolean) {
  const status = checked ? STATUS_NORMAL : STATUS_DISABLED;
  switching.value.add(row.andonRuleId);
  try {
    // 没有单独修改状态的接口，带上整行数据修改
    await updateAndonRule({
      ...toRuleForm({ ...toFormValues(row), status }),
      andonRuleId: row.andonRuleId,
    });
    row.status = status;
    ElMessage.success(
      $t(checked ? 'crud.enabledName' : 'crud.disabledName', {
        name: row.ruleName,
      }),
    );
  } finally {
    switching.value.delete(row.andonRuleId);
  }
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Grid :table-title="$t('mes.andonRule.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <ElButton
            v-if="hasPermission('mes:andonRule:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('mes.andonRule.create') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('mes:andonRule:remove')"
            :disabled="selectedCount === 0"
            plain
            type="danger"
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </ElButton>
        </div>
      </template>

      <template #eventType="{ row }">
        <EnumTag v-if="row.eventType" :value="row.eventType" type="AndonType" />
        <span v-else class="text-muted-foreground">
          {{ $t('mes.andonRule.allTypes') }}
        </span>
      </template>

      <template #eventLevel="{ row }">
        <EnumTag
          v-if="row.eventLevel"
          :value="row.eventLevel"
          type="AndonLevel"
        />
        <span v-else class="text-muted-foreground">
          {{ $t('mes.andonRule.allLevels') }}
        </span>
      </template>

      <template #escalateLevel="{ row }">
        <EnumTag
          v-if="row.escalateLevel"
          :value="row.escalateLevel"
          type="AndonLevel"
        />
        <span v-else class="text-muted-foreground">
          {{ $t('mes.andonRule.remindOnly') }}
        </span>
      </template>

      <template #status="{ row }">
        <ElSwitch
          :disabled="!hasPermission('mes:andonRule:edit')"
          :loading="switching.has(row.andonRuleId)"
          :model-value="row.status === STATUS_NORMAL"
          @change="(checked) => onStatusChange(row, checked as boolean)"
        />
      </template>

      <template #actions="{ row }">
        <ElButton
          v-if="hasPermission('mes:andonRule:edit')"
          link
          size="small"
          type="primary"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </ElButton>
        <ElPopconfirm
          v-if="hasPermission('mes:andonRule:remove')"
          :cancel-button-text="$t('common.cancel')"
          :confirm-button-text="$t('mes.andonRule.delete')"
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
