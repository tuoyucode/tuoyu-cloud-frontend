<script lang="ts" setup>
import type { EchartsUIType, ECOption } from '@vben/plugins/echarts';

import { nextTick, onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { ElEmpty } from 'element-plus';

import { $t } from '#/locales';

const props = withDefaults(
  defineProps<{
    /** 没有数据时显示空状态（覆盖在图表上） */
    empty?: boolean;
    height?: string;
    option?: ECOption;
  }>(),
  { empty: false, height: '320px', option: undefined },
);

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

async function render() {
  if (!props.option) {
    return;
  }
  await nextTick();
  try {
    await renderEcharts(props.option);
  } catch {
    // 图表绘制失败不影响表格中的数据
  }
}

// 页面在数据或明暗模式变化后重新计算配置，这里随之重绘
watch(() => props.option, render);

onMounted(render);
</script>

<template>
  <div class="relative">
    <EchartsUI ref="chartRef" :height="height" />
    <div
      v-if="empty"
      class="bg-card absolute inset-0 flex items-center justify-center"
    >
      <ElEmpty
        :description="$t('mes.analysis.common.empty')"
        :image-size="80"
      />
    </div>
  </div>
</template>
