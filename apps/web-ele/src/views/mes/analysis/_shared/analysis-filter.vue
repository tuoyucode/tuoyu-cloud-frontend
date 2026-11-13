<script lang="ts" setup>
import type { AnalysisApi } from '@tuoyu/shared/api/mes/analysis';
import type { MesApi } from '@tuoyu/shared/api/mes/common';
import type { AnalysisFilters } from '@tuoyu/shared/pages/mes/analysis-utils';

import { computed, onMounted, ref, watch } from 'vue';

import { getMesOptions, toSelectOptions } from '@tuoyu/shared/api/mes/common';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { ElButton, ElDatePicker, ElOption, ElSelect } from 'element-plus';

import { $t } from '#/locales';

const props = withDefaults(
  defineProps<{
    /** 可选的统计维度（不传时不显示维度） */
    dimensions?: AnalysisApi.Dimension[];
    exporting?: boolean;
    /** 按日期统计时是否可选时间粒度 */
    granularity?: boolean;
    loading?: boolean;
  }>(),
  {
    dimensions: () => [],
    exporting: false,
    granularity: false,
    loading: false,
  },
);

const emit = defineEmits<{ export: []; reset: []; search: [] }>();

const filters = defineModel<AnalysisFilters>({ required: true });

const factories = ref<MesApi.Option[]>([]);
const workshops = ref<MesApi.Option[]>([]);
const lines = ref<MesApi.Option[]>([]);
const materials = ref<MesApi.Option[]>([]);

const canExport = computed(() => hasPermission('mes:analysis:export'));

const factoryOptions = computed(() => toSelectOptions(factories.value));
/** 选了工厂时只列该工厂的车间 */
const workshopOptions = computed(() =>
  toSelectOptions(
    workshops.value.filter(
      (item) =>
        !filters.value.factoryId ||
        String(item.parentId) === String(filters.value.factoryId),
    ),
  ),
);
/** 选了车间时只列该车间的产线 */
const lineOptions = computed(() =>
  toSelectOptions(
    lines.value.filter(
      (item) =>
        !filters.value.workshopId ||
        String(item.parentId) === String(filters.value.workshopId),
    ),
  ),
);
const materialOptions = computed(() => toSelectOptions(materials.value));

const dimensionOptions = computed(() =>
  props.dimensions.map((value) => ({
    label: $t(`mes.analysis.dimension.${value}`),
    value,
  })),
);

const granularityOptions = computed(() =>
  (['day', 'week', 'month'] as AnalysisApi.Granularity[]).map((value) => ({
    label: $t(`mes.analysis.granularity.${value}`),
    value,
  })),
);

const showGranularity = computed(
  () => props.granularity && filters.value.dimension === 'date',
);

// 上级变化后，不属于它的下级选择清空
watch(
  () => filters.value.factoryId,
  () => {
    if (
      filters.value.workshopId &&
      !workshopOptions.value.some(
        (item) => item.value === filters.value.workshopId,
      )
    ) {
      filters.value.workshopId = undefined;
    }
  },
);
watch(
  () => filters.value.workshopId,
  () => {
    if (
      filters.value.lineId &&
      !lineOptions.value.some((item) => item.value === filters.value.lineId)
    ) {
      filters.value.lineId = undefined;
    }
  },
);

async function loadOptions(resource: string): Promise<MesApi.Option[]> {
  try {
    return await getMesOptions(resource);
  } catch {
    // 失败原因已由请求层提示；下拉为空时按全部统计
    return [];
  }
}

onMounted(async () => {
  const [f, w, l, m] = await Promise.all([
    loadOptions('factory'),
    loadOptions('workshop'),
    loadOptions('line'),
    loadOptions('material'),
  ]);
  factories.value = f;
  workshops.value = w;
  lines.value = l;
  materials.value = m;
});
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <div class="w-64">
      <ElDatePicker
        v-model="filters.range"
        :clearable="false"
        :end-placeholder="$t('mes.analysis.common.endDate')"
        :start-placeholder="$t('mes.analysis.common.beginDate')"
        class="w-full!"
        type="daterange"
        value-format="YYYY-MM-DD"
      />
    </div>
    <!-- 下拉框按选项文字筛选（Element Plus 默认不区分大小写） -->
    <ElSelect
      v-model="filters.factoryId"
      :placeholder="$t('mes.analysis.common.allFactories')"
      class="w-40!"
      clearable
      filterable
    >
      <ElOption
        v-for="option in factoryOptions"
        :key="option.value"
        :label="option.label"
        :value="option.value"
      />
    </ElSelect>
    <ElSelect
      v-model="filters.workshopId"
      :placeholder="$t('mes.analysis.common.allWorkshops')"
      class="w-40!"
      clearable
      filterable
    >
      <ElOption
        v-for="option in workshopOptions"
        :key="option.value"
        :label="option.label"
        :value="option.value"
      />
    </ElSelect>
    <ElSelect
      v-model="filters.lineId"
      :placeholder="$t('mes.analysis.common.allLines')"
      class="w-40!"
      clearable
      filterable
    >
      <ElOption
        v-for="option in lineOptions"
        :key="option.value"
        :label="option.label"
        :value="option.value"
      />
    </ElSelect>
    <ElSelect
      v-model="filters.materialId"
      :placeholder="$t('mes.analysis.common.allProducts')"
      class="w-48!"
      clearable
      filterable
    >
      <ElOption
        v-for="option in materialOptions"
        :key="option.value"
        :label="option.label"
        :value="option.value"
      />
    </ElSelect>
    <ElSelect
      v-if="dimensionOptions.length > 0"
      v-model="filters.dimension"
      :aria-label="$t('mes.analysis.common.dimension')"
      class="w-36!"
    >
      <ElOption
        v-for="option in dimensionOptions"
        :key="option.value"
        :label="option.label"
        :value="option.value"
      />
    </ElSelect>
    <ElSelect
      v-if="showGranularity"
      v-model="filters.granularity"
      :aria-label="$t('mes.analysis.common.granularity')"
      class="w-28!"
    >
      <ElOption
        v-for="option in granularityOptions"
        :key="option.value"
        :label="option.label"
        :value="option.value"
      />
    </ElSelect>
    <!-- 换行时按钮之间的间距由 gap 控制，去掉 Element Plus 相邻按钮的左外边距 -->
    <ElButton
      :loading="loading"
      class="ml-0!"
      type="primary"
      @click="emit('search')"
    >
      {{ $t('mes.analysis.common.query') }}
    </ElButton>
    <ElButton class="ml-0!" @click="emit('reset')">
      {{ $t('mes.analysis.common.reset') }}
    </ElButton>
    <ElButton
      v-if="canExport"
      :loading="exporting"
      class="ml-0!"
      @click="emit('export')"
    >
      {{ $t('mes.analysis.common.export') }}
    </ElButton>
  </div>
</template>
