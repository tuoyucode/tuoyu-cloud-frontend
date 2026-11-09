<script lang="ts" setup>
import type { WarehouseApi } from '@tuoyu/shared/api/mes/warehouse';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import LocationPanel from './location-panel.vue';
import WarehousePanel from './warehouse-panel.vue';

defineOptions({ name: 'MesWarehouse' });

/** 左侧选中的仓库，右侧显示它的库位 */
const selected = ref<WarehouseApi.Warehouse>();
</script>

<template>
  <Page auto-content-height>
    <!-- 宽屏左右两栏；窄屏上下排列，每栏固定高度 -->
    <div class="flex flex-col gap-4 lg:h-full lg:flex-row">
      <div class="h-[640px] min-w-0 lg:h-full lg:flex-1">
        <WarehousePanel
          :selected-id="selected?.warehouseId"
          @select="selected = $event"
        />
      </div>
      <div class="h-[640px] min-w-0 lg:h-full lg:flex-1">
        <LocationPanel :warehouse="selected" />
      </div>
    </div>
  </Page>
</template>
