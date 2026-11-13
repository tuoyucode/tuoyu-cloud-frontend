import type { LabelTemplateApi } from '@tuoyu/shared/api/mes/labelTemplate';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';

import { $t } from '#/locales';

/** 适用对象（与后端 LabelTarget 一致） */
export const LABEL_TARGETS: LabelTemplateApi.Target[] = ['sn', 'batch'];

/** 条码类型（与后端 BarcodeType 一致） */
export const BARCODE_TYPES: LabelTemplateApi.Barcode[] = ['code128', 'qrcode'];

/** 可以显示的字段及适用的对象（与后端 LabelField 一致，按常用顺序） */
export const LABEL_FIELDS: {
  key: string;
  targets: LabelTemplateApi.Target[];
}[] = [
  { key: 'snCode', targets: ['sn'] },
  { key: 'batchCode', targets: ['sn', 'batch'] },
  { key: 'materialCode', targets: ['sn', 'batch'] },
  { key: 'materialName', targets: ['sn', 'batch'] },
  { key: 'specification', targets: ['sn', 'batch'] },
  { key: 'workorderCode', targets: ['sn', 'batch'] },
  { key: 'quantity', targets: ['batch'] },
  { key: 'productionDate', targets: ['sn', 'batch'] },
];

/** 一个标签最多显示的字段数（与后端一致） */
export const MAX_FIELDS = 8;

/** 新模板的默认字段 */
export const DEFAULT_FIELDS: Record<LabelTemplateApi.Target, string[]> = {
  batch: ['batchCode', 'materialName', 'quantity', 'productionDate'],
  sn: ['snCode', 'materialName', 'productionDate'],
};

export function targetLabel(target?: string) {
  return target ? $t(`mes.labelTemplate.targets.${target}`) : '';
}

export function barcodeLabel(type?: string) {
  return type ? $t(`mes.labelTemplate.barcodes.${type}`) : '';
}

export function fieldLabel(key: string) {
  return $t(`mes.labelTemplate.fieldNames.${key}`);
}

/** 适用于该对象的字段 */
export function fieldsFor(target?: string): string[] {
  return LABEL_FIELDS.filter((field) =>
    field.targets.includes(target as LabelTemplateApi.Target),
  ).map((field) => field.key);
}

/** 换了适用对象后，去掉不适用的字段（保持顺序） */
export function keepApplicableFields(fields: unknown, target?: string) {
  const allowed = new Set(fieldsFor(target));
  return Array.isArray(fields)
    ? fields.map(String).filter((key) => allowed.has(key))
    : [];
}

/** 预览用的示例数据 */
export function sampleLabel(target?: string): LabelTemplateApi.LabelData {
  return {
    barcode: target === 'batch' ? 'B20261110-01' : 'SN2026111000001',
    batchCode: 'B20261110-01',
    id: '0',
    materialCode: 'P-1001',
    materialName: $t('mes.labelTemplate.sampleProduct'),
    productionDate: '2026-11-10',
    quantity: 120,
    snCode: 'SN2026111000001',
    specification: 'V2.0',
    unit: $t('mes.labelTemplate.sampleUnit'),
    workorderCode: 'WO20261110001',
  };
}

/** 查询条件：一行最多 4 个 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'templateName',
      label: $t('mes.labelTemplate.templateName'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: LABEL_TARGETS.map((value) => ({
          label: targetLabel(value),
          value,
        })),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'targetType',
      label: $t('mes.labelTemplate.targetType'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: BARCODE_TYPES.map((value) => ({
          label: barcodeLabel(value),
          value,
        })),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'barcodeType',
      label: $t('mes.labelTemplate.barcodeType'),
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
export function useColumns(): VxeTableGridOptions<LabelTemplateApi.Template>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'templateName',
      minWidth: 160,
      slots: { default: 'templateName' },
      sortable: true,
      title: $t('mes.labelTemplate.templateName'),
    },
    {
      field: 'targetType',
      formatter: ({ cellValue }) => targetLabel(cellValue),
      title: $t('mes.labelTemplate.targetType'),
      width: 100,
    },
    {
      field: 'paperWidth',
      formatter: ({ row }) =>
        $t('mes.labelTemplate.sizeValue', {
          height: row.paperHeight,
          width: row.paperWidth,
        }),
      title: $t('mes.labelTemplate.size'),
      width: 130,
    },
    {
      field: 'columnCount',
      title: $t('mes.labelTemplate.columnCount'),
      width: 90,
    },
    {
      field: 'barcodeType',
      formatter: ({ cellValue }) => barcodeLabel(cellValue),
      title: $t('mes.labelTemplate.barcodeType'),
      width: 100,
    },
    {
      field: 'fields',
      formatter: ({ cellValue }) =>
        Array.isArray(cellValue)
          ? cellValue.map((key: string) => fieldLabel(key)).join('、')
          : '',
      minWidth: 220,
      title: $t('mes.labelTemplate.fields'),
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
      width: 140,
    },
  ];
}

const mmProps = (min: number, max: number) => ({
  class: 'w-full',
  controlsPosition: 'right' as const,
  max,
  min,
  precision: 0,
});

/** 毫米输入框的单位（输入框的后缀） */
const mmSuffix = () => ({ suffix: () => $t('mes.labelTemplate.mm') });

/** 新增、编辑表单：两列，名称、显示的字段与备注占整行 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        placeholder: $t('mes.labelTemplate.templateNamePlaceholder'),
      },
      fieldName: 'templateName',
      formItemClass: 'md:col-span-2',
      label: $t('mes.labelTemplate.templateName'),
      rules: 'required',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        options: LABEL_TARGETS.map((value) => ({
          label: targetLabel(value),
          value,
        })),
      },
      defaultValue: 'sn',
      fieldName: 'targetType',
      label: $t('mes.labelTemplate.targetType'),
      rules: 'selectRequired',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        options: BARCODE_TYPES.map((value) => ({
          label: barcodeLabel(value),
          value,
        })),
      },
      defaultValue: 'code128',
      fieldName: 'barcodeType',
      label: $t('mes.labelTemplate.barcodeType'),
      rules: 'selectRequired',
    },
    {
      component: 'InputNumber',
      componentProps: mmProps(10, 200),
      defaultValue: 50,
      fieldName: 'paperWidth',
      label: $t('mes.labelTemplate.paperWidth'),
      renderComponentContent: mmSuffix,
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: mmProps(10, 200),
      defaultValue: 30,
      fieldName: 'paperHeight',
      label: $t('mes.labelTemplate.paperHeight'),
      renderComponentContent: mmSuffix,
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: {
        class: 'w-full',
        controlsPosition: 'right',
        max: 6,
        min: 1,
        precision: 0,
      },
      defaultValue: 1,
      fieldName: 'columnCount',
      help: $t('mes.labelTemplate.columnCountHelp'),
      label: $t('mes.labelTemplate.columnCount'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: mmProps(0, 20),
      defaultValue: 2,
      fieldName: 'columnGap',
      label: $t('mes.labelTemplate.columnGap'),
      renderComponentContent: mmSuffix,
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        multiple: true,
        multipleLimit: MAX_FIELDS,
        options: fieldsFor('sn').map((value) => ({
          label: fieldLabel(value),
          value,
        })),
        placeholder: $t('crud.selectPlaceholder'),
      },
      defaultValue: DEFAULT_FIELDS.sn,
      dependencies: {
        componentProps: (values) => ({
          options: fieldsFor(values.targetType).map((value) => ({
            label: fieldLabel(value),
            value,
          })),
        }),
        triggerFields: ['targetType'],
      },
      fieldName: 'fields',
      formItemClass: 'md:col-span-2',
      help: $t('mes.labelTemplate.fieldsHelp'),
      label: $t('mes.labelTemplate.fields'),
      rules: 'selectRequired',
    },
    {
      component: 'Switch',
      componentProps: { activeValue: '1', inactiveValue: '0' },
      defaultValue: '0',
      fieldName: 'defaultFlag',
      help: $t('mes.labelTemplate.defaultHelp'),
      label: $t('mes.labelTemplate.default'),
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
      component: 'Input',
      componentProps: {
        maxlength: 500,
        placeholder: $t('crud.remarkPlaceholder'),
        rows: 2,
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

/** 表单的值转为接口参数 */
export function toTemplateForm(
  values: Record<string, any>,
): LabelTemplateApi.Form {
  return {
    barcodeType: values.barcodeType,
    columnCount: Number(values.columnCount),
    columnGap: Number(values.columnGap ?? 0),
    defaultFlag: values.defaultFlag === '1' ? '1' : '0',
    fields: keepApplicableFields(values.fields, values.targetType),
    paperHeight: Number(values.paperHeight),
    paperWidth: Number(values.paperWidth),
    remark: values.remark,
    status: values.status ?? '0',
    targetType: values.targetType,
    templateName: values.templateName,
  };
}
