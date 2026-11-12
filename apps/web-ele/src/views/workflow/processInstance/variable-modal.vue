<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  getInstanceVariables,
  updateInstanceVariable,
} from '@tuoyu/shared/api/workflow/instance';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import {
  ElAlert,
  ElButton,
  ElInput,
  ElMessage,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTooltip,
} from 'element-plus';

import { $t } from '#/locales';

import { formatVariableValue, isEditableVariable, variableType } from './data';

type Row = { key: string; value: unknown };

const instanceId = ref('');
const rows = ref<Row[]>([]);
const loading = ref(false);
/** 正在修改的变量及其新值 */
const editingKey = ref<string>();
const editingValue = ref('');
const saving = ref(false);

const canEdit = computed(() => hasPermission('workflow:instance:variable'));

async function load() {
  loading.value = true;
  try {
    const result = await getInstanceVariables(instanceId.value);
    rows.value = (result.variableList ?? []).map((item) => ({
      key: item.key,
      value: item.value,
    }));
  } finally {
    loading.value = false;
  }
}

function onEdit(row: Row) {
  editingKey.value = row.key;
  editingValue.value = formatVariableValue(row.value);
}

function onCancelEdit() {
  editingKey.value = undefined;
}

async function onSave(row: Row) {
  saving.value = true;
  try {
    await updateInstanceVariable(instanceId.value, row.key, editingValue.value);
    ElMessage.success($t('crud.saved'));
    editingKey.value = undefined;
    await load();
  } finally {
    saving.value = false;
  }
}

const [Modal, modalApi] = useVbenModal({
  footer: false,
  onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    const data = modalApi.getData() as { instanceId: string };
    instanceId.value = data.instanceId;
    editingKey.value = undefined;
    rows.value = [];
    load();
  },
});
</script>

<template>
  <Modal
    :title="$t('workflow.processInstance.variablesTitle')"
    class="w-full max-w-[880px]"
  >
    <ElAlert
      v-if="canEdit"
      :closable="false"
      :title="$t('workflow.processInstance.variableEditHelp')"
      class="mb-3"
      show-icon
      type="info"
    />
    <ElTable v-loading="loading" :data="rows" row-key="key" size="small">
      <ElTableColumn
        :label="$t('workflow.processInstance.variableKey')"
        prop="key"
        width="200"
      />
      <ElTableColumn
        :label="$t('workflow.processInstance.variableType')"
        width="90"
      >
        <template #default="{ row }">
          <ElTag disable-transitions type="info">
            {{ variableType(row.value) }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn :label="$t('workflow.processInstance.variableValue')">
        <template #default="{ row }">
          <ElInput
            v-if="editingKey === row.key"
            v-model="editingValue"
            size="small"
          />
          <code v-else class="font-mono text-xs break-all">
            {{ formatVariableValue(row.value) }}
          </code>
        </template>
      </ElTableColumn>
      <ElTableColumn
        v-if="canEdit"
        :label="$t('crud.actions')"
        align="right"
        width="140"
      >
        <template #default="{ row }">
          <template v-if="editingKey === row.key">
            <ElButton
              :loading="saving"
              link
              size="small"
              type="primary"
              @click="onSave(row as Row)"
            >
              {{ $t('crud.save') }}
            </ElButton>
            <ElButton link size="small" type="primary" @click="onCancelEdit">
              {{ $t('common.cancel') }}
            </ElButton>
          </template>
          <ElTooltip
            v-else-if="!isEditableVariable(row.value)"
            :content="$t('workflow.processInstance.variableNotEditable')"
          >
            <!-- 禁用的按钮不触发鼠标事件，外面包一层才能显示提示 -->
            <span>
              <ElButton disabled link size="small" type="primary">
                {{ $t('common.edit') }}
              </ElButton>
            </span>
          </ElTooltip>
          <ElButton
            v-else
            link
            size="small"
            type="primary"
            @click="onEdit(row as Row)"
          >
            {{ $t('common.edit') }}
          </ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
  </Modal>
</template>
