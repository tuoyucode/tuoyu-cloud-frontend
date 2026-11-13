<script lang="ts" setup>
import type { SummaryItem } from '@tuoyu/shared/pages/mes/analysis-utils';

import { Alert, Button, Card } from 'ant-design-vue';

import { $t } from '#/locales';

defineProps<{
  /** 口径说明（多行用换行分隔） */
  caliber: string;
  /** 加载失败（保留上一次的数据，显示重试） */
  failed?: boolean;
  items: SummaryItem[];
}>();

const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <div class="flex flex-col gap-4">
    <Alert
      v-if="failed"
      :message="$t('mes.analysis.common.loadFailed')"
      show-icon
      type="error"
    >
      <template #action>
        <Button size="small" @click="emit('retry')">
          {{ $t('mes.analysis.common.retry') }}
        </Button>
      </template>
    </Alert>
    <div
      class="grid grid-cols-2 gap-4 md:grid-cols-3"
      :class="items.length > 4 ? 'xl:grid-cols-5' : 'xl:grid-cols-4'"
    >
      <Card v-for="item in items" :key="item.key" size="small">
        <div class="text-muted-foreground text-sm">{{ item.label }}</div>
        <div
          :class="item.warn ? 'text-destructive' : ''"
          class="mt-1 text-2xl font-semibold tabular-nums"
        >
          {{ item.value }}
        </div>
      </Card>
    </div>
    <Alert :message="$t('mes.analysis.common.caliber')" show-icon type="info">
      <template #description>
        <div class="whitespace-pre-line text-sm">{{ caliber }}</div>
      </template>
    </Alert>
  </div>
</template>
