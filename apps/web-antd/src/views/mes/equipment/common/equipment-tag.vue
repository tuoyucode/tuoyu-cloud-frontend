<script lang="ts" setup>
import type { EquipmentEnumType } from './enums';

import { computed } from 'vue';

import { Tag } from 'ant-design-vue';

import { equipmentEnumColor, equipmentEnumLabel } from './enums';

const props = defineProps<{
  type: EquipmentEnumType;
  value?: null | string;
}>();

const label = computed(() => equipmentEnumLabel(props.type, props.value));
const color = computed(() => equipmentEnumColor(props.type, props.value));
</script>

<template>
  <Tag v-if="label" :color="color">{{ label }}</Tag>
</template>
