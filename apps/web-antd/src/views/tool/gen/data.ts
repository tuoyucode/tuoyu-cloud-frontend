import type { GenApi } from '@tuoyu/shared/api/tool/gen';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { listDataNames } from '@tuoyu/shared/api/tool/gen';

import { $t } from '#/locales';

/** 编辑生成配置页面的路由（菜单“修改生成配置”，隐藏） */
export const EDIT_PAGE_PATH = '/tool/gen-edit/index';

/** 代码生成列表页面的路由 */
export const LIST_PAGE_PATH = '/tool/gen';

/** 标记为“是”的值 */
export const YES = '1';

/** 数据源下拉选项 */
export async function loadDataNameOptions() {
  const names = await listDataNames();
  return (names ?? []).map((name) => ({ label: name, value: name }));
}

/** 查询条件：一行最多 4 个 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: loadDataNameOptions,
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'dataName',
      label: $t('tool.gen.dataName'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'tableName',
      label: $t('tool.gen.tableName'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'tableComment',
      label: $t('tool.gen.tableComment'),
    },
    {
      component: 'RangePicker',
      componentProps: { class: 'w-full', valueFormat: 'YYYY-MM-DD' },
      fieldName: 'createTime',
      label: $t('crud.createTime'),
    },
  ];
}

/** 把查询表单的值转换为后端的查询条件：日期范围转为 params.beginTime / endTime（包含结束当天） */
export function toQuery(values: Record<string, any>): GenApi.Query {
  const { createTime, ...rest } = values;
  const query: GenApi.Query = { ...rest };
  if (Array.isArray(createTime) && createTime.length === 2) {
    query.params = {
      beginTime: `${createTime[0]} 00:00:00`,
      endTime: `${createTime[1]} 23:59:59`,
    };
  }
  return query;
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<GenApi.Table>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    { field: 'dataName', title: $t('tool.gen.dataName'), width: 110 },
    { field: 'tableName', minWidth: 160, title: $t('tool.gen.tableName') },
    {
      field: 'tableComment',
      minWidth: 140,
      title: $t('tool.gen.tableComment'),
    },
    { field: 'className', minWidth: 140, title: $t('tool.gen.className') },
    { field: 'createTime', title: $t('crud.createTime'), width: 170 },
    { field: 'updateTime', title: $t('tool.gen.updateTime'), width: 170 },
    {
      align: 'right',
      field: 'actions',
      fixed: 'right',
      slots: { default: 'actions' },
      title: $t('crud.actions'),
      width: 260,
    },
  ];
}

/** 导入表弹窗：查询条件 */
export function useImportSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: {
        api: loadDataNameOptions,
        placeholder: $t('crud.selectPlaceholder'),
      },
      defaultValue: 'master',
      fieldName: 'dataName',
      label: $t('tool.gen.dataName'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'tableName',
      label: $t('tool.gen.tableName'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'tableComment',
      label: $t('tool.gen.tableComment'),
    },
  ];
}

/** 导入表弹窗：表格列 */
export function useImportColumns(): VxeTableGridOptions<GenApi.DbTable>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    { field: 'tableName', minWidth: 180, title: $t('tool.gen.tableName') },
    {
      field: 'tableComment',
      minWidth: 160,
      title: $t('tool.gen.tableComment'),
    },
    { field: 'createTime', title: $t('crud.createTime'), width: 170 },
  ];
}

/**
 * 预览中显示的文件名：去掉模板根目录 fm/ 与模板后缀 .ftl，例如 fm/vben/index.vue.ftl → vben/index.vue
 */
export function templateLabel(path: string) {
  return path.replace(/^fm\//, '').replace(/\.ftl$/, '');
}

/** 预览代码的语言（只用于显示标签） */
export function templateLanguage(path: string) {
  const name = templateLabel(path);
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1);
}

/** 下载的文件名：单张表用表名，多张表用“代码生成” */
export function downloadFileName(tables: Pick<GenApi.Table, 'tableName'>[]) {
  const base =
    tables.length === 1 && tables[0]
      ? tables[0].tableName
      : $t('tool.gen.batchFileName');
  return `${base}.zip`;
}

/** 编辑页“基本信息”：两列，备注占整行 */
export function useBasicFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { maxlength: 200 },
      fieldName: 'tableName',
      label: $t('tool.gen.tableName'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { maxlength: 500 },
      fieldName: 'tableComment',
      label: $t('tool.gen.tableComment'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { maxlength: 100 },
      fieldName: 'className',
      help: $t('tool.gen.classNameHelp'),
      label: $t('tool.gen.className'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { maxlength: 50 },
      fieldName: 'functionAuthor',
      label: $t('tool.gen.functionAuthor'),
      rules: 'required',
    },
    {
      component: 'Textarea',
      componentProps: {
        maxlength: 500,
        placeholder: $t('crud.remarkPlaceholder'),
        rows: 3,
      },
      fieldName: 'remark',
      formItemClass: 'md:col-span-2',
      label: $t('crud.remark'),
    },
  ];
}

/** 编辑页“生成信息”与生成选项：两列；按模板类型与开关显示对应的字段 */
export function useGenerateFormSchema(): VbenFormSchema[] {
  const isTree = (values: Record<string, any>) => values.tplCategory === 'tree';
  // 字段选项在页面加载字段后填入
  const fieldSelect = {
    options: [],
    placeholder: $t('crud.selectPlaceholder'),
  };
  return [
    {
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: $t('tool.gen.tplCrud'), value: 'crud' },
          { label: $t('tool.gen.tplTree'), value: 'tree' },
        ],
      },
      defaultValue: 'crud',
      fieldName: 'tplCategory',
      label: $t('tool.gen.tplCategory'),
      rules: 'selectRequired',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: $t('tool.gen.frontendEle'), value: 'ele' },
          { label: $t('tool.gen.frontendAntd'), value: 'antd' },
        ],
      },
      defaultValue: 'ele',
      fieldName: 'frontendType',
      help: $t('tool.gen.frontendTypeHelp'),
      label: $t('tool.gen.frontendType'),
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      fieldName: 'packageName',
      help: $t('tool.gen.packageNameHelp'),
      label: $t('tool.gen.packageName'),
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'moduleName',
      help: $t('tool.gen.moduleNameHelp'),
      label: $t('tool.gen.moduleName'),
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'businessName',
      help: $t('tool.gen.businessNameHelp'),
      label: $t('tool.gen.businessName'),
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'functionName',
      help: $t('tool.gen.functionNameHelp'),
      label: $t('tool.gen.functionName'),
      rules: 'required',
    },
    {
      component: 'TreeSelect',
      // 菜单树在页面加载时填入
      componentProps: {
        allowClear: true,
        fieldNames: {
          children: 'children',
          label: 'menuName',
          value: 'menuId',
        },
        placeholder: $t('tool.gen.parentMenuPlaceholder'),
        showSearch: true,
        treeData: [],
        treeNodeFilterProp: 'menuName',
      },
      fieldName: 'parentMenuId',
      formItemClass: 'md:col-span-2',
      help: $t('tool.gen.parentMenuHelp'),
      label: $t('tool.gen.parentMenu'),
    },
    {
      component: 'Divider',
      componentProps: { orientation: 'left', orientationMargin: 0 },
      fieldName: 'optionsDivider',
      formItemClass: 'md:col-span-2',
      hideLabel: true,
      renderComponentContent: () => ({
        default: () => $t('tool.gen.optionsTitle'),
      }),
    },
    {
      component: 'Switch',
      defaultValue: true,
      fieldName: 'enableExport',
      help: $t('tool.gen.enableExportHelp'),
      label: $t('tool.gen.enableExport'),
    },
    {
      component: 'Switch',
      defaultValue: false,
      fieldName: 'enableStatus',
      help: $t('tool.gen.enableStatusHelp'),
      label: $t('tool.gen.enableStatus'),
    },
    {
      component: 'Select',
      componentProps: fieldSelect,
      dependencies: {
        if: (values) => !!values.enableStatus,
        triggerFields: ['enableStatus'],
      },
      fieldName: 'statusField',
      label: $t('tool.gen.statusField'),
      rules: 'selectRequired',
    },
    {
      component: 'Switch',
      defaultValue: false,
      fieldName: 'enableSort',
      help: $t('tool.gen.enableSortHelp'),
      label: $t('tool.gen.enableSort'),
    },
    {
      component: 'Select',
      componentProps: fieldSelect,
      dependencies: {
        if: (values) => !!values.enableSort,
        triggerFields: ['enableSort'],
      },
      fieldName: 'sortField',
      label: $t('tool.gen.sortField'),
      rules: 'selectRequired',
    },
    {
      component: 'Switch',
      defaultValue: false,
      fieldName: 'enableUnique',
      help: $t('tool.gen.enableUniqueHelp'),
      label: $t('tool.gen.enableUnique'),
    },
    {
      component: 'Select',
      componentProps: { ...fieldSelect, mode: 'multiple' },
      dependencies: {
        if: (values) => !!values.enableUnique,
        triggerFields: ['enableUnique'],
      },
      fieldName: 'uniqueFields',
      label: $t('tool.gen.uniqueFields'),
      rules: 'selectRequired',
    },
    {
      component: 'Divider',
      componentProps: { orientation: 'left', orientationMargin: 0 },
      dependencies: { if: isTree, triggerFields: ['tplCategory'] },
      fieldName: 'treeDivider',
      formItemClass: 'md:col-span-2',
      hideLabel: true,
      renderComponentContent: () => ({
        default: () => $t('tool.gen.treeTitle'),
      }),
    },
    {
      component: 'Select',
      componentProps: fieldSelect,
      dependencies: { if: isTree, triggerFields: ['tplCategory'] },
      fieldName: 'treeCode',
      help: $t('tool.gen.treeCodeHelp'),
      label: $t('tool.gen.treeCode'),
      rules: 'selectRequired',
    },
    {
      component: 'Select',
      componentProps: fieldSelect,
      dependencies: { if: isTree, triggerFields: ['tplCategory'] },
      fieldName: 'treeParentCode',
      help: $t('tool.gen.treeParentCodeHelp'),
      label: $t('tool.gen.treeParentCode'),
      rules: 'selectRequired',
    },
    {
      component: 'Select',
      componentProps: fieldSelect,
      dependencies: { if: isTree, triggerFields: ['tplCategory'] },
      fieldName: 'treeName',
      help: $t('tool.gen.treeNameHelp'),
      label: $t('tool.gen.treeName'),
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      componentProps: { placeholder: '0' },
      dependencies: { if: isTree, triggerFields: ['tplCategory'] },
      fieldName: 'treeRootValue',
      help: $t('tool.gen.treeRootValueHelp'),
      label: $t('tool.gen.treeRootValue'),
    },
    {
      component: 'Select',
      componentProps: { ...fieldSelect, allowClear: true },
      dependencies: { if: isTree, triggerFields: ['tplCategory'] },
      fieldName: 'treeAncestors',
      help: $t('tool.gen.treeAncestorsHelp'),
      label: $t('tool.gen.treeAncestors'),
    },
    {
      component: 'Select',
      componentProps: { ...fieldSelect, allowClear: true },
      dependencies: { if: isTree, triggerFields: ['tplCategory'] },
      fieldName: 'treeOrderField',
      help: $t('tool.gen.treeOrderFieldHelp'),
      label: $t('tool.gen.treeOrderField'),
    },
  ];
}

/** 生成信息表单中按字段选择的项（加载字段后统一填入选项） */
export const FIELD_SELECT_NAMES = [
  'sortField',
  'statusField',
  'treeAncestors',
  'treeCode',
  'treeName',
  'treeOrderField',
  'treeParentCode',
  'uniqueFields',
] as const;
