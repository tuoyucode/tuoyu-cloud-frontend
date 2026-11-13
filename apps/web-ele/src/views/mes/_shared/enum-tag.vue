<script lang="ts" setup>
import type { MesEnumType } from '@tuoyu/shared/pages/mes/enums';

import { computed } from 'vue';

import { enumColor, enumLabel } from '@tuoyu/shared/pages/mes/enums';
import { ElTag } from 'element-plus';

import { tagType } from './tag-type';

const props = defineProps<{
  type: MesEnumType;
  value?: null | string;
}>();

const label = computed(() => enumLabel(props.type, props.value));
const type = computed(() => tagType(enumColor(props.type, props.value)));
</script>

<template>
  <ElTag v-if="label" :type="type">{{ label }}</ElTag>
</template>
