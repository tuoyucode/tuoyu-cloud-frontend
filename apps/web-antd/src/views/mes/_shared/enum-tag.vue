<script lang="ts" setup>
import type { MesEnumType } from './enums';

import { computed } from 'vue';

import { Tag } from 'ant-design-vue';

import { enumColor, enumLabel } from './enums';

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
