<script lang="ts" setup>
import type { MesApi } from '@tuoyu/shared/api/mes/common';
import type { MesEnumType } from '@tuoyu/shared/pages/mes/enums';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import StatusLogTimeline from './status-log-timeline.vue';

/** 状态履历对话框。打开时传入 { title, statusType, load } */
interface OpenData {
  load: () => Promise<MesApi.StatusLog[]>;
  statusType: MesEnumType;
  title: string;
}

const title = ref('');
const statusType = ref<MesEnumType>('WorkorderStatus');
const logs = ref<MesApi.StatusLog[]>([]);

const [Modal, modalApi] = useVbenModal({
  footer: false,
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    const data = modalApi.getData() as OpenData;
    title.value = data.title;
    statusType.value = data.statusType;
    logs.value = [];
    modalApi.setState({ loading: true });
    try {
      logs.value = await data.load();
    } finally {
      modalApi.setState({ loading: false });
    }
  },
});
</script>

<template>
  <Modal :title="title" class="w-full max-w-[560px]">
    <StatusLogTimeline :logs="logs" :status-type="statusType" />
  </Modal>
</template>
