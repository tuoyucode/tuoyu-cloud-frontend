<script lang="ts" setup>
import type { DictApi } from '@tuoyu/shared/api/system/dict';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import DataPanel from './data-panel.vue';
import TypePanel from './type-panel.vue';

defineOptions({ name: 'SystemDict' });

/** 左侧选中的字典类型，右侧显示它的字典数据 */
const selected = ref<DictApi.DictTypeItem>();
</script>

<template>
  <Page auto-content-height>
    <!-- 宽屏左右两栏；窄屏上下排列，每栏固定高度 -->
    <div class="flex flex-col gap-4 lg:h-full lg:flex-row">
      <div class="h-[640px] min-w-0 lg:h-full lg:flex-1">
        <TypePanel
          :selected-id="selected?.dictId"
          @select="selected = $event"
        />
      </div>
      <div class="h-[640px] min-w-0 lg:h-full lg:flex-1">
        <DataPanel :dict-type="selected" />
      </div>
    </div>
  </Page>
</template>
