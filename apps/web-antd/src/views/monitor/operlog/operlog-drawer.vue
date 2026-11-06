<script lang="ts" setup>
import type { OperlogApi } from '#/api/monitor/operlog';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { useClipboard } from '@vueuse/core';
import {
  Alert,
  Button,
  Descriptions,
  DescriptionsItem,
  message,
  Popconfirm,
} from 'ant-design-vue';

import { removeOperlog } from '#/api/monitor/operlog';
import { DictType } from '#/api/system/dict';
import DictTag from '#/components/dict-tag.vue';
import { $t } from '#/locales';
import { hasPermission } from '#/utils/permission';

const emit = defineEmits<{ success: [] }>();

/** 操作状态：1 失败 */
const STATUS_FAILED = 1;

const log = ref<OperlogApi.Operlog>();

const { copy } = useClipboard({ legacy: true });

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

/** JSON 格式化显示；不是 JSON 时原样显示 */
function pretty(text?: string) {
  if (!text) {
    return '';
  }
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

/** 请求参数、返回结果：等宽代码块 */
const blocks = computed(() => [
  {
    key: 'operParam',
    label: $t('monitor.operlog.operParam'),
    text: pretty(log.value?.operParam),
  },
  {
    key: 'jsonResult',
    label: $t('monitor.operlog.jsonResult'),
    text: pretty(log.value?.jsonResult),
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
  message.success($t('monitor.operlog.copied'));
}

async function onDelete() {
  if (!log.value) {
    return;
  }
  await removeOperlog([log.value.operId]);
  message.success($t('crud.deleted'));
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
      <Popconfirm
        v-if="log && hasPermission('monitor:operlog:remove')"
        :ok-button-props="{ danger: true }"
        :ok-text="$t('monitor.operlog.delete')"
        :title="$t('monitor.operlog.confirmDelete')"
        placement="bottomRight"
        @confirm="onDelete"
      >
        <Button danger size="small">{{ $t('monitor.operlog.delete') }}</Button>
      </Popconfirm>
    </template>

    <div v-if="log" class="flex flex-col gap-4">
      <Alert
        v-if="log.status === STATUS_FAILED"
        :description="log.errorMsg || $t('monitor.operlog.noErrorMsg')"
        :message="$t('monitor.operlog.failedTitle')"
        show-icon
        type="error"
      />

      <Descriptions :column="{ xs: 1, sm: 2, md: 3 }" bordered size="small">
        <DescriptionsItem :label="$t('monitor.operlog.titleField')">
          {{ log.title }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('monitor.operlog.businessType')">
          <DictTag :dict-type="DictType.OPER_TYPE" :value="log.businessType" />
        </DescriptionsItem>
        <DescriptionsItem :label="$t('monitor.operlog.status')">
          <DictTag :dict-type="DictType.COMMON_STATUS" :value="log.status" />
        </DescriptionsItem>
        <DescriptionsItem :label="$t('monitor.operlog.operName')">
          {{ log.operName }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('monitor.operlog.dept')">
          {{ log.deptName }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('monitor.operlog.operatorType')">
          {{ operatorType }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('monitor.operlog.operTime')">
          {{ log.operTime }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('monitor.operlog.costTime')">
          <template v-if="log.costTime !== undefined && log.costTime !== null">
            {{ $t('monitor.operlog.costTimeValue', { ms: log.costTime }) }}
          </template>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('monitor.operlog.operIp')">
          {{ location }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('monitor.operlog.clientKey')">
          <span class="font-mono">{{ log.clientKey }}</span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('monitor.operlog.deviceType')">
          <DictTag :dict-type="DictType.DEVICE_TYPE" :value="log.deviceType" />
        </DescriptionsItem>
        <DescriptionsItem :label="$t('monitor.operlog.browserOs')">
          {{ [log.browser, log.os].filter(Boolean).join(' / ') }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('monitor.operlog.operUrl')" :span="3">
          <span class="break-all font-mono">
            {{ [log.requestMethod, log.operUrl].filter(Boolean).join(' ') }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('monitor.operlog.method')" :span="3">
          <span class="break-all font-mono">{{ log.method }}</span>
        </DescriptionsItem>
      </Descriptions>

      <section v-for="block in blocks" :key="block.key">
        <div class="mb-2 flex items-center justify-between">
          <span class="font-medium">{{ block.label }}</span>
          <Button
            v-if="block.text"
            size="small"
            type="link"
            @click="onCopy(block.text)"
          >
            {{ $t('monitor.operlog.copy') }}
          </Button>
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
