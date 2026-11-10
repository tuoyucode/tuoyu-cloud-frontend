<script lang="ts" setup>
import type { MesApi } from '@tuoyu/shared/api/mes/common';

import { computed, ref } from 'vue';

import { getMesOptions } from '@tuoyu/shared/api/mes/common';
import { Select } from 'ant-design-vue';

import { $t } from '#/locales';

/**
 * 按编码或名称搜索并选择一个物料（启用的物料，后端最多返回 200 条）。
 * 物料较多时不一次加载全部；编辑时用 initialLabel 显示已选物料
 */
const props = defineProps<{
  /** 不能选择的物料，例如物料清单的产品本身 */
  excludeIds?: string[];
  initialLabel?: string;
  /** 物料类型（MaterialType），逗号分隔多个；为空时不限 */
  materialType?: string;
  modelValue?: null | string;
  placeholder?: string;
}>();

const emit = defineEmits<{
  /** 选中的物料（清空时为空），便于调用方带出编码与名称 */
  select: [option?: MesApi.Option];
  'update:modelValue': [value?: string];
}>();

const items = ref<MesApi.Option[]>([]);
const loading = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
let searchSeq = 0;

const options = computed(() => {
  const excluded = new Set(props.excludeIds);
  const list = items.value.map((item) => ({
    disabled: excluded.has(item.id),
    label: `${item.code} ${item.name}`,
    value: item.id,
  }));
  const current = props.modelValue ? String(props.modelValue) : undefined;
  if (current && !list.some((item) => item.value === current)) {
    list.unshift({
      disabled: false,
      label: props.initialLabel || current,
      value: current,
    });
  }
  return list;
});

async function search(keyword: string) {
  const seq = ++searchSeq;
  loading.value = true;
  try {
    const result = await getMesOptions('material', {
      keyword: keyword || undefined,
      materialType: props.materialType,
    });
    // 只采用最后一次搜索的结果
    if (seq === searchSeq) {
      items.value = result;
    }
  } finally {
    if (seq === searchSeq) {
      loading.value = false;
    }
  }
}

function onSearch(keyword: string) {
  clearTimeout(timer);
  timer = setTimeout(() => search(keyword.trim()), 300);
}

function onDropdownVisibleChange(open: boolean) {
  if (open && items.value.length === 0) {
    search('');
  }
}

function onChange(value: unknown) {
  const id = value ? String(value) : undefined;
  emit('update:modelValue', id);
  emit('select', id ? items.value.find((item) => item.id === id) : undefined);
}
</script>

<template>
  <Select
    :filter-option="false"
    :loading="loading"
    :options="options"
    :placeholder="placeholder ?? $t('mes.material.searchPlaceholder')"
    :value="modelValue ?? undefined"
    allow-clear
    class="w-full"
    show-search
    @change="onChange"
    @dropdown-visible-change="onDropdownVisibleChange"
    @search="onSearch"
  />
</template>
