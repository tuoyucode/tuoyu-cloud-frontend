<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  Alert,
  Button,
  Input,
  message,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import {
  getInstanceVariables,
  updateInstanceVariable,
} from '#/api/workflow/instance';
import { $t } from '#/locales';
import { hasPermission } from '#/utils/permission';

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

const columns = computed<TableColumnsType<Row>>(() => [
  {
    dataIndex: 'key',
    title: $t('workflow.processInstance.variableKey'),
    width: 200,
  },
  {
    key: 'type',
    title: $t('workflow.processInstance.variableType'),
    width: 90,
  },
  { key: 'value', title: $t('workflow.processInstance.variableValue') },
  ...(canEdit.value
    ? [
        {
          align: 'right' as const,
          key: 'actions',
          title: $t('crud.actions'),
          width: 140,
        },
      ]
    : []),
]);

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
    message.success($t('crud.saved'));
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
    <Alert
      v-if="canEdit"
      :message="$t('workflow.processInstance.variableEditHelp')"
      class="mb-3"
      show-icon
      type="info"
    />
    <Table
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      :pagination="false"
      row-key="key"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'type'">
          <Tag :bordered="false">{{ variableType(record.value) }}</Tag>
        </template>
        <template v-else-if="column.key === 'value'">
          <Input
            v-if="editingKey === record.key"
            v-model:value="editingValue"
            size="small"
          />
          <code v-else class="font-mono text-xs break-all">
            {{ formatVariableValue(record.value) }}
          </code>
        </template>
        <template v-else-if="column.key === 'actions'">
          <template v-if="editingKey === record.key">
            <Button
              :loading="saving"
              size="small"
              type="link"
              @click="onSave(record as Row)"
            >
              {{ $t('crud.save') }}
            </Button>
            <Button size="small" type="link" @click="onCancelEdit">
              {{ $t('common.cancel') }}
            </Button>
          </template>
          <Tooltip
            v-else-if="!isEditableVariable(record.value)"
            :title="$t('workflow.processInstance.variableNotEditable')"
          >
            <Button disabled size="small" type="link">
              {{ $t('common.edit') }}
            </Button>
          </Tooltip>
          <Button
            v-else
            size="small"
            type="link"
            @click="onEdit(record as Row)"
          >
            {{ $t('common.edit') }}
          </Button>
        </template>
      </template>
    </Table>
  </Modal>
</template>
