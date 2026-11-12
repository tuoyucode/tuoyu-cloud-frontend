<script lang="ts" setup>
import type { OperlogApi } from '@tuoyu/shared/api/monitor/operlog';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { removeOperlog } from '@tuoyu/shared/api/monitor/operlog';
import { DictType } from '@tuoyu/shared/api/system/dict';
import { prettyJson } from '@tuoyu/shared/pages/monitor/operlog';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import {
  breakpointsTailwind,
  useBreakpoints,
  useClipboard,
} from '@vueuse/core';
import {
  ElAlert,
  ElButton,
  ElDescriptions,
  ElDescriptionsItem,
  ElMessage,
  ElPopconfirm,
} from 'element-plus';

import DictTag from '#/components/dict-tag.vue';
import { $t } from '#/locales';

const emit = defineEmits<{ success: [] }>();

/** 操作状态：1 失败 */
const STATUS_FAILED = 1;

const log = ref<OperlogApi.Operlog>();

const { copy } = useClipboard({ legacy: true });

/** 描述列表的列数：窄屏 1 列、小屏 2 列、其余 3 列（Element Plus 的描述列表不支持响应式列数） */
const breakpoints = useBreakpoints(breakpointsTailwind);
const isSm = breakpoints.greaterOrEqual('sm');
const isMd = breakpoints.greaterOrEqual('md');
const descColumns = computed(() => {
  if (isMd.value) {
    return 3;
  }
  return isSm.value ? 2 : 1;
});

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData() as
        | undefined
        | { row?: OperlogApi.Operlog };
      log.value = data?.row;
    }
  },
});

/** 请求参数、返回结果：等宽代码块 */
const blocks = computed(() => [
  {
    key: 'operParam',
    label: $t('monitor.operlog.operParam'),
    text: prettyJson(log.value?.operParam),
  },
  {
    key: 'jsonResult',
    label: $t('monitor.operlog.jsonResult'),
    text: prettyJson(log.value?.jsonResult),
  },
]);

const operatorType = computed(() => {
  switch (log.value?.operatorType) {
    case 1: {
      return $t('monitor.operlog.operatorTypeManage');
    }
    case 2: {
      return $t('monitor.operlog.operatorTypeMobile');
    }
    default: {
      return $t('monitor.operlog.operatorTypeOther');
    }
  }
});

const location = computed(() =>
  [log.value?.operIp, log.value?.operLocation].filter(Boolean).join(' · '),
);

async function onCopy(text: string) {
  await copy(text);
  ElMessage.success($t('monitor.operlog.copied'));
}

async function onDelete() {
  if (!log.value) {
    return;
  }
  await removeOperlog([log.value.operId]);
  ElMessage.success($t('crud.deleted'));
  emit('success');
  drawerApi.close();
}
</script>

<template>
  <Drawer
    :title="$t('monitor.operlog.detailTitle')"
    class="w-full max-w-[960px]"
  >
    <template #extra>
      <ElPopconfirm
        v-if="log && hasPermission('monitor:operlog:remove')"
        :cancel-button-text="$t('common.cancel')"
        :confirm-button-text="$t('monitor.operlog.delete')"
        :title="$t('monitor.operlog.confirmDelete')"
        confirm-button-type="danger"
        placement="bottom-end"
        width="240"
        @confirm="onDelete"
      >
        <template #reference>
          <ElButton plain size="small" type="danger">
            {{ $t('monitor.operlog.delete') }}
          </ElButton>
        </template>
      </ElPopconfirm>
    </template>

    <div v-if="log" class="flex flex-col gap-4">
      <ElAlert
        v-if="log.status === STATUS_FAILED"
        :closable="false"
        :description="log.errorMsg || $t('monitor.operlog.noErrorMsg')"
        :title="$t('monitor.operlog.failedTitle')"
        show-icon
        type="error"
      />

      <ElDescriptions :column="descColumns" border size="small">
        <ElDescriptionsItem :label="$t('monitor.operlog.titleField')">
          {{ log.title }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('monitor.operlog.businessType')">
          <DictTag :dict-type="DictType.OPER_TYPE" :value="log.businessType" />
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('monitor.operlog.status')">
          <DictTag :dict-type="DictType.COMMON_STATUS" :value="log.status" />
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('monitor.operlog.operName')">
          {{ log.operName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('monitor.operlog.dept')">
          {{ log.deptName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('monitor.operlog.operatorType')">
          {{ operatorType }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('monitor.operlog.operTime')">
          {{ log.operTime }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('monitor.operlog.costTime')">
          <template v-if="log.costTime !== undefined && log.costTime !== null">
            {{ $t('monitor.operlog.costTimeValue', { ms: log.costTime }) }}
          </template>
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('monitor.operlog.operIp')">
          {{ location }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('monitor.operlog.clientKey')">
          <span class="font-mono">{{ log.clientKey }}</span>
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('monitor.operlog.deviceType')">
          <DictTag :dict-type="DictType.DEVICE_TYPE" :value="log.deviceType" />
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('monitor.operlog.browserOs')">
          {{ [log.browser, log.os].filter(Boolean).join(' / ') }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('monitor.operlog.operUrl')" :span="3">
          <span class="break-all font-mono">
            {{ [log.requestMethod, log.operUrl].filter(Boolean).join(' ') }}
          </span>
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('monitor.operlog.method')" :span="3">
          <span class="break-all font-mono">{{ log.method }}</span>
        </ElDescriptionsItem>
      </ElDescriptions>

      <section v-for="block in blocks" :key="block.key">
        <div class="mb-2 flex items-center justify-between">
          <span class="font-medium">{{ block.label }}</span>
          <ElButton
            v-if="block.text"
            link
            size="small"
            type="primary"
            @click="onCopy(block.text)"
          >
            {{ $t('monitor.operlog.copy') }}
          </ElButton>
        </div>
        <pre
          v-if="block.text"
          class="m-0 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-md border border-border bg-muted p-3 font-mono text-xs leading-5"
          >{{ block.text }}</pre>
        <div v-else class="text-sm text-muted-foreground">
          {{ $t('monitor.operlog.empty') }}
        </div>
      </section>
    </div>
  </Drawer>
</template>
