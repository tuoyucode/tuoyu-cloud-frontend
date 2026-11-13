<script lang="ts" setup>
import type { QrErrorLevel } from '@tuoyu/shared/pages/mes/qrcode';

import { computed } from 'vue';

import { encodeQrCode, qrCodePath } from '@tuoyu/shared/pages/mes/qrcode';

/**
 * 二维码：画成 SVG，宽高随外层区域缩放。标签四周已有内边距，默认不再留静区。
 * 内容超出二维码的容量时不显示
 */
const props = withDefaults(
  defineProps<{
    /** 纠错等级 */
    errorLevel?: QrErrorLevel;
    /** 四周静区的模块数 */
    margin?: number;
    value: string;
  }>(),
  { errorLevel: 'M', margin: 0 },
);

const code = computed(() => {
  try {
    return encodeQrCode(props.value, props.errorLevel);
  } catch {
    return undefined;
  }
});

const viewSize = computed(() =>
  code.value ? code.value.size + props.margin * 2 : 0,
);
const path = computed(() =>
  code.value ? qrCodePath(code.value, props.margin) : '',
);
</script>

<template>
  <svg
    v-if="code"
    :viewBox="`0 0 ${viewSize} ${viewSize}`"
    height="100%"
    shape-rendering="crispEdges"
    style="display: block"
    width="100%"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect :height="viewSize" :width="viewSize" fill="#fff" />
    <path :d="path" fill="#000" />
  </svg>
</template>
