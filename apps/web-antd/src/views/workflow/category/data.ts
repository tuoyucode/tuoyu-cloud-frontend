import type { CategoryApi } from '@tuoyu/shared/api/workflow/category';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ROOT_PARENT_ID } from '@tuoyu/shared/pages/workflow/category';

import { $t } from '#/locales';

export {
  buildParentTree,
  ROOT_PARENT_ID,
} from '@tuoyu/shared/pages/workflow/category';

/** 查询条件 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'categoryName',
      label: $t('workflow.category.categoryName'),
    },
  ];
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<CategoryApi.Category>['columns'] {
  return [
    {
      align: 'left',
      field: 'categoryName',
      minWidth: 220,
      title: $t('workflow.category.categoryName'),
      treeNode: true,
    },
    { field: 'orderNum', title: $t('crud.sort'), width: 100 },
    { field: 'createTime', title: $t('crud.createTime'), width: 170 },
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

/** 新增、编辑表单：两列 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'TreeSelect',
      // 分类树在抽屉打开时加载
      componentProps: {
        fieldNames: {
          children: 'children',
          label: 'categoryName',
          value: 'categoryId',
        },
        placeholder: $t('crud.selectPlaceholder'),
        showSearch: true,
        treeData: [],
        treeDefaultExpandAll: true,
        treeNodeFilterProp: 'categoryName',
      },
      defaultValue: ROOT_PARENT_ID,
      fieldName: 'parentId',
      formItemClass: 'md:col-span-2',
      label: $t('workflow.category.parent'),
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 100,
        placeholder: $t('workflow.category.categoryNamePlaceholder'),
      },
      fieldName: 'categoryName',
      label: $t('workflow.category.categoryName'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0 },
      defaultValue: 0,
      fieldName: 'orderNum',
      label: $t('crud.sort'),
    },
  ];
}
