<script lang="ts" setup>
import type { UserApi } from '@tuoyu/shared/api/system/user';
import type { InstanceApi } from '@tuoyu/shared/api/workflow/instance';
import type { TaskApi } from '@tuoyu/shared/api/workflow/task';

import type { ProcessDrawerData } from '../task/task-utils';

import { computed, reactive, ref } from 'vue';

import { useVbenDrawer, useVbenModal } from '@vben/common-ui';

import { DictType } from '@tuoyu/shared/api/system/dict';
import { getInstanceHistory } from '@tuoyu/shared/api/workflow/instance';
import {
  backTask,
  ButtonCode,
  completeTask,
  getTask,
  listBackNodes,
  listNextNodes,
  listTaskAssignees,
  operateTask,
  terminateTask,
} from '@tuoyu/shared/api/workflow/task';
import {
  Alert,
  Button,
  Checkbox,
  Descriptions,
  DescriptionsItem,
  Empty,
  Input,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Timeline,
  TimelineItem,
} from 'ant-design-vue';

import DictTag from '#/components/dict-tag.vue';
import { $t } from '#/locales';
import { resolveBusinessForm } from '#/router/business-form';

import {
  buildAssigneeMap,
  businessLabel,
  DEFAULT_MESSAGE_TYPES,
  MESSAGE_TYPES,
  missingAssigneeNodes,
  TASK_WAITING,
  variableName,
  visibleButtonCodes,
} from '../task/task-utils';
import UserSelectModal from './user-select-modal.vue';
import WarmFlowFrame from './warm-flow-frame.vue';

const emit = defineEmits<{ success: [] }>();

/** 用户选择用于哪个操作 */
type PickPurpose =
  | 'addSign'
  | 'copy'
  | 'delegate'
  | 'transfer'
  | `next:${string}`;

const data = ref<ProcessDrawerData>();
const task = ref<TaskApi.Task>();
const history = ref<InstanceApi.HisTask[]>([]);
const instanceId = ref<string>();
const loading = ref(false);
const historyAllowed = ref(true);
const activeTab = ref('history');
/** 流程图在第一次切换到该页时才加载 */
const chartOpened = ref(false);

const form = reactive({
  copyUsers: [] as { nickName?: string; userId: string }[],
  message: '',
  messageType: [...DEFAULT_MESSAGE_TYPES],
});

/** 弹窗选人：下一节点与每个节点选中的用户 */
const nextNodes = ref<TaskApi.FlowNode[]>([]);
const nextSelected = ref<
  Record<string, { nickName: string; userId: string }[]>
>({});

/** 退回 */
const backOpen = ref(false);
const backNodes = ref<TaskApi.FlowNode[]>([]);
const backNode = ref<string>();

/** 减签 */
const subSignOpen = ref(false);
const assignees = ref<TaskApi.Assignee[]>([]);
const subSignUsers = ref<string[]>([]);

const pickPurpose = ref<PickPurpose>();

const [UserModal, userModalApi] = useVbenModal({
  connectedComponent: UserSelectModal,
  destroyOnClose: true,
});

const approving = computed(() => !!data.value?.approve && !!task.value);

const buttons = computed(() => visibleButtonCodes(task.value?.buttonList));

/** 业务详情：列表传入的表单路径优先，办理时也可以取任务上的 */
const formPath = computed(
  () => data.value?.formPath?.trim() || task.value?.formPath?.trim() || '',
);
const businessForm = computed(() => resolveBusinessForm(formPath.value));

const summary = computed(() => ({
  ...data.value?.summary,
  ...(task.value
    ? {
        businessCode: task.value.businessCode,
        businessTitle: task.value.businessTitle,
        createByName: task.value.createByName,
        createTime: task.value.createTime,
        flowName: task.value.flowName,
        flowStatus: task.value.flowStatus,
        nodeName: task.value.nodeName,
      }
    : {}),
}));

const messageTypeOptions = computed(() =>
  MESSAGE_TYPES.map((value) => ({
    label: $t(`workflow.common.messageType${value}`),
    value,
  })),
);

function resetState() {
  task.value = undefined;
  history.value = [];
  instanceId.value = data.value?.instanceId;
  activeTab.value = resolveBusinessForm(data.value?.formPath)
    ? 'business'
    : 'history';
  chartOpened.value = false;
  form.copyUsers = [];
  form.message = '';
  form.messageType = [...DEFAULT_MESSAGE_TYPES];
  nextNodes.value = [];
  nextSelected.value = {};
}

async function loadHistory(businessId: string) {
  // 审批记录：发起人、办理人、抄送人与流程管理员可以查看，由后端按流程参与关系校验
  try {
    const result = await getInstanceHistory(businessId);
    historyAllowed.value = true;
    history.value = result.list ?? [];
    instanceId.value = instanceId.value || String(result.instanceId);
  } catch {
    historyAllowed.value = false;
  }
}

async function load() {
  const current = data.value;
  if (!current) {
    return;
  }
  loading.value = true;
  try {
    const [loadedTask] = await Promise.all([
      current.taskId && current.approve ? getTask(current.taskId) : undefined,
      loadHistory(current.businessId),
    ]);
    task.value = loadedTask;
    // 列表没有传入表单路径、任务上有时，同样默认显示业务详情
    if (activeTab.value === 'history' && businessForm.value) {
      activeTab.value = 'business';
    }
    if (loadedTask) {
      instanceId.value = instanceId.value || String(loadedTask.instanceId);
      form.copyUsers = (loadedTask.copyList ?? []).map((item) => ({
        nickName: item.nickName,
        userId: String(item.userId),
      }));
      if (visibleButtonCodes(loadedTask.buttonList).has(ButtonCode.POP)) {
        nextNodes.value = await listNextNodes(loadedTask.id);
      }
    }
  } finally {
    loading.value = false;
  }
}

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    data.value = drawerApi.getData() as ProcessDrawerData;
    resetState();
    drawerApi.setState({ footer: !!data.value?.approve });
    load();
  },
});

function onTabChange(key: number | string) {
  if (key === 'chart') {
    chartOpened.value = true;
  }
}

function openUserPicker(
  purpose: PickPurpose,
  multiple: boolean,
  title: string,
) {
  pickPurpose.value = purpose;
  userModalApi
    .setData({
      excludeIds: purpose === 'copy' ? form.copyUsers.map((u) => u.userId) : [],
      multiple,
      title,
    })
    .open();
}

async function onUsersSelected(users: UserApi.Option[]) {
  const purpose = pickPurpose.value;
  if (!purpose) {
    return;
  }
  if (purpose === 'copy') {
    form.copyUsers = [
      ...form.copyUsers,
      ...users.map((user) => ({
        nickName: user.nickName,
        userId: user.userId,
      })),
    ];
    return;
  }
  if (purpose.startsWith('next:')) {
    const nodeCode = purpose.slice('next:'.length);
    nextSelected.value = {
      ...nextSelected.value,
      [nodeCode]: users.map((user) => ({
        nickName: user.nickName,
        userId: user.userId,
      })),
    };
    return;
  }
  const first = users[0];
  const taskId = task.value?.id;
  if (!taskId || !first) {
    return;
  }
  switch (purpose) {
    case 'addSign': {
      await runAction(() =>
        operateTask('addSignature', {
          message: form.message,
          taskId,
          userIds: users.map((user) => user.userId),
        }),
      );
      break;
    }
    case 'delegate': {
      await runAction(() =>
        operateTask('delegateTask', {
          message: form.message,
          taskId,
          userId: first.userId,
        }),
      );
      break;
    }
    case 'transfer': {
      await runAction(() =>
        operateTask('transferTask', {
          message: form.message,
          taskId,
          userId: first.userId,
        }),
      );
      break;
    }
  }
}

function removeCopyUser(userId: string) {
  form.copyUsers = form.copyUsers.filter((user) => user.userId !== userId);
}

/** 执行办理操作：成功后提示、刷新列表并关闭 */
async function runAction(action: () => Promise<unknown>) {
  drawerApi.lock();
  try {
    await action();
    message.success($t('workflow.common.handled'));
    emit('success');
    drawerApi.close();
  } finally {
    drawerApi.unlock();
  }
}

async function onApprove() {
  const taskId = task.value?.id;
  if (!taskId) {
    return;
  }
  const selected = Object.fromEntries(
    Object.entries(nextSelected.value).map(([code, users]) => [
      code,
      users.map((user) => user.userId),
    ]),
  );
  const missing = missingAssigneeNodes(nextNodes.value, selected);
  if (missing.length > 0) {
    message.warning(
      $t('workflow.common.nextAssigneeRequired', {
        name: missing.map((node) => node.nodeName).join('、'),
      }),
    );
    return;
  }
  const assigneeMap = buildAssigneeMap(nextNodes.value, selected);
  await runAction(() =>
    completeTask({
      assigneeMap:
        Object.keys(assigneeMap).length > 0 ? assigneeMap : undefined,
      flowCopyList: buttons.value.has(ButtonCode.COPY)
        ? form.copyUsers
        : undefined,
      message: form.message,
      messageType: form.messageType,
      taskId,
    }),
  );
}

async function onOpenBack() {
  if (!task.value?.nodeCode) {
    return;
  }
  backNodes.value = await listBackNodes(task.value.id, task.value.nodeCode);
  backNode.value = backNodes.value[0]?.nodeCode;
  backOpen.value = true;
}

async function onConfirmBack() {
  const taskId = task.value?.id;
  const nodeCode = backNode.value;
  if (!taskId || !nodeCode) {
    message.warning($t('workflow.common.backNodeRequired'));
    return;
  }
  backOpen.value = false;
  await runAction(() =>
    backTask({
      message: form.message,
      messageType: form.messageType,
      nodeCode,
      taskId,
    }),
  );
}

async function onOpenSubSign() {
  if (!task.value) {
    return;
  }
  assignees.value = await listTaskAssignees(task.value.id);
  subSignUsers.value = [];
  subSignOpen.value = true;
}

async function onConfirmSubSign() {
  const taskId = task.value?.id;
  if (!taskId || subSignUsers.value.length === 0) {
    message.warning($t('workflow.common.noUserSelected'));
    return;
  }
  subSignOpen.value = false;
  await runAction(() =>
    operateTask('reductionSignature', {
      message: form.message,
      taskId,
      userIds: subSignUsers.value,
    }),
  );
}

function onTerminate() {
  const taskId = task.value?.id;
  if (!taskId) {
    return;
  }
  Modal.confirm({
    content: $t('workflow.common.confirmTerminateHelp'),
    okButtonProps: { danger: true },
    okText: $t('workflow.common.terminate'),
    title: $t('workflow.common.confirmTerminate'),
    async onOk() {
      await runAction(() => terminateTask(taskId, form.message));
    },
  });
}
</script>

<template>
  <Drawer
    :title="
      $t(
        approving
          ? 'workflow.common.handleTitle'
          : 'workflow.common.detailTitle',
      )
    "
    class="w-full max-w-[960px]"
  >
    <UserModal @select="onUsersSelected" />
    <Spin :spinning="loading">
      <div class="flex flex-col gap-4">
        <Descriptions :column="{ xs: 1, sm: 2, md: 3 }" bordered size="small">
          <DescriptionsItem :label="$t('workflow.common.flowName')">
            {{ summary.flowName }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('workflow.common.business')">
            {{ businessLabel({ ...summary, businessId: data?.businessId }) }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('workflow.common.flowStatus')">
            <DictTag
              v-if="summary.flowStatus"
              :dict-type="DictType.WF_BUSINESS_STATUS"
              :value="summary.flowStatus"
            />
          </DescriptionsItem>
          <DescriptionsItem :label="$t('workflow.common.applicant')">
            {{ summary.createByName }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('workflow.common.startTime')">
            {{ summary.createTime }}
          </DescriptionsItem>
          <DescriptionsItem :label="$t('workflow.common.currentNode')">
            {{ summary.nodeName }}
          </DescriptionsItem>
        </Descriptions>

        <div
          v-if="approving"
          class="border-border flex flex-col gap-3 rounded-md border p-4"
        >
          <Alert
            v-if="task?.applyNode"
            :message="$t('workflow.common.applyNodeHelp')"
            show-icon
            type="warning"
          />
          <div class="flex flex-col gap-1">
            <span class="font-medium">{{ $t('workflow.common.opinion') }}</span>
            <Input.TextArea
              v-model:value="form.message"
              :maxlength="500"
              :placeholder="$t('workflow.common.opinionPlaceholder')"
              :rows="3"
              show-count
            />
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-medium">{{ $t('workflow.common.notify') }}</span>
            <Checkbox.Group
              v-model:value="form.messageType"
              :options="messageTypeOptions"
            />
          </div>
          <div
            v-if="buttons.has(ButtonCode.COPY)"
            class="flex flex-wrap items-center gap-2"
          >
            <span class="font-medium">{{ $t('workflow.common.copyTo') }}</span>
            <Tag
              v-for="user in form.copyUsers"
              :key="user.userId"
              closable
              @close="removeCopyUser(user.userId)"
            >
              {{ user.nickName || user.userId }}
            </Tag>
            <Button
              size="small"
              type="dashed"
              @click="
                openUserPicker(
                  'copy',
                  true,
                  $t('workflow.common.selectCopyUsers'),
                )
              "
            >
              {{ $t('workflow.common.addCopyUser') }}
            </Button>
          </div>
          <div v-if="nextNodes.length > 0" class="flex flex-col gap-2">
            <span class="font-medium">
              {{ $t('workflow.common.nextAssignees') }}
            </span>
            <div
              v-for="node in nextNodes"
              :key="node.nodeCode"
              class="flex flex-wrap items-center gap-2"
            >
              <span class="min-w-24">{{ node.nodeName }}</span>
              <template v-if="variableName(node.permissionFlag)">
                <Tag
                  v-for="user in nextSelected[node.nodeCode] ?? []"
                  :key="user.userId"
                >
                  {{ user.nickName }}
                </Tag>
                <Button
                  size="small"
                  type="dashed"
                  @click="
                    openUserPicker(
                      `next:${node.nodeCode}`,
                      true,
                      $t('workflow.common.selectNextAssignees', {
                        name: node.nodeName,
                      }),
                    )
                  "
                >
                  {{ $t('workflow.common.selectAssignee') }}
                </Button>
              </template>
              <span v-else class="text-muted-foreground text-sm">
                {{ $t('workflow.common.assigneeByDesign') }}
              </span>
            </div>
          </div>
        </div>

        <Tabs v-model:active-key="activeTab" @change="onTabChange">
          <Tabs.TabPane
            v-if="formPath"
            key="business"
            :tab="$t('workflow.common.businessDetail')"
          >
            <component
              :is="businessForm"
              v-if="businessForm && data"
              :business-id="data.businessId"
              :instance-id="instanceId"
            />
            <Alert
              v-else
              :message="
                $t('workflow.common.businessFormNotFound', { path: formPath })
              "
              show-icon
              type="warning"
            />
          </Tabs.TabPane>
          <Tabs.TabPane key="history" :tab="$t('workflow.common.history')">
            <Alert
              v-if="!historyAllowed"
              :message="$t('workflow.common.historyNoPermission')"
              show-icon
              type="info"
            />
            <Empty v-else-if="history.length === 0 && !loading" />
            <Timeline v-else class="pt-2">
              <TimelineItem
                v-for="item in history"
                :key="item.id"
                :color="item.flowStatus === TASK_WAITING ? 'blue' : 'gray'"
              >
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-medium">{{ item.nodeName }}</span>
                  <DictTag
                    :dict-type="DictType.WF_TASK_STATUS"
                    :value="item.flowStatus"
                  />
                  <span class="text-muted-foreground text-sm">
                    {{ item.approverName || item.approver }}
                  </span>
                  <span
                    v-if="item.cooperateTypeName"
                    class="text-muted-foreground text-xs"
                  >
                    {{ item.cooperateTypeName }}
                  </span>
                </div>
                <p v-if="item.message" class="mt-1 whitespace-pre-wrap">
                  {{ item.message }}
                </p>
                <p class="text-muted-foreground mt-1 text-xs">
                  {{ item.updateTime || item.createTime }}
                  <template v-if="item.runDuration">
                    ·
                    {{
                      $t('workflow.common.duration', { time: item.runDuration })
                    }}
                  </template>
                </p>
              </TimelineItem>
            </Timeline>
          </Tabs.TabPane>
          <Tabs.TabPane key="chart" :tab="$t('workflow.common.flowChart')">
            <div class="h-[520px]">
              <WarmFlowFrame
                v-if="chartOpened && instanceId"
                :id="instanceId"
                page="FlowChart"
              />
              <Empty v-else-if="!instanceId && !loading" />
            </div>
          </Tabs.TabPane>
        </Tabs>
      </div>
    </Spin>

    <template #footer>
      <Space v-if="approving" wrap>
        <Button
          v-if="buttons.has(ButtonCode.TERMINATION)"
          danger
          @click="onTerminate"
        >
          {{ $t('workflow.common.terminate') }}
        </Button>
        <Button v-if="buttons.has(ButtonCode.SUB_SIGN)" @click="onOpenSubSign">
          {{ $t('workflow.common.subSign') }}
        </Button>
        <Button
          v-if="buttons.has(ButtonCode.ADD_SIGN)"
          @click="
            openUserPicker('addSign', true, $t('workflow.common.addSign'))
          "
        >
          {{ $t('workflow.common.addSign') }}
        </Button>
        <Button
          v-if="buttons.has(ButtonCode.TRUST)"
          @click="
            openUserPicker('delegate', false, $t('workflow.common.delegate'))
          "
        >
          {{ $t('workflow.common.delegate') }}
        </Button>
        <Button
          v-if="buttons.has(ButtonCode.TRANSFER)"
          @click="
            openUserPicker('transfer', false, $t('workflow.common.transfer'))
          "
        >
          {{ $t('workflow.common.transfer') }}
        </Button>
        <Button v-if="buttons.has(ButtonCode.BACK)" danger @click="onOpenBack">
          {{ $t('workflow.common.back') }}
        </Button>
        <Button type="primary" @click="onApprove">
          {{
            task?.applyNode
              ? $t('workflow.common.resubmit')
              : $t('workflow.common.approve')
          }}
        </Button>
      </Space>
    </template>

    <Modal
      v-model:open="backOpen"
      :ok-button-props="{ danger: true }"
      :ok-text="$t('workflow.common.back')"
      :title="$t('workflow.common.backTitle')"
      @ok="onConfirmBack"
    >
      <div class="flex flex-col gap-2 py-2">
        <span>{{ $t('workflow.common.backNode') }}</span>
        <Select
          v-model:value="backNode"
          :options="
            backNodes.map((node) => ({
              label: node.nodeName,
              value: node.nodeCode,
            }))
          "
          :placeholder="$t('crud.selectPlaceholder')"
        />
      </div>
    </Modal>

    <Modal
      v-model:open="subSignOpen"
      :ok-text="$t('workflow.common.subSign')"
      :title="$t('workflow.common.subSignTitle')"
      @ok="onConfirmSubSign"
    >
      <div class="py-2">
        <Checkbox.Group
          v-model:value="subSignUsers"
          :options="
            assignees.map((user) => ({
              label: user.nickName,
              value: String(user.userId),
            }))
          "
          class="flex flex-col gap-2"
        />
        <Empty v-if="assignees.length === 0" />
      </div>
    </Modal>
  </Drawer>
</template>
