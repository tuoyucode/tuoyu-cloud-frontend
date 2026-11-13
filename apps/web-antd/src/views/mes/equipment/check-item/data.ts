import type { EquipmentApi } from '@tuoyu/shared/api/mes/equipment';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getMesOptions, toSelectOptions } from '@tuoyu/shared/api/mes/common';
import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';
import { trimDecimal } from '@tuoyu/shared/pages/mes/decimal';
import { equipmentEnumOptions } from '@tuoyu/shared/pages/mes/equipment-enums';

import { $t } from '#/locales';

/** 适用范围：指定设备，或按设备类型 */
export type CheckItemScope = 'device' | 'type';

export async function deviceOptions() {
  return toSelectOptions(await getMesOptions('device'));
}

/** 查询条件 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'itemName',
      label: $t('mes.equipment.checkItem.itemName'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: deviceOptions,
        optionFilterProp: 'label',
        placeholder: $t('crud.selectPlaceholder'),
        showSearch: true,
      },
      fieldName: 'deviceId',
      label: $t('mes.equipment.checkItem.device'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'deviceType',
      label: $t('mes.equipment.checkItem.deviceType'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: equipmentEnumOptions('CheckResultType'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'resultType',
      label: $t('mes.equipment.checkItem.resultType'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: () => getDictOptions(DictType.NORMAL_DISABLE),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'status',
      label: $t('crud.status'),
    },
  ];
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<EquipmentApi.CheckItem>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'itemName',
      minWidth: 160,
      title: $t('mes.equipment.checkItem.itemName'),
    },
    {
      field: 'scope',
      minWidth: 180,
      slots: { default: 'scope' },
      title: $t('mes.equipment.checkItem.scope'),
    },
    {
      field: 'resultType',
      slots: { default: 'resultType' },
      title: $t('mes.equipment.checkItem.resultType'),
      width: 100,
    },
    {
      field: 'limits',
      minWidth: 140,
      slots: { default: 'limits' },
      title: $t('mes.equipment.checkItem.limits'),
    },
    {
      field: 'checkMethod',
      minWidth: 140,
      title: $t('mes.equipment.checkItem.checkMethod'),
    },
    {
      field: 'checkStandard',
      minWidth: 160,
      title: $t('mes.equipment.checkItem.checkStandard'),
    },
    {
      field: 'mandatory',
      formatter: ({ cellValue }) =>
        cellValue === 'Y'
          ? $t('mes.equipment.common.yes')
          : $t('mes.equipment.common.no'),
      title: $t('mes.equipment.checkItem.mandatory'),
      width: 80,
    },
    {
      field: 'sortNo',
      sortable: true,
      title: $t('mes.equipment.checkItem.sortNo'),
      width: 90,
    },
    {
      cellRender: {
        name: 'CellDict',
        props: { dictType: DictType.NORMAL_DISABLE },
      },
      field: 'status',
      title: $t('crud.status'),
      width: 90,
    },
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

/** 新增、编辑表单：适用范围二选一；数值型才有上下限与单位 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { maxlength: 128 },
      fieldName: 'itemName',
      label: $t('mes.equipment.checkItem.itemName'),
      rules: 'required',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        optionType: 'button',
        options: [
          { label: $t('mes.equipment.checkItem.scopeType'), value: 'type' },
          { label: $t('mes.equipment.checkItem.scopeDevice'), value: 'device' },
        ],
      },
      defaultValue: 'type',
      fieldName: 'scope',
      help: $t('mes.equipment.checkItem.scopeHelp'),
      label: $t('mes.equipment.checkItem.scope'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        class: 'w-full',
        api: deviceOptions,
        optionFilterProp: 'label',
        placeholder: $t('crud.selectPlaceholder'),
        showSearch: true,
      },
      dependencies: {
        if: (values) => values.scope === 'device',
        triggerFields: ['scope'],
      },
      fieldName: 'deviceId',
      label: $t('mes.equipment.checkItem.device'),
      rules: 'selectRequired',
    },
    {
      component: 'AutoComplete',
      componentProps: {
        filterOption: true,
        maxlength: 32,
        // 选项在抽屉打开时加载
        options: [],
        placeholder: $t('mes.equipment.checkItem.deviceTypePlaceholder'),
      },
      dependencies: {
        if: (values) => values.scope !== 'device',
        triggerFields: ['scope'],
      },
      fieldName: 'deviceType',
      label: $t('mes.equipment.checkItem.deviceType'),
      rules: 'required',
    },
    {
      component: 'RadioGroup',
      componentProps: { options: equipmentEnumOptions('CheckResultType') },
      defaultValue: 'judge',
      fieldName: 'resultType',
      label: $t('mes.equipment.checkItem.resultType'),
      rules: 'selectRequired',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: $t('mes.equipment.common.yes'), value: 'Y' },
          { label: $t('mes.equipment.common.no'), value: 'N' },
        ],
      },
      defaultValue: 'Y',
      fieldName: 'mandatory',
      label: $t('mes.equipment.checkItem.mandatory'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', formatter: trimDecimal, precision: 6 },
      dependencies: {
        if: (values) => values.resultType === 'numeric',
        triggerFields: ['resultType'],
      },
      fieldName: 'lowerLimit',
      help: $t('mes.equipment.checkItem.limitsHelp'),
      label: $t('mes.equipment.checkItem.lowerLimit'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', formatter: trimDecimal, precision: 6 },
      dependencies: {
        if: (values) => values.resultType === 'numeric',
        triggerFields: ['resultType'],
      },
      fieldName: 'upperLimit',
      label: $t('mes.equipment.checkItem.upperLimit'),
    },
    {
      component: 'Input',
      componentProps: { maxlength: 32 },
      dependencies: {
        if: (values) => values.resultType === 'numeric',
        triggerFields: ['resultType'],
      },
      fieldName: 'unit',
      label: $t('mes.equipment.checkItem.unit'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', max: 9999, min: 0, precision: 0 },
      defaultValue: 0,
      fieldName: 'sortNo',
      label: $t('mes.equipment.checkItem.sortNo'),
    },
    {
      component: 'Input',
      componentProps: { maxlength: 255 },
      fieldName: 'checkMethod',
      formItemClass: 'md:col-span-2',
      label: $t('mes.equipment.checkItem.checkMethod'),
    },
    {
      component: 'Input',
      componentProps: { maxlength: 255 },
      fieldName: 'checkStandard',
      formItemClass: 'md:col-span-2',
      label: $t('mes.equipment.checkItem.checkStandard'),
    },
    {
      component: 'RadioGroup',
      // 选项在抽屉打开时从字典加载
      componentProps: { options: [] },
      defaultValue: '0',
      fieldName: 'status',
      label: $t('crud.status'),
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

/** 接口数据转为表单值：按是否指定了设备确定适用范围 */
export function toCheckItemValues(item: EquipmentApi.CheckItem) {
  return {
    ...item,
    lowerLimit:
      item.lowerLimit === undefined || item.lowerLimit === null
        ? undefined
        : Number(item.lowerLimit),
    scope: (item.deviceId ? 'device' : 'type') as CheckItemScope,
    upperLimit:
      item.upperLimit === undefined || item.upperLimit === null
        ? undefined
        : Number(item.upperLimit),
  };
}

/**
 * 表单值转为接口参数：适用范围只提交选中的一项，判定型不提交上下限与单位；
 * 数值型至少要有一个限值，下限不大于上限（返回错误的文案键，没有错误时为 undefined）
 */
export function toCheckItemForm(values: Record<string, any>): {
  error?: string;
  form: EquipmentApi.CheckItemForm;
} {
  const { scope, ...rest } = values;
  const form = { ...rest } as EquipmentApi.CheckItemForm;
  if (scope === 'device') {
    delete form.deviceType;
  } else {
    delete form.deviceId;
  }
  if (form.resultType === 'numeric') {
    const lower = form.lowerLimit ?? undefined;
    const upper = form.upperLimit ?? undefined;
    if (lower === undefined && upper === undefined) {
      return { error: 'mes.equipment.checkItem.limitsHelp', form };
    }
    if (
      lower !== undefined &&
      upper !== undefined &&
      Number(lower) > Number(upper)
    ) {
      return { error: 'mes.equipment.checkItem.limitsHelp', form };
    }
  } else {
    delete form.lowerLimit;
    delete form.upperLimit;
    delete form.unit;
  }
  return { form };
}
