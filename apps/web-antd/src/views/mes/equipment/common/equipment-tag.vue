<script lang="ts" setup>
import type { EquipmentEnumType } from '@tuoyu/shared/pages/mes/equipment-enums';

import { computed } from 'vue';

import {
  equipmentEnumColor,
  equipmentEnumLabel,
} from '@tuoyu/shared/pages/mes/equipment-enums';
import { Tag } from 'ant-design-vue';

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
