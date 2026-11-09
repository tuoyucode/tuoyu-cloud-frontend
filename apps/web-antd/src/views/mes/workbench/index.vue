<script lang="ts" setup>
import type { OperationTaskApi } from '#/api/mes/operationTask';
import type { ProductionReportApi } from '#/api/mes/productionReport';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Empty,
  Input,
  InputNumber,
  message,
  Progress,
  Spin,
} from 'ant-design-vue';

import { listMyOperationTask } from '#/api/mes/operationTask';
import {
  listProductionReport,
  submitProductionReport,
} from '#/api/mes/productionReport';
import { $t } from '#/locales';
import { hasPermission } from '#/utils/permission';
import EnumTag from '#/views/mes/_shared/enum-tag.vue';
import { enumLabel } from '#/views/mes/_shared/enums';
import { formatQty } from '#/views/mes/workorder/data';

defineOptions({ name: 'MesWorkbench' });

/** 工作台只列出还能报工的任务 */
const OPEN_STATUSES = 'pending,dispatched,in_progress';
/** 允许报工的工单状态 */
const REPORTABLE_WORKORDER = new Set(['in_progress', 'released']);
/** 我的任务最多显示的条数 */
const TASK_LIMIT = 50;

const keyword = ref('');
const loading = ref(false);
const tasks = ref<OperationTaskApi.Task[]>([]);
const selectedId = ref<string>();
const submitting = ref(false);
const recent = ref<ProductionReportApi.Report[]>([]);

const qualifiedQty = ref<number>();
const defectQty = ref<number>();
const workMinutes = ref<number>();
const remark = ref('');

const selected = computed(() =>
  tasks.value.find((task) => task.taskId === selectedId.value),
);

/** 本次合计，按 6 位小数取整，避免浮点误差 */
const total = computed(
  () =>
    Math.round(
      (Number(qualifiedQty.value ?? 0) + Number(defectQty.value ?? 0)) * 1e6,
    ) / 1e6,
);

const available = computed(() => Number(selected.value?.availableQty ?? 0));

/** 当前不能提交的原因；为空表示可以提交 */
const blockedReason = computed(() => {
  const task = selected.value;
  if (!task) {
    return $t('mes.workbench.selectTask');
  }
  if (!REPORTABLE_WORKORDER.has(task.workorderStatus ?? '')) {
    return $t('mes.workbench.workorderNotReady', {
      status: enumLabel('WorkorderStatus', task.workorderStatus),
    });
  }
  if (total.value <= 0) {
    return $t('mes.workbench.nothing');
  }
  if (total.value > available.value) {
    return $t('mes.workbench.exceed', { qty: formatQty(available.value) });
  }
  return '';
});

function progress(task: OperationTaskApi.Task) {
  const plan = Number(task.planQty);
  return plan > 0
    ? Math.min(100, Math.round((Number(task.qualifiedQty) / plan) * 100))
    : 0;
}

async function loadTasks() {
  loading.value = true;
  try {
    const page = await listMyOperationTask({
      page: 1,
      pageSize: TASK_LIMIT,
      taskStatus: OPEN_STATUSES,
      workorderCode: keyword.value.trim() || undefined,
    });
    tasks.value = page.items;
    if (!tasks.value.some((task) => task.taskId === selectedId.value)) {
      selectedId.value = tasks.value[0]?.taskId;
      resetForm();
      await loadRecent();
    }
  } finally {
    loading.value = false;
  }
}

async function loadRecent() {
  recent.value = [];
  const taskId = selectedId.value;
  if (!taskId || !hasPermission('mes:productionReport:list')) {
    return;
  }
  const page = await listProductionReport({ page: 1, pageSize: 5, taskId });
  if (taskId === selectedId.value) {
    recent.value = page.items;
  }
}

function resetForm() {
  qualifiedQty.value = undefined;
  defectQty.value = undefined;
  workMinutes.value = undefined;
  remark.value = '';
}

async function onSelect(task: OperationTaskApi.Task) {
  if (task.taskId === selectedId.value) {
    return;
  }
  selectedId.value = task.taskId;
  resetForm();
  await loadRecent();
}

/** 合格数一键填满本工序还能报的数量 */
function fillAvailable() {
  qualifiedQty.value = Math.max(
    0,
    available.value - Number(defectQty.value ?? 0),
  );
}

async function onSubmit() {
  const task = selected.value;
  if (!task || blockedReason.value) {
    return;
  }
  submitting.value = true;
  try {
    await submitProductionReport({
      defectQty: Number(defectQty.value ?? 0),
      qualifiedQty: Number(qualifiedQty.value ?? 0),
      remark: remark.value.trim() || undefined,
      taskId: task.taskId,
      workMinutes: workMinutes.value ?? undefined,
    });
    message.success($t('mes.workbench.submitted'));
    resetForm();
    await loadTasks();
    await loadRecent();
  } finally {
    submitting.value = false;
  }
}

onMounted(loadTasks);
</script>

<template>
  <Page auto-content-height>
    <div class="flex h-full flex-col gap-4 lg:flex-row">
      <!-- 我的任务 -->
      <div class="bg-card flex flex-col rounded-md p-4 lg:w-[420px]">
        <div class="mb-3 flex items-center gap-2">
          <span class="text-lg font-medium">
            {{ $t('mes.workbench.myTasks') }}
          </span>
          <Input.Search
            v-model:value="keyword"
            :placeholder="$t('mes.workbench.searchPlaceholder')"
            allow-clear
            class="flex-1"
            size="large"
            @search="loadTasks"
          />
        </div>
        <Spin :spinning="loading" class="min-h-0 flex-1">
          <div
            class="flex max-h-[calc(100vh-260px)] flex-col gap-2 overflow-y-auto"
          >
            <Empty
              v-if="!loading && tasks.length === 0"
              :description="$t('mes.workbench.noTasks')"
            />
            <button
              v-for="task in tasks"
              :key="task.taskId"
              :class="
                task.taskId === selectedId
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/60'
              "
              class="w-full rounded-md border p-3 text-left transition-colors"
              type="button"
              @click="onSelect(task)"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-mono text-base font-medium">
                  {{ task.workorderCode }}
                </span>
                <EnumTag :value="task.taskStatus" type="TaskStatus" />
              </div>
              <div class="mt-1 text-base">
                {{ $t('mes.workbench.seqNo', { seq: task.seqNo }) }}
                {{ task.operationName }}
                <span
                  v-if="task.lastOperation"
                  class="text-muted-foreground text-xs"
                >
                  （{{ $t('mes.workbench.lastOperation') }}）
                </span>
              </div>
              <div class="text-muted-foreground text-sm">
                {{ task.materialCode }} {{ task.materialName }}
              </div>
              <Progress
                :percent="progress(task)"
                :show-info="false"
                class="m-0"
                size="small"
              />
              <div class="text-muted-foreground flex justify-between text-sm">
                <span>
                  {{ formatQty(task.qualifiedQty) }} /
                  {{ formatQty(task.planQty) }} {{ task.unit }}
                </span>
                <span>
                  {{ $t('mes.workbench.availableQty') }}
                  {{ formatQty(task.availableQty) }}
                </span>
              </div>
            </button>
          </div>
        </Spin>
      </div>

      <!-- 报工表单 -->
      <div class="bg-card flex-1 rounded-md p-4">
        <Empty v-if="!selected" :description="$t('mes.workbench.selectTask')" />
        <template v-else>
          <div
            class="grid grid-cols-2 gap-x-6 gap-y-3 text-base md:grid-cols-3"
          >
            <div>
              <div class="text-muted-foreground text-sm">
                {{ $t('mes.workbench.workorder') }}
              </div>
              <div class="font-mono font-medium">
                {{ selected.workorderCode }}
              </div>
            </div>
            <div>
              <div class="text-muted-foreground text-sm">
                {{ $t('mes.workbench.batchCode') }}
              </div>
              <div class="font-mono">{{ selected.batchCode }}</div>
            </div>
            <div>
              <div class="text-muted-foreground text-sm">
                {{ $t('mes.workbench.operation') }}
              </div>
              <div class="font-medium">
                {{ selected.seqNo }} {{ selected.operationName }}
              </div>
            </div>
            <div>
              <div class="text-muted-foreground text-sm">
                {{ $t('mes.workbench.product') }}
              </div>
              <div>{{ selected.materialCode }} {{ selected.materialName }}</div>
            </div>
            <div>
              <div class="text-muted-foreground text-sm">
                {{ $t('mes.workbench.planQty') }}
              </div>
              <div>{{ formatQty(selected.planQty) }} {{ selected.unit }}</div>
            </div>
            <div>
              <div class="text-muted-foreground text-sm">
                {{ $t('mes.workbench.reported') }}
              </div>
              <div>
                {{ formatQty(selected.qualifiedQty) }} /
                {{ formatQty(selected.defectQty) }}
              </div>
            </div>
            <div>
              <div class="text-muted-foreground text-sm">
                {{ $t('mes.workbench.availableQty') }}
              </div>
              <div class="text-primary text-2xl font-semibold">
                {{ formatQty(selected.availableQty) }}
              </div>
            </div>
            <div>
              <div class="text-muted-foreground text-sm">
                {{ $t('mes.workbench.station') }}
              </div>
              <div>{{ selected.stationName }}</div>
            </div>
            <div>
              <div class="text-muted-foreground text-sm">
                {{ $t('mes.workbench.team') }}
              </div>
              <div>{{ selected.teamName }}</div>
            </div>
          </div>

          <Alert
            v-if="selected.firstInspection === 'Y'"
            :message="$t('mes.workbench.firstInspection')"
            class="mt-4"
            show-icon
            type="info"
          />

          <div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <label class="flex flex-col gap-1">
              <span class="text-base">{{
                $t('mes.workbench.qualifiedQty')
              }}</span>
              <div class="flex gap-2">
                <InputNumber
                  v-model:value="qualifiedQty"
                  :min="0"
                  :precision="6"
                  class="flex-1"
                  size="large"
                />
                <Button size="large" @click="fillAvailable">
                  {{ formatQty(available) }}
                </Button>
              </div>
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-base">{{ $t('mes.workbench.defectQty') }}</span>
              <InputNumber
                v-model:value="defectQty"
                :min="0"
                :precision="6"
                class="w-full"
                size="large"
              />
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-base">{{
                $t('mes.workbench.workMinutes')
              }}</span>
              <InputNumber
                v-model:value="workMinutes"
                :min="0"
                :precision="2"
                class="w-full"
                size="large"
              />
            </label>
            <label class="flex flex-col gap-1 md:col-span-3">
              <span class="text-base">{{ $t('mes.workbench.remark') }}</span>
              <Input.TextArea
                v-model:value="remark"
                :maxlength="500"
                :rows="2"
                size="large"
              />
            </label>
          </div>

          <div class="mt-6 flex flex-wrap items-center gap-4">
            <Button
              :disabled="!!blockedReason"
              :loading="submitting"
              class="h-14 min-w-[200px] text-lg"
              size="large"
              type="primary"
              @click="onSubmit"
            >
              {{ $t('mes.workbench.submit') }}
            </Button>
            <span class="text-base">
              {{ $t('mes.workbench.total', { qty: formatQty(total) }) }}
            </span>
            <span v-if="blockedReason && total > 0" class="text-destructive">
              {{ blockedReason }}
            </span>
          </div>

          <div v-if="hasPermission('mes:productionReport:list')" class="mt-8">
            <div class="mb-2 font-medium">
              {{ $t('mes.workbench.recentReports') }}
            </div>
            <Empty
              v-if="recent.length === 0"
              :description="$t('mes.workbench.noReports')"
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
            />
            <div
              v-for="report in recent"
              :key="report.reportId"
              class="border-border flex flex-wrap items-center gap-x-4 border-b py-2 text-sm"
            >
              <span class="font-mono">{{ report.reportCode }}</span>
              <EnumTag :value="report.reportStatus" type="ReportStatus" />
              <span>
                {{ $t('mes.productionReport.qualifiedQty') }}
                {{ formatQty(report.qualifiedQty) }}
              </span>
              <span>
                {{ $t('mes.productionReport.defectQty') }}
                {{ formatQty(report.defectQty) }}
              </span>
              <span class="text-muted-foreground">
                {{ report.reportUserName }} · {{ report.reportTime }}
              </span>
            </div>
          </div>
        </template>
      </div>
    </div>
  </Page>
</template>
