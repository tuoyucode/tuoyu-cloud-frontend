<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { previewGenCode } from '@tuoyu/shared/api/tool/gen';
import { useClipboard } from '@vueuse/core';
import { Button, Empty, message, Spin, Tabs } from 'ant-design-vue';

import { $t } from '#/locales';

import { templateLabel, templateLanguage } from './data';

type PreviewData = { tableId: string; tableName: string };

const loading = ref(false);
const tableName = ref('');
const files = ref<{ code: string; key: string; label: string }[]>([]);
const activeKey = ref<string>();

const { copy } = useClipboard({ legacy: true });

const active = computed(() =>
  files.value.find((file) => file.key === activeKey.value),
);

async function load(data: PreviewData) {
  tableName.value = data.tableName;
  files.value = [];
  loading.value = true;
  try {
    const result = await previewGenCode(data.tableId);
    files.value = Object.entries(result ?? {}).map(([key, code]) => ({
      code,
      key,
      label: templateLabel(key),
    }));
    activeKey.value = files.value[0]?.key;
  } finally {
    loading.value = false;
  }
}

async function onCopy() {
  if (!active.value) {
    return;
  }
  await copy(active.value.code);
  message.success($t('tool.gen.copied'));
}

const [Modal, modalApi] = useVbenModal({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      load(modalApi.getData() as PreviewData);
    }
  },
});
</script>

<template>
  <Modal
    :title="$t('tool.gen.previewTitle', { name: tableName })"
    class="w-full max-w-[1100px]"
  >
    <Spin :spinning="loading">
      <Empty v-if="!loading && files.length === 0" />
      <template v-else>
        <Tabs v-model:active-key="activeKey" size="small">
          <Tabs.TabPane
            v-for="file in files"
            :key="file.key"
            :tab="file.label"
          />
        </Tabs>
        <div v-if="active" class="flex items-center justify-between pb-2">
          <span class="text-muted-foreground font-mono text-xs">
            {{ active.label }}
            <template v-if="templateLanguage(active.key)">
              · {{ templateLanguage(active.key) }}
            </template>
          </span>
          <Button size="small" @click="onCopy">
            {{ $t('tool.gen.copy') }}
          </Button>
        </div>
        <pre
          v-if="active"
          class="bg-muted max-h-[60vh] overflow-auto rounded-md p-3 font-mono text-xs leading-5"
        ><code>{{ active.code }}</code></pre>
      </template>
    </Spin>
  </Modal>
</template>
