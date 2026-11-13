<script lang="ts" setup>
import type { MesEnumType } from '@tuoyu/shared/pages/mes/enums';

import { computed } from 'vue';

import { enumColor, enumLabel } from '@tuoyu/shared/pages/mes/enums';
import { Tag } from 'ant-design-vue';

const props = defineProps<{
  type: MesEnumType;
  value?: null | string;
}>();

const label = computed(() => enumLabel(props.type, props.value));
const color = computed(() => enumColor(props.type, props.value));
</script>

<template>
  <Tag v-if="label" :color="color">{{ label }}</Tag>
</template>
