import type { PostApi } from '@tuoyu/shared/api/system/post';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';
import { getPostDeptTree } from '@tuoyu/shared/api/system/post';

import { $t } from '#/locales';

/** 查询条件：一行最多 4 个 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'postCode',
      label: $t('system.post.postCode'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'postName',
      label: $t('system.post.postName'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'postCategory',
      label: $t('system.post.postCategory'),
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
export function useColumns(): VxeTableGridOptions<PostApi.Post>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    { field: 'postCode', minWidth: 120, title: $t('system.post.postCode') },
    { field: 'postName', minWidth: 140, title: $t('system.post.postName') },
    {
      field: 'postCategory',
      minWidth: 120,
      title: $t('system.post.postCategory'),
    },
    { field: 'deptName', minWidth: 140, title: $t('system.post.dept') },
    { field: 'postSort', title: $t('crud.sort'), width: 100 },
    {
      field: 'status',
      slots: { default: 'status' },
      title: $t('crud.status'),
      width: 100,
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

/** 新增、编辑表单：两列，备注占整行 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('system.post.postNamePlaceholder') },
      fieldName: 'postName',
      label: $t('system.post.postName'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('system.post.postCodePlaceholder') },
      fieldName: 'postCode',
      label: $t('system.post.postCode'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('system.post.postCategoryPlaceholder'),
      },
      fieldName: 'postCategory',
      label: $t('system.post.postCategory'),
    },
    {
      component: 'ApiTreeSelect',
      componentProps: {
        api: getPostDeptTree,
        childrenField: 'children',
        labelField: 'label',
        placeholder: $t('crud.selectPlaceholder'),
        treeDefaultExpandAll: true,
        valueField: 'id',
      },
      fieldName: 'deptId',
      label: $t('system.post.dept'),
      rules: 'selectRequired',
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0 },
      defaultValue: 0,
      fieldName: 'postSort',
      label: $t('crud.sort'),
      rules: 'required',
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

/** 加载表单中依赖字典的选项 */
export async function loadFormOptions() {
  return { status: await getDictOptions(DictType.NORMAL_DISABLE) };
}
