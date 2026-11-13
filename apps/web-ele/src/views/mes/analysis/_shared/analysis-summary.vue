<script lang="ts" setup>
import type { SummaryItem } from '@tuoyu/shared/pages/mes/analysis-utils';

import { ElAlert, ElButton, ElCard } from 'element-plus';

import { $t } from '#/locales';

defineProps<{
  /** 口径说明（多行用换行分隔） */
  caliber: string;
  /** 加载失败（保留上一次的数据，显示重试） */
  failed?: boolean;
  items: SummaryItem[];
}>();

const emit = defineEmits<{ retry: [] }>();

const CARD_BODY_STYLE = { padding: '12px 16px' };
</script>

<template>
  <div class="flex flex-col gap-4">
    <ElAlert
      v-if="failed"
      :closable="false"
      :title="$t('mes.analysis.common.loadFailed')"
      show-icon
      type="error"
    >
      <ElButton class="mt-1" size="small" @click="emit('retry')">
        {{ $t('mes.analysis.common.retry') }}
      </ElButton>
    </ElAlert>
    <div
      class="grid grid-cols-2 gap-4 md:grid-cols-3"
      :class="items.length > 4 ? 'xl:grid-cols-5' : 'xl:grid-cols-4'"
    >
      <ElCard
        v-for="item in items"
        :key="item.key"
        :body-style="CARD_BODY_STYLE"
        shadow="never"
      >
        <div class="text-muted-foreground text-sm">{{ item.label }}</div>
        <div
          :class="item.warn ? 'text-destructive' : ''"
          class="mt-1 break-words text-2xl font-semibold tabular-nums"
        >
          {{ item.value }}
        </div>
      </ElCard>
    </div>
    <ElAlert
      :closable="false"
      :title="$t('mes.analysis.common.caliber')"
      show-icon
      type="info"
    >
      <div class="whitespace-pre-line text-sm">{{ caliber }}</div>
    </ElAlert>
  </div>
</template>
