<script lang="ts" setup>
import type { DictApi } from '@tuoyu/shared/api/system/dict';
import type { GenApi } from '@tuoyu/shared/api/tool/gen';
import type { FlagField } from '@tuoyu/shared/pages/tool/gen-edit';
import type { TableColumnsType } from 'ant-design-vue';

import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { listDictTypeOptions } from '@tuoyu/shared/api/system/dict';
import { listMenu } from '@tuoyu/shared/api/system/menu';
import { getGenTable, updateGenTable } from '@tuoyu/shared/api/tool/gen';
import {
  buildSaveForm,
  columnOptions,
  FLAG_FIELDS,
  HTML_TYPES,
  isDictHtmlType,
  isFlagOn,
  JAVA_TYPES,
  QUERY_TYPES,
  readOptions,
  toFlag,
  toFrontendType,
  validateOptions,
} from '@tuoyu/shared/pages/tool/gen-edit';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { listToTree } from '@tuoyu/shared/utils/tree';
import {
  Alert,
  Button,
  Checkbox,
  Input,
  message,
  Select,
  Spin,
  Table,
  Tabs,
} from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import {
  FIELD_SELECT_NAMES,
  LIST_PAGE_PATH,
  useBasicFormSchema,
  useGenerateFormSchema,
} from './data';

defineOptions({ name: 'ToolGenEdit' });

const route = useRoute();
const router = useRouter();

const tableId = computed(() => String(route.params.tableId ?? ''));

const activeTab = ref('basic');
const loading = ref(false);
const saving = ref(false);
const info = ref<GenApi.Table>();
const columns = ref<GenApi.Column[]>([]);
const dictTypes = ref<DictApi.DictTypeItem[]>([]);

/** 菜单 ID → 名称，用于保存上级菜单名称 */
const menuNames = new Map<string, string>();

const [BasicForm, basicFormApi] = useVbenForm({
  layout: 'vertical',
  schema: useBasicFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-4',
});

const [GenerateForm, generateFormApi] = useVbenForm({
  layout: 'vertical',
  schema: useGenerateFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-4',
});

const flagLabels: Record<FlagField, string> = {
  isEdit: $t('tool.gen.isEdit'),
  isInsert: $t('tool.gen.isInsert'),
  isList: $t('tool.gen.isList'),
  isQuery: $t('tool.gen.isQuery'),
  isRequired: $t('tool.gen.isRequired'),
};

const tableColumns = computed<TableColumnsType<GenApi.Column>>(() => [
  { dataIndex: 'sort', title: '#', width: 56 },
  {
    dataIndex: 'columnName',
    ellipsis: true,
    title: $t('tool.gen.columnName'),
    width: 150,
  },
  {
    dataIndex: 'columnComment',
    key: 'columnComment',
    title: $t('tool.gen.columnComment'),
    width: 170,
  },
  {
    dataIndex: 'columnType',
    ellipsis: true,
    title: $t('tool.gen.columnType'),
    width: 120,
  },
  {
    dataIndex: 'javaType',
    key: 'javaType',
    title: $t('tool.gen.javaType'),
    width: 150,
  },
  {
    dataIndex: 'javaField',
    key: 'javaField',
    title: $t('tool.gen.javaField'),
    width: 150,
  },
  ...FLAG_FIELDS.map((field) => ({
    align: 'center' as const,
    dataIndex: field,
    key: field,
    title: flagLabels[field],
    width: 72,
  })),
  {
    dataIndex: 'queryType',
    key: 'queryType',
    title: $t('tool.gen.queryType'),
    width: 120,
  },
  {
    dataIndex: 'htmlType',
    key: 'htmlType',
    title: $t('tool.gen.htmlType'),
    width: 140,
  },
  {
    dataIndex: 'dictType',
    key: 'dictType',
    title: $t('tool.gen.dictType'),
    width: 190,
  },
]);

const javaTypeOptions = JAVA_TYPES.map((value) => ({ label: value, value }));
const queryTypeOptions = QUERY_TYPES.map((value) => ({ label: value, value }));
const htmlTypeOptions = HTML_TYPES.map((value) => ({
  label: $t(`tool.gen.html.${value}`),
  value,
}));

const dictTypeOptions = computed(() =>
  dictTypes.value.map((item) => ({
    label: `${item.dictName}（${item.dictType}）`,
    value: item.dictType,
  })),
);

function filterOption(input: string, option?: { label?: unknown }) {
  return String(option?.label ?? '')
    .toLowerCase()
    .includes(input.toLowerCase());
}

function setFlag(column: GenApi.Column, field: FlagField, checked: boolean) {
  column[field] = toFlag(checked);
}

async function loadMenus() {
  // 菜单列表需要 system:menu:list 权限；没有时不能选择上级菜单（保留原值）
  if (!hasPermission('system:menu:list')) {
    return;
  }
  const menus = await listMenu();
  const items = menus.filter((menu) => menu.menuType !== 'F');
  menuNames.clear();
  for (const menu of items) {
    menuNames.set(String(menu.menuId), menu.menuName);
  }
  generateFormApi.updateSchema([
    {
      componentProps: { treeData: listToTree(items, 'menuId', 'parentId') },
      fieldName: 'parentMenuId',
    },
  ]);
}

async function load() {
  if (!tableId.value) {
    return;
  }
  loading.value = true;
  try {
    const [detail, types] = await Promise.all([
      getGenTable(tableId.value),
      // 字典类型列表需要 system:dict:query 权限；没有时只能保留已配置的字典
      hasPermission('system:dict:query') ? listDictTypeOptions() : [],
      loadMenus(),
    ]);
    info.value = detail.info;
    columns.value = detail.columns ?? [];
    dictTypes.value = types ?? [];
    const options = columnOptions(columns.value);
    generateFormApi.updateSchema(
      FIELD_SELECT_NAMES.map((fieldName) => ({
        componentProps: { options },
        fieldName,
      })),
    );
    await basicFormApi.setValues(detail.info);
    await generateFormApi.setValues({
      businessName: detail.info.businessName,
      frontendType: toFrontendType(detail.info.frontendType),
      functionName: detail.info.functionName,
      moduleName: detail.info.moduleName,
      packageName: detail.info.packageName,
      tplCategory: detail.info.tplCategory || 'crud',
      ...readOptions(detail.info),
    });
  } finally {
    loading.value = false;
  }
}

function goBack() {
  router.push(LIST_PAGE_PATH);
}

async function onSave() {
  if (!info.value) {
    return;
  }
  const basic = await basicFormApi.validate();
  if (!basic.valid) {
    activeTab.value = 'basic';
    return;
  }
  const missingField = columns.value.find(
    (column) => !column.javaField?.trim(),
  );
  if (missingField) {
    activeTab.value = 'columns';
    message.warning(
      $t('tool.gen.javaFieldRequired', { name: missingField.columnName }),
    );
    return;
  }
  const generate = await generateFormApi.validate();
  if (!generate.valid) {
    activeTab.value = 'generate';
    return;
  }
  const basicValues = await basicFormApi.getValues();
  const generateValues = await generateFormApi.getValues();
  const tplCategory = generateValues.tplCategory as string;
  const parentMenuId = generateValues.parentMenuId
    ? String(generateValues.parentMenuId)
    : undefined;
  const options: GenApi.Options = {
    enableExport: !!generateValues.enableExport,
    enableSort: !!generateValues.enableSort,
    enableStatus: !!generateValues.enableStatus,
    enableUnique: !!generateValues.enableUnique,
    parentMenuId,
    parentMenuName: parentMenuId ? menuNames.get(parentMenuId) : undefined,
    sortField: generateValues.sortField,
    statusField: generateValues.statusField,
    treeAncestors: generateValues.treeAncestors,
    treeCode: generateValues.treeCode,
    treeName: generateValues.treeName,
    treeOrderField: generateValues.treeOrderField,
    treeParentCode: generateValues.treeParentCode,
    treeRootValue: generateValues.treeRootValue,
    uniqueFields: generateValues.uniqueFields,
  };
  const problem = validateOptions(options, tplCategory);
  if (problem) {
    activeTab.value = 'generate';
    message.warning($t(problem));
    return;
  }
  const table: GenApi.Table = {
    ...info.value,
    ...basicValues,
    businessName: generateValues.businessName,
    frontendType: toFrontendType(generateValues.frontendType),
    functionName: generateValues.functionName,
    moduleName: generateValues.moduleName,
    packageName: generateValues.packageName,
    tplCategory,
  };
  saving.value = true;
  try {
    await updateGenTable(buildSaveForm(table, columns.value, options));
    message.success($t('crud.saved'));
    goBack();
  } finally {
    saving.value = false;
  }
}

// 页面被缓存时切换到其他表也要重新加载
watch(tableId, load, { immediate: true });
</script>

<template>
  <Page
    :description="$t('tool.gen.editDescription')"
    :title="
      info
        ? $t('tool.gen.editTitleWithName', { name: info.tableName })
        : $t('tool.gen.editTitle')
    "
  >
    <template #extra>
      <div class="flex gap-2">
        <Button @click="goBack">{{ $t('tool.gen.backToList') }}</Button>
        <Button
          :disabled="loading || !info"
          :loading="saving"
          type="primary"
          @click="onSave"
        >
          {{ $t('tool.gen.saveConfig') }}
        </Button>
      </div>
    </template>

    <Spin :spinning="loading">
      <div class="bg-card rounded-md p-4">
        <Tabs v-model:active-key="activeTab">
          <Tabs.TabPane key="basic" :tab="$t('tool.gen.tabBasic')" force-render>
            <BasicForm />
          </Tabs.TabPane>
          <Tabs.TabPane
            key="columns"
            :tab="$t('tool.gen.tabColumns')"
            force-render
          >
            <Alert
              :message="$t('tool.gen.columnsHelp')"
              class="mb-3"
              show-icon
              type="info"
            />
            <Table
              :columns="tableColumns"
              :data-source="columns"
              :pagination="false"
              :scroll="{ x: 1600, y: 'calc(100vh - 360px)' }"
              row-key="columnId"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'columnComment'">
                  <Input v-model:value="record.columnComment" size="small" />
                </template>
                <template v-else-if="column.key === 'javaType'">
                  <Select
                    v-model:value="record.javaType"
                    :options="javaTypeOptions"
                    class="w-full"
                    size="small"
                  />
                </template>
                <template v-else-if="column.key === 'javaField'">
                  <Input
                    v-model:value="record.javaField"
                    :status="record.javaField?.trim() ? undefined : 'error'"
                    size="small"
                  />
                </template>
                <template
                  v-else-if="FLAG_FIELDS.includes(column.key as FlagField)"
                >
                  <Checkbox
                    :checked="isFlagOn(record[column.key as FlagField])"
                    @change="
                      (event) =>
                        setFlag(
                          record as GenApi.Column,
                          column.key as FlagField,
                          event.target.checked ?? false,
                        )
                    "
                  />
                </template>
                <template v-else-if="column.key === 'queryType'">
                  <Select
                    v-model:value="record.queryType"
                    :options="queryTypeOptions"
                    class="w-full"
                    size="small"
                  />
                </template>
                <template v-else-if="column.key === 'htmlType'">
                  <Select
                    v-model:value="record.htmlType"
                    :options="htmlTypeOptions"
                    class="w-full"
                    size="small"
                  />
                </template>
                <template v-else-if="column.key === 'dictType'">
                  <Select
                    v-model:value="record.dictType"
                    :disabled="!isDictHtmlType(record.htmlType)"
                    :filter-option="filterOption"
                    :options="dictTypeOptions"
                    :placeholder="
                      isDictHtmlType(record.htmlType)
                        ? $t('crud.selectPlaceholder')
                        : $t('tool.gen.dictNotApplicable')
                    "
                    allow-clear
                    class="w-full"
                    show-search
                    size="small"
                  />
                </template>
              </template>
            </Table>
          </Tabs.TabPane>
          <Tabs.TabPane
            key="generate"
            :tab="$t('tool.gen.tabGenerate')"
            force-render
          >
            <GenerateForm />
          </Tabs.TabPane>
        </Tabs>
      </div>
    </Spin>
  </Page>
</template>
