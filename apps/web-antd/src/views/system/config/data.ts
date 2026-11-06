import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ConfigApi } from '#/api/system/config';

import { DictType, getDictOptions } from '#/api/system/dict';
import { $t } from '#/locales';

/** 字典 sys_yes_no：Y 表示系统内置 */
export const BUILT_IN = 'Y';

/** 查询条件：一行最多 4 个 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'configName',
      label: $t('system.config.configName'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'configKey',
      label: $t('system.config.configKey'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: () => getDictOptions(DictType.YES_NO),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'configType',
      label: $t('system.config.configType'),
    },
  ];
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<ConfigApi.Config>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'configName',
      minWidth: 180,
      title: $t('system.config.configName'),
    },
    {
      className: 'font-mono',
      field: 'configKey',
      minWidth: 200,
      title: $t('system.config.configKey'),
    },
    {
      className: 'font-mono',
      field: 'configValue',
      minWidth: 160,
      showOverflow: 'tooltip',
      title: $t('system.config.configValue'),
    },
    {
      cellRender: { name: 'CellDict', props: { dictType: DictType.YES_NO } },
      field: 'configType',
      title: $t('system.config.configType'),
      width: 100,
    },
    {
      field: 'remark',
      minWidth: 160,
      showOverflow: 'tooltip',
      title: $t('crud.remark'),
    },
    { field: 'createTime', title: $t('crud.createTime'), width: 170 },
    {
      align: 'right',
      field: 'actions',
      fixed: 'right',
      slots: { default: 'actions' },
      title: $t('crud.actions'),
      width: 140,
    },
  ];
}

/** 新增、编辑表单：两列，键值与备注占整行 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        maxlength: 100,
        placeholder: $t('system.config.configNamePlaceholder'),
      },
      fieldName: 'configName',
      label: $t('system.config.configName'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        class: 'font-mono',
        maxlength: 100,
        placeholder: $t('system.config.configKeyPlaceholder'),
      },
      fieldName: 'configKey',
      label: $t('system.config.configKey'),
      rules: 'required',
    },
    {
      component: 'Textarea',
      componentProps: {
        class: 'font-mono',
        maxlength: 500,
        placeholder: $t('system.config.configValuePlaceholder'),
        rows: 3,
        showCount: true,
      },
      fieldName: 'configValue',
      formItemClass: 'md:col-span-2',
      label: $t('system.config.configValue'),
      rules: 'required',
    },
    {
      component: 'RadioGroup',
      // 选项在抽屉打开时从字典加载
      componentProps: { options: [] },
      defaultValue: 'N',
      fieldName: 'configType',
      help: $t('system.config.configTypeHelp'),
      label: $t('system.config.configType'),
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

/** 加载表单中依赖字典的选项 */
export async function loadFormOptions() {
  return { configType: await getDictOptions(DictType.YES_NO) };
}
