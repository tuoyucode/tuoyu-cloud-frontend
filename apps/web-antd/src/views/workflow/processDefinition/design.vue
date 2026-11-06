<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, Empty } from 'ant-design-vue';

import { $t } from '#/locales';

import WarmFlowFrame from '../components/warm-flow-frame.vue';
import { DEFINITION_PAGE_PATH } from './data';

defineOptions({ name: 'WorkflowProcessDesign' });

/**
 * 流程设计（菜单“流程设计”，隐藏）：嵌入 Warm-Flow 自带的设计器。
 * 路由参数：definitionId 流程定义 ID；disabled=true 只读查看（已发布的流程）
 */
const route = useRoute();
const router = useRouter();

const definitionId = computed(() => String(route.query.definitionId ?? ''));
const disabled = computed(() => route.query.disabled === 'true');

function goBack() {
  router.push(DEFINITION_PAGE_PATH);
}
</script>

<template>
  <Page
    :description="
      disabled
        ? $t('workflow.processDefinition.designReadonlyHelp')
        : $t('workflow.processDefinition.designHelp')
    "
    :title="$t('workflow.processDefinition.designTitle')"
    auto-content-height
  >
    <template #extra>
      <Button @click="goBack">
        {{ $t('workflow.processDefinition.backToList') }}
      </Button>
    </template>
    <WarmFlowFrame
      v-if="definitionId"
      :id="definitionId"
      :key="`${definitionId}-${disabled}`"
      :disabled="disabled"
      class="bg-card h-full"
      @close="goBack"
    />
    <Empty
      v-else
      :description="$t('workflow.processDefinition.noDefinition')"
    />
  </Page>
</template>
