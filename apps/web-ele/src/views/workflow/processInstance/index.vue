<script lang="ts" setup>
import type { InstanceApi } from '@tuoyu/shared/api/workflow/instance';
import type { ProcessDrawerData } from '@tuoyu/shared/pages/workflow/task-utils';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { reactive, ref } from 'vue';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';

import {
  activeInstance,
  invalidInstance,
  listFinishedInstance,
  listRunningInstance,
  removeFinishedInstance,
  removeInstance,
} from '@tuoyu/shared/api/workflow/instance';
import { businessLabel } from '@tuoyu/shared/pages/workflow/task-utils';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import {
  ElButton,
  ElDialog,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElRadioButton,
  ElRadioGroup,
  ElSwitch,
} from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import ActionConfirm from '../components/action-confirm.vue';
import CategoryTree from '../components/category-tree.vue';
import ProcessDrawer from '../components/process-drawer.vue';
import { useInstanceColumns, useInstanceSearchSchema } from '../task/data';
import VariableModal from './variable-modal.vue';

defineOptions({ name: 'WorkflowProcessInstance' });

/** 运行中、已结束 */
type InstanceTab = 'finished' | 'running';

/** 激活状态：1 激活，0 挂起 */
const ACTIVE = 1;

const tab = ref<InstanceTab>('running');
const category = ref<string>();
const selectedCount = ref(0);
const switching = ref(new Set<string>());

const invalid = reactive({
  comment: '',
  open: false,
  row: undefined as InstanceApi.Instance | undefined,
  saving: false,
});

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: ProcessDrawer,
  destroyOnClose: true,
});

const [VariablesModal, variableModalApi] = useVbenModal({
  connectedComponent: VariableModal,
  destroyOnClose: true,
});

function columnsFor(current: InstanceTab) {
  return useInstanceColumns({
    activity: current === 'running',
    applicant: true,
    checkbox: true,
  });
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useInstanceSearchSchema(false),
    submitOnChange: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  },
  gridEvents: {
    checkboxAll: updateSelectedCount,
    checkboxChange: updateSelectedCount,
  },
  gridOptions: {
    checkboxConfig: { highlight: true },
    columns: columnsFor('running'),
    height: 'auto',
    keepSource: true,
    pagerConfig: { pageSize: 10, pageSizes: [10, 20, 50, 100] },
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          selectedCount.value = 0;
          const query = {
            ...toPageQuery(page),
            ...formValues,
            category: category.value,
          };
          return await (tab.value === 'running'
            ? listRunningInstance(query)
            : listFinishedInstance(query));
        },
      },
    },
    rowConfig: { isHover: true, keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<InstanceApi.Instance>,
});

function selectedRows() {
  return gridApi.grid.getCheckboxRecords() as InstanceApi.Instance[];
}

function updateSelectedCount() {
  selectedCount.value = selectedRows().length;
}

function reload() {
  gridApi.query();
}

function onTabChange() {
  gridApi.setGridOptions({ columns: columnsFor(tab.value) });
  gridApi.reload();
}

function onCategoryChange() {
  gridApi.reload();
}

function onView(row: InstanceApi.Instance) {
  const data: ProcessDrawerData = {
    businessId: row.businessId,
    formPath: row.formPath,
    instanceId: row.id,
    summary: {
      businessCode: row.businessCode,
      businessTitle: row.businessTitle,
      createByName: row.createByName,
      createTime: row.createTime,
      flowName: row.flowName,
      flowStatus: row.flowStatus,
      nodeName: row.nodeName,
    },
  };
  drawerApi.setData(data).open();
}

function onVariables(row: InstanceApi.Instance) {
  variableModalApi.setData({ instanceId: row.id }).open();
}

async function remove(ids: string[]) {
  await (tab.value === 'running'
    ? removeInstance(ids)
    : removeFinishedInstance(ids));
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onBatchDelete() {
  const rows = selectedRows();
  if (rows.length === 0) {
    return;
  }
  try {
    await ElMessageBox.confirm(
      $t('workflow.processInstance.confirmBatchDelete', {
        count: rows.length,
      }),
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
  await remove(rows.map((row) => row.id));
}

async function onActiveChange(row: InstanceApi.Instance, checked: boolean) {
  switching.value.add(row.id);
  try {
    await activeInstance(row.id, checked);
    row.activityStatus = checked ? ACTIVE : 0;
    ElMessage.success(
      $t(
        checked
          ? 'workflow.processInstance.activated'
          : 'workflow.processInstance.suspended',
        { name: businessLabel(row) },
      ),
    );
  } finally {
    switching.value.delete(row.id);
  }
}

function openInvalid(row: InstanceApi.Instance) {
  invalid.row = row;
  invalid.comment = '';
  invalid.open = true;
}

async function onConfirmInvalid() {
  if (!invalid.row) {
    return;
  }
  invalid.saving = true;
  try {
    await invalidInstance(invalid.row.id, invalid.comment);
    ElMessage.success($t('workflow.processInstance.invalidated'));
    invalid.open = false;
    reload();
  } finally {
    invalid.saving = false;
  }
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <VariablesModal />
    <div class="flex h-full gap-3">
      <CategoryTree
        v-model:category="category"
        class="hidden w-60 shrink-0 md:flex"
        @change="onCategoryChange"
      />
      <div class="min-w-0 flex-1">
        <Grid :table-title="$t('workflow.processInstance.list')">
          <template #toolbar-actions>
            <div class="flex flex-wrap items-center gap-2">
              <ElRadioGroup v-model="tab" @change="onTabChange">
                <ElRadioButton value="running">
                  {{ $t('workflow.processInstance.running') }}
                </ElRadioButton>
                <ElRadioButton value="finished">
                  {{ $t('workflow.processInstance.finished') }}
                </ElRadioButton>
              </ElRadioGroup>
              <ElButton
                v-if="hasPermission('workflow:instance:remove')"
                :disabled="selectedCount === 0"
                plain
                type="danger"
                @click="onBatchDelete"
              >
                {{ $t('crud.batchDelete') }}
              </ElButton>
            </div>
          </template>

          <template #activityStatus="{ row }">
            <ElSwitch
              :active-text="$t('workflow.common.active')"
              :disabled="!hasPermission('workflow:instance:active')"
              :inactive-text="$t('workflow.common.suspend')"
              :loading="switching.has(row.id)"
              :model-value="row.activityStatus === ACTIVE"
              inline-prompt
              @change="(checked) => onActiveChange(row, checked as boolean)"
            />
          </template>

          <template #actions="{ row }">
            <ElButton
              v-if="hasPermission('workflow:instance:query')"
              link
              size="small"
              type="primary"
              @click="onView(row)"
            >
              {{ $t('workflow.task.view') }}
            </ElButton>
            <ElButton
              v-if="hasPermission('workflow:instance:variableQuery')"
              link
              size="small"
              type="primary"
              @click="onVariables(row)"
            >
              {{ $t('workflow.processInstance.variables') }}
            </ElButton>
            <ElButton
              v-if="
                tab === 'running' && hasPermission('workflow:instance:invalid')
              "
              link
              size="small"
              type="danger"
              @click="openInvalid(row)"
            >
              {{ $t('workflow.processInstance.invalid') }}
            </ElButton>
            <ActionConfirm
              v-if="hasPermission('workflow:instance:remove')"
              :confirm-text="$t('workflow.processInstance.delete')"
              :description="$t('workflow.processInstance.deleteHelp')"
              :title="$t('crud.confirmDelete', { name: businessLabel(row) })"
              danger
              @confirm="remove([row.id])"
            >
              <ElButton link size="small" type="danger">
                {{ $t('common.delete') }}
              </ElButton>
            </ActionConfirm>
          </template>
        </Grid>
      </div>
    </div>

    <ElDialog
      v-model="invalid.open"
      :title="
        $t('workflow.processInstance.invalidTitle', {
          name: invalid.row ? businessLabel(invalid.row) : '',
        })
      "
      append-to-body
      width="520px"
    >
      <div class="flex flex-col gap-2">
        <span class="text-muted-foreground text-sm">
          {{ $t('workflow.processInstance.invalidHelp') }}
        </span>
        <ElInput
          v-model="invalid.comment"
          :maxlength="500"
          :placeholder="$t('workflow.processInstance.invalidPlaceholder')"
          :rows="3"
          show-word-limit
          type="textarea"
        />
      </div>
      <template #footer>
        <ElButton @click="invalid.open = false">
          {{ $t('common.cancel') }}
        </ElButton>
        <ElButton
          :loading="invalid.saving"
          type="danger"
          @click="onConfirmInvalid"
        >
          {{ $t('workflow.processInstance.invalid') }}
        </ElButton>
      </template>
    </ElDialog>
  </Page>
</template>
