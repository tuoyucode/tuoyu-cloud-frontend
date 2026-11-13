<script lang="ts" setup>
import type { LabelTemplateApi } from '@tuoyu/shared/api/mes/labelTemplate';
import type { LabelPrintRequest } from '@tuoyu/shared/pages/mes/label-print';

import { computed, nextTick, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { toSelectOptions } from '@tuoyu/shared/api/mes/common';
import { getLabelTemplateOptions } from '@tuoyu/shared/api/mes/labelTemplate';
import { getWorkorderOptions } from '@tuoyu/shared/api/mes/workorder';
import {
  expandCopies,
  labelLayout,
  maxCopies,
  printCss,
  printDocument,
} from '@tuoyu/shared/pages/mes/label-layout';
import { printHtml } from '@tuoyu/shared/pages/mes/label-print';
import {
  ElAlert,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElSelect,
} from 'element-plus';

import { $t } from '#/locales';

import LabelSheet from './label-sheet.vue';

/** 选择工单时的状态：生成过序列号的工单 */
const WORKORDER_STATUSES = 'released,in_progress,paused,completed,closed';

const request = ref<LabelPrintRequest>();
const templates = ref<LabelTemplateApi.Template[]>([]);
const templateId = ref<string>();
const labels = ref<LabelTemplateApi.LabelData[]>([]);
const copies = ref(1);
const loading = ref(false);
const workorderId = ref<string>();
const workorderOptions = ref<{ label: string; value: string }[]>([]);
const sheetRef = ref<HTMLElement>();

const template = computed(() =>
  templates.value.find((item) => item.labelTemplateId === templateId.value),
);

const layout = computed(() =>
  template.value ? labelLayout(template.value) : undefined,
);

const printed = computed(() =>
  request.value?.allowCopies
    ? expandCopies(labels.value, copies.value)
    : labels.value,
);

const copiesLimit = computed(() => maxCopies(labels.value.length));

const pageCount = computed(() =>
  layout.value ? Math.ceil(printed.value.length / layout.value.columns) : 0,
);

const templateOptions = computed(() =>
  templates.value.map((item) => ({
    label:
      item.defaultFlag === '1'
        ? `${item.templateName}（${$t('mes.labelTemplate.default')}）`
        : item.templateName,
    value: item.labelTemplateId,
  })),
);

async function loadLabels() {
  const current = request.value;
  if (!current) {
    return;
  }
  labels.value = [];
  if (current.pickWorkorder && !workorderId.value) {
    return;
  }
  loading.value = true;
  try {
    labels.value = await current.loader(workorderId.value);
  } catch {
    // 原因（数量超限、无权访问等）已由请求层提示
  } finally {
    loading.value = false;
  }
}

async function searchWorkorders(keyword?: string) {
  try {
    workorderOptions.value = toSelectOptions(
      await getWorkorderOptions({ keyword, statuses: WORKORDER_STATUSES }),
    );
  } catch {
    workorderOptions.value = [];
  }
}

async function onWorkorderChange(value: unknown) {
  workorderId.value = value ? String(value) : undefined;
  await loadLabels();
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const current = layout.value;
    if (!current || printed.value.length === 0 || !sheetRef.value) {
      ElMessage.warning($t('mes.labelTemplate.nothingToPrint'));
      return;
    }
    await nextTick();
    try {
      await printHtml(
        printDocument(
          sheetRef.value.innerHTML,
          printCss(current),
          template.value?.templateName ?? '',
        ),
      );
    } catch {
      ElMessage.error($t('mes.labelTemplate.printFailed'));
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    request.value = modalApi.getData() as LabelPrintRequest;
    templates.value = [];
    templateId.value = undefined;
    labels.value = [];
    copies.value = 1;
    workorderId.value = undefined;
    modalApi.lock();
    try {
      templates.value = await getLabelTemplateOptions(request.value.target);
      templateId.value = templates.value[0]?.labelTemplateId;
    } catch {
      templates.value = [];
    } finally {
      modalApi.unlock();
    }
    await (request.value.pickWorkorder ? searchWorkorders() : loadLabels());
  },
});
</script>

<template>
  <Modal
    :confirm-disabled="!layout || printed.length === 0"
    :confirm-text="$t('mes.labelTemplate.print')"
    :title="$t('mes.labelTemplate.printTitle')"
    class="w-full max-w-[880px]"
  >
    <ElAlert
      v-if="templates.length === 0"
      :closable="false"
      :title="$t('mes.labelTemplate.noTemplate')"
      class="mb-4"
      show-icon
      type="warning"
    />
    <ElForm label-position="top">
      <div class="grid grid-cols-1 gap-x-4 md:grid-cols-3">
        <ElFormItem :label="$t('mes.labelTemplate.template')">
          <ElSelect
            v-model="templateId"
            :placeholder="$t('crud.selectPlaceholder')"
            class="w-full"
          >
            <ElOption
              v-for="option in templateOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem
          v-if="request?.pickWorkorder"
          :label="$t('mes.labelTemplate.workorder')"
        >
          <ElSelect
            :model-value="workorderId"
            :placeholder="$t('mes.labelTemplate.workorderPlaceholder')"
            :remote-method="searchWorkorders"
            class="w-full"
            clearable
            filterable
            remote
            remote-show-suffix
            @change="onWorkorderChange"
          >
            <ElOption
              v-for="option in workorderOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem
          v-if="request?.allowCopies"
          :label="$t('mes.labelTemplate.copies')"
        >
          <ElInputNumber
            v-model="copies"
            :max="copiesLimit"
            :min="1"
            :precision="0"
            class="w-full"
            controls-position="right"
          />
        </ElFormItem>
      </div>
    </ElForm>

    <p v-if="layout" class="text-muted-foreground mb-2 text-sm">
      {{
        $t('mes.labelTemplate.printSummary', {
          count: printed.length,
          pages: pageCount,
          width: layout.page.width,
          height: layout.page.height,
        })
      }}
    </p>
    <p v-if="layout" class="text-muted-foreground mb-3 text-xs">
      {{
        $t('mes.labelTemplate.printHint', {
          width: layout.page.width,
          height: layout.page.height,
        })
      }}
    </p>

    <div v-loading="loading">
      <div class="mes-label-preview bg-muted max-h-[420px] overflow-auto p-3">
        <ElEmpty
          v-if="printed.length === 0 || !layout || !template"
          :description="
            request?.pickWorkorder && !workorderId
              ? $t('mes.labelTemplate.pickWorkorderFirst')
              : $t('mes.labelTemplate.noLabels')
          "
          :image-size="60"
        />
        <div v-else ref="sheetRef">
          <LabelSheet :labels="printed" :layout="layout" :template="template" />
        </div>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
/* 预览：标签画出边框、页与页之间留白；打印时不复制这些样式 */
.mes-label-preview :deep(.mes-label-page) {
  margin-bottom: 8px;
}

.mes-label-preview :deep(.mes-label) {
  color: #000;
  outline: 1px dashed hsl(var(--border));
  background: #fff;
}
</style>
