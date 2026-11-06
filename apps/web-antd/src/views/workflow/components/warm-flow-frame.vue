<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useAppConfig } from '@vben/hooks';
import { usePreferences } from '@vben/preferences';
import { useAccessStore } from '@vben/stores';

import { Spin } from 'ant-design-vue';

import { CLIENT_ID } from '#/api/request';
import { $t } from '#/locales';
import {
  buildWarmFlowUrl,
  parseWarmFlowMessage,
  resolveOrigin,
  themeMessage,
} from '#/utils/warm-flow';

/**
 * 嵌入 Warm-Flow 自带的设计器或流程图（iframe）。令牌的传递方式见 utils/warm-flow.ts
 */
const props = withDefaults(
  defineProps<{
    /** 只读查看 */
    disabled?: boolean;
    /** 设计器为流程定义 ID，流程图为流程实例 ID */
    id: string;
    /** 页面：设计器或流程图 */
    page?: 'design' | 'FlowChart';
  }>(),
  { disabled: false, page: 'design' },
);

const emit = defineEmits<{
  /** 设计器中点击返回或保存成功后，Warm-Flow 发出 close 消息 */
  close: [];
}>();

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);
const accessStore = useAccessStore();
const { isDark } = usePreferences();

const frame = ref<HTMLIFrameElement>();
const loading = ref(true);

// 主题只在打开时带入，之后切换明暗模式通过消息通知，避免重新加载丢失未保存的设计
const initialTheme = isDark.value ? 'dark' : 'light';

const src = computed(() =>
  buildWarmFlowUrl({
    apiURL,
    clientId: CLIENT_ID,
    disabled: props.disabled,
    id: props.id,
    page: props.page,
    theme: initialTheme,
    token: accessStore.accessToken,
  }),
);

const origin = computed(() => resolveOrigin(src.value, window.location.href));

function postTheme() {
  frame.value?.contentWindow?.postMessage(
    themeMessage(isDark.value),
    origin.value,
  );
}

function onMessage(event: MessageEvent) {
  const data = parseWarmFlowMessage(
    event,
    frame.value?.contentWindow,
    origin.value,
  );
  switch (data?.method) {
    case 'close': {
      emit('close');
      break;
    }
    case 'getTheme': {
      postTheme();
      break;
    }
  }
}

watch(isDark, postTheme);
watch(src, () => {
  loading.value = true;
});

onMounted(() => window.addEventListener('message', onMessage));
onBeforeUnmount(() => window.removeEventListener('message', onMessage));
</script>

<template>
  <Spin
    :spinning="loading"
    :tip="$t('workflow.common.designerLoading')"
    class="h-full w-full"
    wrapper-class-name="h-full w-full [&_.ant-spin-container]:h-full"
  >
    <iframe
      ref="frame"
      :src="src"
      :title="
        page === 'FlowChart'
          ? $t('workflow.common.flowChart')
          : $t('workflow.common.designer')
      "
      class="block h-full min-h-[480px] w-full rounded-md border-0"
      @load="loading = false"
    ></iframe>
  </Spin>
</template>
