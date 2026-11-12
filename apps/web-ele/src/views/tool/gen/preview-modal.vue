<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { previewGenCode } from '@tuoyu/shared/api/tool/gen';
import { useClipboard } from '@vueuse/core';
import { ElButton, ElEmpty, ElMessage, ElTabPane, ElTabs } from 'element-plus';

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
  ElMessage.success($t('tool.gen.copied'));
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
    <div v-loading="loading" class="min-h-32">
      <ElEmpty v-if="!loading && files.length === 0" />
      <template v-else>
        <ElTabs v-model="activeKey">
          <ElTabPane
            v-for="file in files"
            :key="file.key"
            :label="file.label"
            :name="file.key"
          />
        </ElTabs>
        <div v-if="active" class="flex items-center justify-between pb-2">
          <span class="font-mono text-xs text-muted-foreground">
            {{ active.label }}
            <template v-if="templateLanguage(active.key)">
              · {{ templateLanguage(active.key) }}
            </template>
          </span>
          <ElButton size="small" @click="onCopy">
            {{ $t('tool.gen.copy') }}
          </ElButton>
        </div>
        <pre
          v-if="active"
          class="m-0 max-h-[60vh] overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-5"
        ><code>{{ active.code }}</code></pre>
      </template>
    </div>
  </Modal>
</template>
