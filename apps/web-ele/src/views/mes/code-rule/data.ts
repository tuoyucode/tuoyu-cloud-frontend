import type { CodeRuleApi } from '@tuoyu/shared/api/mes/codeRule';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';
import { enumOptions } from '@tuoyu/shared/pages/mes/enums';

import { $t } from '#/locales';

/** 允许的日期格式（空字符串表示不带日期，与后端校验一致） */
export const DATE_PATTERNS = [
  'yyyyMMdd',
  'yyMMdd',
  'yyyyMM',
  'yyMM',
  'yyyy',
] as const;

/** 查询条件：一行最多 4 个 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'ruleCode',
      label: $t('mes.codeRule.ruleCode'),
    },
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'ruleName',
      label: $t('mes.codeRule.ruleName'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        clearable: true,
        api: () => getDictOptions(DictType.NORMAL_DISABLE),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'status',
      label: $t('crud.status'),
    },
  ];
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<CodeRuleApi.CodeRule>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'ruleCode',
      minWidth: 160,
      slots: { default: 'ruleCode' },
      sortable: true,
      title: $t('mes.codeRule.ruleCode'),
    },
    { field: 'ruleName', minWidth: 140, title: $t('mes.codeRule.ruleName') },
    { field: 'prefix', minWidth: 90, title: $t('mes.codeRule.prefix') },
    {
      field: 'datePattern',
      formatter: ({ cellValue }) =>
        cellValue || $t('mes.codeRule.datePatternNone'),
      minWidth: 110,
      title: $t('mes.codeRule.datePattern'),
    },
    {
      field: 'serialLength',
      title: $t('mes.codeRule.serialLength'),
      width: 110,
    },
    {
      field: 'resetCycle',
      slots: { default: 'resetCycle' },
      title: $t('mes.codeRule.resetCycle'),
      width: 110,
    },
    {
      field: 'status',
      slots: { default: 'status' },
      title: $t('crud.status'),
      width: 100,
    },
    {
      align: 'right',
      field: 'actions',
      fixed: 'right',
      slots: { default: 'actions' },
      title: $t('crud.actions'),
      width: 200,
    },
  ];
}

/** 新增、编辑表单：两列，备注占整行 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        placeholder: $t('mes.codeRule.ruleCodePlaceholder'),
      },
      fieldName: 'ruleCode',
      help: $t('mes.codeRule.ruleCodeHelp'),
      label: $t('mes.codeRule.ruleCode'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 128,
        placeholder: $t('mes.codeRule.ruleNamePlaceholder'),
      },
      fieldName: 'ruleName',
      label: $t('mes.codeRule.ruleName'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 32,
        placeholder: $t('mes.codeRule.prefixPlaceholder'),
      },
      fieldName: 'prefix',
      label: $t('mes.codeRule.prefix'),
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        // 空字符串表示不带日期，是有效的选项，不当作未选择
        emptyValues: [null, undefined],
        options: [
          { label: $t('mes.codeRule.datePatternNone'), value: '' },
          ...DATE_PATTERNS.map((value) => ({ label: value, value })),
        ],
      },
      defaultValue: 'yyyyMMdd',
      fieldName: 'datePattern',
      label: $t('mes.codeRule.datePattern'),
    },
    {
      component: 'InputNumber',
      componentProps: {
        class: 'w-full',
        controlsPosition: 'right',
        max: 12,
        min: 1,
        precision: 0,
      },
      defaultValue: 4,
      fieldName: 'serialLength',
      label: $t('mes.codeRule.serialLength'),
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: { class: 'w-full', options: enumOptions('ResetCycle') },
      defaultValue: 'day',
      fieldName: 'resetCycle',
      help: $t('mes.codeRule.resetCycleHelp'),
      label: $t('mes.codeRule.resetCycle'),
      rules: 'selectRequired',
    },
    {
      component: 'RadioGroup',
      // 选项在抽屉打开时从字典加载
      componentProps: { options: [] },
      defaultValue: '0',
      fieldName: 'status',
      help: $t('mes.codeRule.statusHelp'),
      label: $t('crud.status'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 500,
        placeholder: $t('crud.remarkPlaceholder'),
        rows: 3,
        showWordLimit: true,
        type: 'textarea',
      },
      fieldName: 'remark',
      formItemClass: 'md:col-span-2',
      label: $t('crud.remark'),
    },
  ];
}

/** 加载表单中依赖字典的选项（单选框只需要文字与值） */
export async function loadFormOptions() {
  const status = await getDictOptions(DictType.NORMAL_DISABLE);
  return {
    status: status.map(({ label, value }) => ({ label, value })),
  };
}

/** 把 Java 的日期格式（yyyy、yy、MM、dd）套用到日期上，用于表单中的示例 */
function formatPattern(pattern: string, date: Date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return pattern
    .replace('yyyy', year)
    .replace('yy', year.slice(2))
    .replace('MM', month)
    .replace('dd', day);
}

/** 按表单中的值生成示例编号（流水号为 1），与后端预览的格式一致 */
export function exampleCode(values: Record<string, any>, date = new Date()) {
  const prefix = (values.prefix as string | undefined) ?? '';
  const pattern = (values.datePattern as string | undefined) ?? '';
  const length = Math.min(12, Math.max(1, Number(values.serialLength) || 1));
  return `${prefix}${pattern ? formatPattern(pattern, date) : ''}${'1'.padStart(length, '0')}`;
}
