<script lang="ts" setup>
import { ElButton, ElPopconfirm } from 'element-plus';

import { $t } from '#/locales';

/**
 * 行内操作的气泡确认。Element Plus 的气泡确认只有标题，这里在按钮上方补一行说明（例如删除的限制、发布后的影响）
 */
withDefaults(
  defineProps<{
    /** 确认按钮的文字，写清会发生什么，例如“删除分类” */
    confirmText: string;
    /** 危险操作：确认按钮为红色 */
    danger?: boolean;
    /** 标题下方的说明 */
    description?: string;
    title: string;
  }>(),
  { danger: false, description: '' },
);

const emit = defineEmits<{ confirm: [] }>();
</script>

<template>
  <ElPopconfirm
    :title="title"
    placement="left"
    width="280"
    @confirm="emit('confirm')"
  >
    <template #reference>
      <slot></slot>
    </template>
    <template #actions="{ confirm, cancel }">
      <p
        v-if="description"
        class="text-muted-foreground mb-3 text-left text-xs leading-5"
      >
        {{ description }}
      </p>
      <ElButton size="small" @click="cancel">
        {{ $t('common.cancel') }}
      </ElButton>
      <ElButton
        :type="danger ? 'danger' : 'primary'"
        size="small"
        @click="confirm"
      >
        {{ confirmText }}
      </ElButton>
    </template>
  </ElPopconfirm>
</template>
