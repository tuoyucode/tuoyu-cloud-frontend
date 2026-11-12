<script lang="ts" setup>
import type { UserApi } from '@tuoyu/shared/api/system/user';
import type { TaskApi } from '@tuoyu/shared/api/workflow/task';
import type { ProcessDrawerData } from '@tuoyu/shared/pages/workflow/task-utils';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, reactive, ref } from 'vue';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';

import {
  listAllFinishedTask,
  listAllWaitingTask,
  updateTaskAssignee,
  urgeTask,
} from '@tuoyu/shared/api/workflow/task';
import {
  DEFAULT_MESSAGE_TYPES,
  MESSAGE_TYPES,
} from '@tuoyu/shared/pages/workflow/task-utils';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import {
  ElButton,
  ElCheckbox,
  ElCheckboxGroup,
  ElDialog,
  ElInput,
  ElMessage,
  ElRadioButton,
  ElRadioGroup,
} from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import ProcessDrawer from '../components/process-drawer.vue';
import UserSelectModal from '../components/user-select-modal.vue';
import {
  useFinishedColumns,
  useTaskSearchSchema,
  useWaitingColumns,
} from './data';

defineOptions({ name: 'WorkflowAllTaskWaiting' });

/** 流程监控中的任务：待办与已办 */
type TaskTab = 'finished' | 'waiting';

const tab = ref<TaskTab>('waiting');
const selectedCount = ref(0);

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: ProcessDrawer,
  destroyOnClose: true,
});

const [UserModal, userModalApi] = useVbenModal({
  connectedComponent: UserSelectModal,
  destroyOnClose: true,
});

/** 修改办理人、催办的目标任务 */
const targetTaskIds = ref<string[]>([]);

const urge = reactive({
  message: '',
  messageType: [...DEFAULT_MESSAGE_TYPES],
  open: false,
  saving: false,
});

const messageTypeOptions = computed(() =>
  MESSAGE_TYPES.map((value) => ({
    label: $t(`workflow.common.messageType${value}`),
    value,
  })),
);

const canEdit = computed(() => hasPermission('workflow:task:edit'));

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useTaskSearchSchema(),
    submitOnChange: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  },
  gridEvents: {
    checkboxAll: updateSelectedCount,
    checkboxChange: updateSelectedCount,
  },
  gridOptions: {
    checkboxConfig: { highlight: true },
    columns: useWaitingColumns({ assignee: true, checkbox: true }),
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
          };
          return await (tab.value === 'waiting'
            ? listAllWaitingTask(query)
            : listAllFinishedTask(query));
        },
      },
    },
    rowConfig: { isHover: true, keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<TaskApi.HisTask | TaskApi.Task>,
});

function selectedTasks() {
  return gridApi.grid.getCheckboxRecords() as TaskApi.Task[];
}

function updateSelectedCount() {
  selectedCount.value = selectedTasks().length;
}

function reload() {
  gridApi.query();
}

function onTabChange() {
  gridApi.setGridOptions({
    columns:
      tab.value === 'waiting'
        ? useWaitingColumns({ assignee: true, checkbox: true })
        : useFinishedColumns(),
  });
  gridApi.reload();
}

function onView(row: TaskApi.HisTask | TaskApi.Task) {
  const data: ProcessDrawerData = {
    businessId: row.businessId,
    formPath: row.formPath,
    instanceId: row.instanceId,
    summary: {
      businessCode: row.businessCode,
      businessTitle: row.businessTitle,
      createByName: row.createByName,
      createTime: row.createTime,
      flowName: row.flowName,
      nodeName: row.nodeName,
    },
  };
  drawerApi.setData(data).open();
}

function openAssignee(taskIds: string[]) {
  if (taskIds.length === 0) {
    return;
  }
  targetTaskIds.value = taskIds;
  userModalApi
    .setData({ multiple: false, title: $t('workflow.task.selectAssignee') })
    .open();
}

async function onAssigneeSelected(users: UserApi.Option[]) {
  const user = users[0];
  if (!user || targetTaskIds.value.length === 0) {
    return;
  }
  await updateTaskAssignee(targetTaskIds.value, user.userId);
  ElMessage.success(
    $t('workflow.task.assigneeUpdated', { name: user.nickName }),
  );
  reload();
}

function openUrge(taskIds: string[]) {
  if (taskIds.length === 0) {
    return;
  }
  targetTaskIds.value = taskIds;
  urge.message = '';
  urge.messageType = [...DEFAULT_MESSAGE_TYPES];
  urge.open = true;
}

async function onConfirmUrge() {
  if (!urge.message.trim()) {
    ElMessage.warning($t('workflow.task.urgeMessageRequired'));
    return;
  }
  if (urge.messageType.length === 0) {
    ElMessage.warning($t('workflow.task.urgeTypeRequired'));
    return;
  }
  urge.saving = true;
  try {
    await urgeTask(targetTaskIds.value, urge.message, urge.messageType);
    ElMessage.success($t('workflow.task.urged'));
    urge.open = false;
  } finally {
    urge.saving = false;
  }
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <UserModal @select="onAssigneeSelected" />
    <Grid :table-title="$t('workflow.task.allList')">
      <template #toolbar-actions>
        <div class="flex flex-wrap items-center gap-2">
          <ElRadioGroup v-model="tab" @change="onTabChange">
            <ElRadioButton value="waiting">
              {{ $t('workflow.task.tabWaiting') }}
            </ElRadioButton>
            <ElRadioButton value="finished">
              {{ $t('workflow.task.tabFinished') }}
            </ElRadioButton>
          </ElRadioGroup>
          <template v-if="tab === 'waiting' && canEdit">
            <ElButton
              :disabled="selectedCount === 0"
              @click="openAssignee(selectedTasks().map((task) => task.id))"
            >
              {{ $t('workflow.task.batchAssignee') }}
            </ElButton>
            <ElButton
              :disabled="selectedCount === 0"
              @click="openUrge(selectedTasks().map((task) => task.id))"
            >
              {{ $t('workflow.task.batchUrge') }}
            </ElButton>
          </template>
        </div>
      </template>

      <template #actions="{ row }">
        <ElButton link size="small" type="primary" @click="onView(row)">
          {{ $t('workflow.task.view') }}
        </ElButton>
        <template v-if="tab === 'waiting' && canEdit">
          <ElButton
            link
            size="small"
            type="primary"
            @click="openAssignee([row.id])"
          >
            {{ $t('workflow.task.changeAssignee') }}
          </ElButton>
          <ElButton
            link
            size="small"
            type="primary"
            @click="openUrge([row.id])"
          >
            {{ $t('workflow.task.urge') }}
          </ElButton>
        </template>
      </template>
    </Grid>

    <ElDialog
      v-model="urge.open"
      :title="$t('workflow.task.urgeTitle', { count: targetTaskIds.length })"
      append-to-body
      width="520px"
    >
      <div class="flex flex-col gap-3">
        <ElInput
          v-model="urge.message"
          :maxlength="200"
          :placeholder="$t('workflow.task.urgePlaceholder')"
          :rows="3"
          show-word-limit
          type="textarea"
        />
        <div class="flex flex-wrap items-center gap-2">
          <span>{{ $t('workflow.common.notify') }}</span>
          <ElCheckboxGroup v-model="urge.messageType">
            <ElCheckbox
              v-for="option in messageTypeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </ElCheckboxGroup>
        </div>
      </div>
      <template #footer>
        <ElButton @click="urge.open = false">
          {{ $t('common.cancel') }}
        </ElButton>
        <ElButton :loading="urge.saving" type="primary" @click="onConfirmUrge">
          {{ $t('workflow.task.sendUrge') }}
        </ElButton>
      </template>
    </ElDialog>
  </Page>
</template>
