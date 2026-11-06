<script lang="ts" setup>
import type { ProcessDrawerData } from '../task/task-utils';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { InstanceApi } from '#/api/workflow/instance';

import { reactive, ref } from 'vue';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';

import {
  Button,
  Input,
  message,
  Modal,
  Popconfirm,
  Radio,
  Switch,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  activeInstance,
  invalidInstance,
  listFinishedInstance,
  listRunningInstance,
  removeFinishedInstance,
  removeInstance,
} from '#/api/workflow/instance';
import { $t } from '#/locales';
import { hasPermission } from '#/utils/permission';

import CategoryTree from '../components/category-tree.vue';
import ProcessDrawer from '../components/process-drawer.vue';
import { useInstanceColumns, useInstanceSearchSchema } from '../task/data';
import { businessLabel } from '../task/task-utils';
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
            pageNum: page.currentPage,
            pageSize: page.pageSize,
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
  message.success($t('crud.deleted'));
  reload();
}

function onBatchDelete() {
  const rows = selectedRows();
  if (rows.length === 0) {
    return;
  }
  Modal.confirm({
    content: $t('workflow.processInstance.confirmBatchDelete', {
      count: rows.length,
    }),
    okButtonProps: { danger: true },
    okText: $t('crud.batchDelete'),
    async onOk() {
      await remove(rows.map((row) => row.id));
    },
  });
}

async function onActiveChange(row: InstanceApi.Instance, checked: boolean) {
  switching.value.add(row.id);
  try {
    await activeInstance(row.id, checked);
    row.activityStatus = checked ? ACTIVE : 0;
    message.success(
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
    message.success($t('workflow.processInstance.invalidated'));
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
              <Radio.Group
                v-model:value="tab"
                button-style="solid"
                @change="onTabChange"
              >
                <Radio.Button value="running">
                  {{ $t('workflow.processInstance.running') }}
                </Radio.Button>
                <Radio.Button value="finished">
                  {{ $t('workflow.processInstance.finished') }}
                </Radio.Button>
              </Radio.Group>
              <Button
                v-if="hasPermission('workflow:instance:remove')"
                :disabled="selectedCount === 0"
                danger
                @click="onBatchDelete"
              >
                {{ $t('crud.batchDelete') }}
              </Button>
            </div>
          </template>

          <template #activityStatus="{ row }">
            <Switch
              :checked="row.activityStatus === ACTIVE"
              :checked-children="$t('workflow.common.active')"
              :disabled="!hasPermission('workflow:instance:active')"
              :loading="switching.has(row.id)"
              :un-checked-children="$t('workflow.common.suspend')"
              @change="(checked) => onActiveChange(row, checked as boolean)"
            />
          </template>

          <template #actions="{ row }">
            <Button
              v-if="hasPermission('workflow:instance:query')"
              size="small"
              type="link"
              @click="onView(row)"
            >
              {{ $t('workflow.task.view') }}
            </Button>
            <Button
              v-if="hasPermission('workflow:instance:variableQuery')"
              size="small"
              type="link"
              @click="onVariables(row)"
            >
              {{ $t('workflow.processInstance.variables') }}
            </Button>
            <Button
              v-if="
                tab === 'running' && hasPermission('workflow:instance:invalid')
              "
              danger
              size="small"
              type="link"
              @click="openInvalid(row)"
            >
              {{ $t('workflow.processInstance.invalid') }}
            </Button>
            <Popconfirm
              v-if="hasPermission('workflow:instance:remove')"
              :description="$t('workflow.processInstance.deleteHelp')"
              :ok-button-props="{ danger: true }"
              :ok-text="$t('workflow.processInstance.delete')"
              :title="$t('crud.confirmDelete', { name: businessLabel(row) })"
              placement="left"
              @confirm="remove([row.id])"
            >
              <Button danger size="small" type="link">
                {{ $t('common.delete') }}
              </Button>
            </Popconfirm>
          </template>
        </Grid>
      </div>
    </div>

    <Modal
      v-model:open="invalid.open"
      :confirm-loading="invalid.saving"
      :ok-button-props="{ danger: true }"
      :ok-text="$t('workflow.processInstance.invalid')"
      :title="
        $t('workflow.processInstance.invalidTitle', {
          name: invalid.row ? businessLabel(invalid.row) : '',
        })
      "
      @ok="onConfirmInvalid"
    >
      <div class="flex flex-col gap-2 py-2">
        <span class="text-muted-foreground text-sm">
          {{ $t('workflow.processInstance.invalidHelp') }}
        </span>
        <Input.TextArea
          v-model:value="invalid.comment"
          :maxlength="500"
          :placeholder="$t('workflow.processInstance.invalidPlaceholder')"
          :rows="3"
          show-count
        />
      </div>
    </Modal>
  </Page>
</template>
