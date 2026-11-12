<script lang="ts" setup>
import type { DictApi } from '@tuoyu/shared/api/system/dict';
import type { GenApi } from '@tuoyu/shared/api/tool/gen';
import type { FlagField } from '@tuoyu/shared/pages/tool/gen-edit';

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
  ElAlert,
  ElButton,
  ElCheckbox,
  ElInput,
  ElMessage,
  ElSelectV2,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
} from 'element-plus';

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
      componentProps: { data: listToTree(items, 'menuId', 'parentId') },
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
    ElMessage.warning(
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
    ElMessage.warning($t(problem));
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
    ElMessage.success($t('crud.saved'));
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
        <ElButton @click="goBack">{{ $t('tool.gen.backToList') }}</ElButton>
        <ElButton
          :disabled="loading || !info"
          :loading="saving"
          type="primary"
          @click="onSave"
        >
          {{ $t('tool.gen.saveConfig') }}
        </ElButton>
      </div>
    </template>

    <div v-loading="loading" class="rounded-md bg-card p-4">
      <ElTabs v-model="activeTab">
        <ElTabPane :label="$t('tool.gen.tabBasic')" name="basic">
          <BasicForm />
        </ElTabPane>
        <ElTabPane :label="$t('tool.gen.tabColumns')" name="columns">
          <ElAlert
            :closable="false"
            :title="$t('tool.gen.columnsHelp')"
            class="mb-3"
            show-icon
            type="info"
          />
          <ElTable
            :data="columns"
            max-height="calc(100vh - 360px)"
            row-key="columnId"
            size="small"
          >
            <ElTableColumn label="#" prop="sort" width="56" />
            <ElTableColumn
              :label="$t('tool.gen.columnName')"
              prop="columnName"
              show-overflow-tooltip
              width="150"
            />
            <ElTableColumn :label="$t('tool.gen.columnComment')" width="170">
              <template #default="{ row }">
                <ElInput v-model="row.columnComment" size="small" />
              </template>
            </ElTableColumn>
            <ElTableColumn
              :label="$t('tool.gen.columnType')"
              prop="columnType"
              show-overflow-tooltip
              width="120"
            />
            <ElTableColumn :label="$t('tool.gen.javaType')" width="150">
              <template #default="{ row }">
                <ElSelectV2
                  v-model="row.javaType"
                  :options="javaTypeOptions"
                  class="w-full"
                  size="small"
                />
              </template>
            </ElTableColumn>
            <ElTableColumn :label="$t('tool.gen.javaField')" width="150">
              <template #default="{ row }">
                <ElInput
                  v-model="row.javaField"
                  :class="{ 'field-error': !row.javaField?.trim() }"
                  size="small"
                />
              </template>
            </ElTableColumn>
            <ElTableColumn
              v-for="field in FLAG_FIELDS"
              :key="field"
              :label="flagLabels[field]"
              align="center"
              width="72"
            >
              <template #default="{ row }">
                <ElCheckbox
                  :model-value="isFlagOn(row[field])"
                  @change="
                    (checked) =>
                      setFlag(row as GenApi.Column, field, checked as boolean)
                  "
                />
              </template>
            </ElTableColumn>
            <ElTableColumn :label="$t('tool.gen.queryType')" width="120">
              <template #default="{ row }">
                <ElSelectV2
                  v-model="row.queryType"
                  :options="queryTypeOptions"
                  class="w-full"
                  size="small"
                />
              </template>
            </ElTableColumn>
            <ElTableColumn :label="$t('tool.gen.htmlType')" width="140">
              <template #default="{ row }">
                <ElSelectV2
                  v-model="row.htmlType"
                  :options="htmlTypeOptions"
                  class="w-full"
                  size="small"
                />
              </template>
            </ElTableColumn>
            <ElTableColumn :label="$t('tool.gen.dictType')" width="190">
              <template #default="{ row }">
                <ElSelectV2
                  v-model="row.dictType"
                  :disabled="!isDictHtmlType(row.htmlType)"
                  :options="dictTypeOptions"
                  :placeholder="
                    isDictHtmlType(row.htmlType)
                      ? $t('crud.selectPlaceholder')
                      : $t('tool.gen.dictNotApplicable')
                  "
                  class="w-full"
                  clearable
                  filterable
                  size="small"
                />
              </template>
            </ElTableColumn>
          </ElTable>
        </ElTabPane>
        <ElTabPane :label="$t('tool.gen.tabGenerate')" name="generate">
          <GenerateForm />
        </ElTabPane>
      </ElTabs>
    </div>
  </Page>
</template>

<style scoped>
/* Java 属性名为空时标红边框（Element Plus 的输入框没有单独的错误状态属性） */
.field-error :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-danger) inset;
}
</style>
