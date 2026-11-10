<script lang="ts" setup>
import type { MaterialRequestApi } from '@tuoyu/shared/api/mes/materialRequest';

import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { getMaterialRequest } from '@tuoyu/shared/api/mes/materialRequest';

import { $t } from '#/locales';

import MaterialRequestDetail from './material-request-detail.vue';

/** 单据详情：表头与明细 */
const detail = ref<MaterialRequestApi.Request>();

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    const { requestId } = drawerApi.getData() as { requestId: string };
    detail.value = undefined;
    drawerApi.lock();
    try {
      detail.value = await getMaterialRequest(requestId);
    } finally {
      drawerApi.unlock();
    }
  },
});
</script>

<template>
  <Drawer
    :title="$t('mes.materialRequest.detail')"
    class="w-full max-w-[960px]"
  >
    <MaterialRequestDetail v-if="detail" :detail="detail" />
  </Drawer>
</template>
