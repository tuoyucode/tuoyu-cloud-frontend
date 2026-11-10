<script lang="ts" setup>
import type { AnalysisApi } from '@tuoyu/shared/api/mes/analysis';
import type { MesApi } from '@tuoyu/shared/api/mes/common';

import type { AnalysisFilters } from './analysis-utils';

import { computed, onMounted, ref, watch } from 'vue';

import { getMesOptions, toSelectOptions } from '@tuoyu/shared/api/mes/common';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { Button, RangePicker, Select } from 'ant-design-vue';

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

function filterOption(input: string, option?: { label?: string }) {
  return (option?.label ?? '').toLowerCase().includes(input.toLowerCase());
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
    <RangePicker
      v-model:value="filters.range"
      :allow-clear="false"
      :placeholder="[
        $t('mes.analysis.common.beginDate'),
        $t('mes.analysis.common.endDate'),
      ]"
      class="w-64"
      value-format="YYYY-MM-DD"
    />
    <Select
      v-model:value="filters.factoryId"
      :filter-option="filterOption"
      :options="factoryOptions"
      :placeholder="$t('mes.analysis.common.allFactories')"
      allow-clear
      class="w-40"
      show-search
    />
    <Select
      v-model:value="filters.workshopId"
      :filter-option="filterOption"
      :options="workshopOptions"
      :placeholder="$t('mes.analysis.common.allWorkshops')"
      allow-clear
      class="w-40"
      show-search
    />
    <Select
      v-model:value="filters.lineId"
      :filter-option="filterOption"
      :options="lineOptions"
      :placeholder="$t('mes.analysis.common.allLines')"
      allow-clear
      class="w-40"
      show-search
    />
    <Select
      v-model:value="filters.materialId"
      :filter-option="filterOption"
      :options="materialOptions"
      :placeholder="$t('mes.analysis.common.allProducts')"
      allow-clear
      class="w-48"
      show-search
    />
    <Select
      v-if="dimensionOptions.length > 0"
      v-model:value="filters.dimension"
      :aria-label="$t('mes.analysis.common.dimension')"
      :options="dimensionOptions"
      class="w-36"
    />
    <Select
      v-if="showGranularity"
      v-model:value="filters.granularity"
      :aria-label="$t('mes.analysis.common.granularity')"
      :options="granularityOptions"
      class="w-28"
    />
    <Button :loading="loading" type="primary" @click="emit('search')">
      {{ $t('mes.analysis.common.query') }}
    </Button>
    <Button @click="emit('reset')">
      {{ $t('mes.analysis.common.reset') }}
    </Button>
    <Button v-if="canExport" :loading="exporting" @click="emit('export')">
      {{ $t('mes.analysis.common.export') }}
    </Button>
  </div>
</template>
