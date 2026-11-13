<script lang="ts" setup>
import { computed } from 'vue';

import { code128Layout } from '@tuoyu/shared/pages/mes/code128';

import { $t } from '#/locales';

/** Code 128 一维码：按模块宽度画成 SVG，宽高随外层区域缩放（条宽比例不变） */
const props = defineProps<{
  value: string;
}>();

const layout = computed(() => {
  try {
    return code128Layout(props.value);
  } catch {
    return undefined;
  }
});
</script>

<template>
  <svg
    v-if="layout"
    :viewBox="`0 0 ${layout.totalWidth} 100`"
    height="100%"
    preserveAspectRatio="none"
    shape-rendering="crispEdges"
    style="display: block"
    width="100%"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      v-for="(bar, index) in layout.bars"
      :key="index"
      :width="bar.width"
      :x="bar.x"
      fill="#000"
      height="100"
      y="0"
    />
  </svg>
  <span v-else style="font-size: 2mm">
    {{ $t('mes.labelTemplate.unsupportedBarcode') }}
  </span>
</template>
