<script lang="ts" setup>
import type { EquipmentEnumType } from '@tuoyu/shared/pages/mes/equipment-enums';

import { computed } from 'vue';

import {
  equipmentEnumColor,
  equipmentEnumLabel,
} from '@tuoyu/shared/pages/mes/equipment-enums';
import { ElTag } from 'element-plus';

import { tagType } from '../../_shared/tag-type';

const props = defineProps<{
  type: EquipmentEnumType;
  value?: null | string;
}>();

const label = computed(() => equipmentEnumLabel(props.type, props.value));
const type = computed(() =>
  tagType(equipmentEnumColor(props.type, props.value)),
);
</script>

<template>
  <ElTag v-if="label" :type="type">{{ label }}</ElTag>
</template>
