<script lang="ts" setup>
import type { DictApi } from '@tuoyu/shared/api/system/dict';

import { computed, onMounted, ref } from 'vue';

import { getDictOptions } from '@tuoyu/shared/api/system/dict';
import { ElTag } from 'element-plus';

const props = defineProps<{
  /** 字典类型，例如 sys_normal_disable */
  dictType: string;
  /** 字典值；数字会按字符串比较 */
  value?: null | number | string;
}>();

type TagType = 'danger' | 'info' | 'primary' | 'success' | 'warning';

/** 字典回显样式（listClass）对应的标签类型；未设置或未知的样式显示为中性色 */
const TYPES: Record<string, TagType> = {
  danger: 'danger',
  default: 'info',
  info: 'info',
  primary: 'primary',
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
  <ElTag
    v-if="option"
    :type="TYPES[option.listClass ?? 'default'] ?? 'info'"
    disable-transitions
    effect="light"
  >
    {{ option.label }}
  </ElTag>
  <span v-else>{{ value ?? '' }}</span>
</template>
