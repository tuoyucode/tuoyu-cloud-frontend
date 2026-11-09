<script lang="ts" setup>
import type { MesApi } from '@tuoyu/shared/api/mes/common';
import type { OperationTaskApi } from '@tuoyu/shared/api/mes/operationTask';
import type { WorkorderApi } from '@tuoyu/shared/api/mes/workorder';

import { computed, ref } from 'vue';

import { useVbenDrawer, useVbenModal } from '@vben/common-ui';

import {
  getWorkorder,
  getWorkorderLogs,
} from '@tuoyu/shared/api/mes/workorder';
import {
  Button,
  Descriptions,
  DescriptionsItem,
  Progress,
  Table,
  TabPane,
  Tabs,
} from 'ant-design-vue';

import { $t } from '#/locales';
import EnumTag from '#/views/mes/_shared/enum-tag.vue';
import { enumLabel } from '#/views/mes/_shared/enums';

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

const taskColumns = computed(() => [
  { dataIndex: 'seqNo', title: $t('mes.operationTask.seqNo'), width: 80 },
  {
    dataIndex: 'operationName',
    title: $t('mes.operationTask.operationName'),
  },
  { dataIndex: 'taskCode', title: $t('mes.operationTask.taskCode') },
  { dataIndex: 'taskStatus', title: $t('mes.operationTask.status') },
  {
    align: 'right' as const,
    dataIndex: 'qualifiedQty',
    title: $t('mes.operationTask.qualifiedQty'),
  },
  {
    align: 'right' as const,
    dataIndex: 'defectQty',
    title: $t('mes.operationTask.defectQty'),
  },
  {
    align: 'right' as const,
    dataIndex: 'availableQty',
    title: $t('mes.operationTask.availableQty'),
  },
  { dataIndex: 'teamName', title: $t('mes.operationTask.team') },
  {
    dataIndex: 'assigneeUserName',
    title: $t('mes.operationTask.assignee'),
  },
]);

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

function taskCell(column: string, record: OperationTaskApi.Task) {
  const value = record[column as keyof OperationTaskApi.Task];
  return typeof value === 'number' ? formatQty(value) : value;
}
</script>

<template>
  <Drawer :title="title" class="w-full max-w-[1000px]">
    <template #extra>
      <div v-if="workorder" class="flex flex-wrap gap-2">
        <Button
          v-for="action in actions"
          :key="action"
          :danger="DANGER_ACTIONS.has(action)"
          :type="action === 'release' ? 'primary' : 'default'"
          @click="run(action, workorder)"
        >
          {{ $t(ACTION_LABEL_KEYS[action]) }}
        </Button>
      </div>
    </template>
    <ReasonDialog />
    <template v-if="workorder?.workorderCode">
      <Descriptions
        :column="{ xs: 1, sm: 2, xl: 3 }"
        :title="$t('mes.workorder.basicInfo')"
        bordered
        size="small"
      >
        <DescriptionsItem :label="$t('mes.workorder.workorderCode')">
          {{ workorder.workorderCode }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.workorder.status')">
          <EnumTag :value="workorder.workorderStatus" type="WorkorderStatus" />
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.workorder.batchCode')">
          {{ workorder.batchCode }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.workorder.material')">
          {{ workorder.materialCode }} {{ workorder.materialName }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.workorder.specification')">
          {{ workorder.specification }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.workorder.sourceType')">
          {{ enumLabel('WorkorderSource', workorder.sourceType) }}
          {{ workorder.sourceCode }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.workorder.route')">
          {{ workorder.routeName }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.workorder.bom')">
          {{ workorder.bomName }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.workorder.workshop')">
          {{ workorder.factoryName }} / {{ workorder.workshopName }}
          <template v-if="workorder.lineName">
            / {{ workorder.lineName }}
          </template>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.workorder.planQty')">
          {{ formatQty(workorder.planQty) }} {{ workorder.unit }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.workorder.completedQty')">
          {{ formatQty(workorder.completedQty) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.workorder.completionRate')">
          <Progress
            :percent="Number(workorder.completionRate ?? 0)"
            class="m-0 w-40"
            size="small"
          />
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.workorder.defectQty')">
          {{ formatQty(workorder.defectQty) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.workorder.stockedQty')">
          {{ formatQty(workorder.stockedQty) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.workorder.priority')">
          {{ workorder.priority }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.workorder.planStartTime')">
          {{ workorder.planStartTime }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.workorder.planEndTime')">
          {{ workorder.planEndTime }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.workorder.actualStartTime')">
          {{ workorder.actualStartTime }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('mes.workorder.actualEndTime')">
          {{ workorder.actualEndTime }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('crud.remark')" :span="2">
          <span class="whitespace-pre-wrap">{{ workorder.remark }}</span>
        </DescriptionsItem>
      </Descriptions>

      <Tabs v-model:active-key="activeTab" class="mt-4">
        <TabPane key="tasks" :tab="$t('mes.workorder.tasks')">
          <Table
            :columns="taskColumns"
            :data-source="workorder.tasks ?? []"
            :locale="{ emptyText: $t('mes.workorder.noTasks') }"
            :pagination="false"
            :scroll="{ x: 900 }"
            row-key="taskId"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <EnumTag
                v-if="column.dataIndex === 'taskStatus'"
                :value="(record as OperationTaskApi.Task).taskStatus"
                type="TaskStatus"
              />
              <template v-else>
                {{
                  taskCell(
                    String(column.dataIndex),
                    record as OperationTaskApi.Task,
                  )
                }}
              </template>
            </template>
          </Table>
        </TabPane>
        <TabPane key="logs" :tab="$t('mes.workorder.logs')">
          <StatusLogTimeline :logs="logs" status-type="WorkorderStatus" />
        </TabPane>
      </Tabs>
    </template>
  </Drawer>
</template>
