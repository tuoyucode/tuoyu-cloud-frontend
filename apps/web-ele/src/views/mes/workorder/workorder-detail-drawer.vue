<script lang="ts" setup>
import type { MesApi } from '@tuoyu/shared/api/mes/common';
import type { WorkorderApi } from '@tuoyu/shared/api/mes/workorder';

import type { WorkorderAction } from './use-workorder-actions';

import { computed, ref } from 'vue';

import { useVbenDrawer, useVbenModal } from '@vben/common-ui';

import {
  getWorkorder,
  getWorkorderLogs,
} from '@tuoyu/shared/api/mes/workorder';
import { enumLabel } from '@tuoyu/shared/pages/mes/enums';
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
import {
  ElButton,
  ElDescriptions,
  ElDescriptionsItem,
  ElProgress,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
} from 'element-plus';

import { $t } from '#/locales';
import EnumTag from '#/views/mes/_shared/enum-tag.vue';

import { formatQty } from './data';
import ReasonModal from './reason-modal.vue';
import StatusLogTimeline from './status-log-timeline.vue';
import {
  ACTION_LABEL_KEYS,
  availableActions,
  DANGER_ACTIONS,
  useWorkorderActions,
} from './use-workorder-actions';

/** 工单详情：基本信息、工序任务、状态履历，顶部右侧为可执行的状态动作 */
const emit = defineEmits<{ changed: [] }>();

const workorder = ref<WorkorderApi.Workorder>();
const logs = ref<MesApi.StatusLog[]>([]);
const activeTab = ref('tasks');

/** 基本信息的列数：小屏 1 列、中屏 2 列、大屏 3 列 */
const breakpoints = useBreakpoints(breakpointsTailwind);
const isSm = breakpoints.greaterOrEqual('sm');
const isXl = breakpoints.greaterOrEqual('xl');
const descColumns = computed(() => {
  if (isXl.value) {
    return 3;
  }
  return isSm.value ? 2 : 1;
});

const [ReasonDialog, reasonApi] = useVbenModal({
  connectedComponent: ReasonModal,
});

const { run } = useWorkorderActions(
  (data) => reasonApi.setData(data).open(),
  async () => {
    emit('changed');
    await load();
  },
);

const actions = computed(() =>
  availableActions(workorder.value?.workorderStatus),
);

/** 工序任务表中按数量显示的列 */
const QTY_COLUMNS = [
  { label: 'mes.operationTask.qualifiedQty', prop: 'qualifiedQty' },
  { label: 'mes.operationTask.defectQty', prop: 'defectQty' },
  { label: 'mes.operationTask.availableQty', prop: 'availableQty' },
] as const;

async function load() {
  const id = workorder.value?.workorderId;
  if (!id) {
    return;
  }
  drawerApi.lock();
  try {
    const [detail, history] = await Promise.all([
      getWorkorder(id),
      getWorkorderLogs(id),
    ]);
    workorder.value = detail;
    logs.value = history;
  } finally {
    drawerApi.unlock();
  }
}

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    const data = drawerApi.getData() as { workorderId: string };
    workorder.value = {
      workorderId: data.workorderId,
    } as WorkorderApi.Workorder;
    logs.value = [];
    activeTab.value = 'tasks';
    await load();
  },
});

const title = computed(() =>
  workorder.value?.workorderCode
    ? `${$t('mes.workorder.detail')} ${workorder.value.workorderCode}`
    : $t('mes.workorder.detail'),
);

/** 状态动作按钮的类型：危险动作标红，下达为主要按钮 */
function actionType(action: WorkorderAction) {
  if (DANGER_ACTIONS.has(action)) {
    return 'danger';
  }
  return action === 'release' ? 'primary' : 'default';
}

/** 完成率进度条的百分比（0 ~ 100） */
function progressPercent(rate?: null | number | string) {
  return Math.min(100, Math.max(0, Number(rate ?? 0)));
}
</script>

<template>
  <Drawer :title="title" class="w-full max-w-[1000px]">
    <template #extra>
      <div v-if="workorder" class="flex flex-wrap gap-2">
        <ElButton
          v-for="action in actions"
          :key="action"
          :plain="DANGER_ACTIONS.has(action)"
          :type="actionType(action)"
          class="!ml-0"
          @click="run(action, workorder)"
        >
          {{ $t(ACTION_LABEL_KEYS[action]) }}
        </ElButton>
      </div>
    </template>
    <ReasonDialog />
    <template v-if="workorder?.workorderCode">
      <ElDescriptions
        :column="descColumns"
        :title="$t('mes.workorder.basicInfo')"
        border
        size="small"
      >
        <ElDescriptionsItem :label="$t('mes.workorder.workorderCode')">
          {{ workorder.workorderCode }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.workorder.status')">
          <EnumTag :value="workorder.workorderStatus" type="WorkorderStatus" />
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.workorder.batchCode')">
          {{ workorder.batchCode }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.workorder.material')">
          {{ workorder.materialCode }} {{ workorder.materialName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.workorder.specification')">
          {{ workorder.specification }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.workorder.sourceType')">
          {{ enumLabel('WorkorderSource', workorder.sourceType) }}
          {{ workorder.sourceCode }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.workorder.route')">
          {{ workorder.routeName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.workorder.bom')">
          {{ workorder.bomName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.workorder.workshop')">
          {{ workorder.factoryName }} / {{ workorder.workshopName }}
          <template v-if="workorder.lineName">
            / {{ workorder.lineName }}
          </template>
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.workorder.planQty')">
          {{ formatQty(workorder.planQty) }} {{ workorder.unit }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.workorder.completedQty')">
          {{ formatQty(workorder.completedQty) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.workorder.completionRate')">
          <ElProgress
            :percentage="progressPercent(workorder.completionRate)"
            :stroke-width="6"
            class="w-40"
          />
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.workorder.defectQty')">
          {{ formatQty(workorder.defectQty) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.workorder.stockedQty')">
          {{ formatQty(workorder.stockedQty) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.workorder.priority')">
          {{ workorder.priority }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.workorder.planStartTime')">
          {{ workorder.planStartTime }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.workorder.planEndTime')">
          {{ workorder.planEndTime }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.workorder.actualStartTime')">
          {{ workorder.actualStartTime }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('mes.workorder.actualEndTime')">
          {{ workorder.actualEndTime }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('crud.remark')" :span="2">
          <span class="whitespace-pre-wrap">{{ workorder.remark }}</span>
        </ElDescriptionsItem>
      </ElDescriptions>

      <ElTabs v-model="activeTab" class="mt-4">
        <ElTabPane :label="$t('mes.workorder.tasks')" name="tasks">
          <ElTable
            :data="workorder.tasks ?? []"
            :empty-text="$t('mes.workorder.noTasks')"
            row-key="taskId"
            size="small"
          >
            <ElTableColumn
              :label="$t('mes.operationTask.seqNo')"
              prop="seqNo"
              width="80"
            />
            <ElTableColumn
              :label="$t('mes.operationTask.operationName')"
              min-width="120"
              prop="operationName"
            />
            <ElTableColumn
              :label="$t('mes.operationTask.taskCode')"
              min-width="150"
              prop="taskCode"
            />
            <ElTableColumn :label="$t('mes.operationTask.status')" width="100">
              <template #default="{ row }">
                <EnumTag :value="row.taskStatus" type="TaskStatus" />
              </template>
            </ElTableColumn>
            <ElTableColumn
              v-for="column in QTY_COLUMNS"
              :key="column.prop"
              :label="$t(column.label)"
              align="right"
              min-width="90"
            >
              <template #default="{ row }">
                {{ formatQty(row[column.prop]) }}
              </template>
            </ElTableColumn>
            <ElTableColumn
              :label="$t('mes.operationTask.team')"
              min-width="100"
              prop="teamName"
            />
            <ElTableColumn
              :label="$t('mes.operationTask.assignee')"
              min-width="100"
              prop="assigneeUserName"
            />
          </ElTable>
        </ElTabPane>
        <ElTabPane :label="$t('mes.workorder.logs')" name="logs">
          <StatusLogTimeline :logs="logs" status-type="WorkorderStatus" />
        </ElTabPane>
      </ElTabs>
    </template>
  </Drawer>
</template>
