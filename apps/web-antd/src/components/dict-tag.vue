<script lang="ts" setup>
import type { DictApi } from '#/api/system/dict';

import { computed, onMounted, ref } from 'vue';

import { Tag } from 'ant-design-vue';

import { getDictOptions } from '#/api/system/dict';

const props = defineProps<{
  /** 字典类型，例如 sys_normal_disable */
  dictType: string;
  /** 字典值；数字会按字符串比较 */
  value?: null | number | string;
}>();

/** 字典回显样式（listClass）对应的标签颜色 */
const COLORS: Record<string, string> = {
  danger: 'error',
  default: 'default',
  info: 'default',
  primary: 'processing',
  success: 'success',
  warning: 'warning',
};

const options = ref<DictApi.DictOption[]>([]);

const option = computed(() =>
  options.value.find((item) => item.value === String(props.value ?? '')),
);

onMounted(async () => {
  options.value = await getDictOptions(props.dictType);
});
</script>

<template>
  <Tag
    v-if="option"
    :bordered="false"
    :color="COLORS[option.listClass ?? 'default'] ?? 'default'"
  >
    {{ option.label }}
  </Tag>
  <span v-else>{{ value ?? '' }}</span>
</template>
