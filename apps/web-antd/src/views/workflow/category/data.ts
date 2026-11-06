import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CategoryApi } from '#/api/workflow/category';

import { $t } from '#/locales';
import { listToTree } from '#/utils/tree';

/** 顶级分类的上级 ID */
export const ROOT_PARENT_ID = 0;

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

/**
 * 上级分类的可选树：最外层加一个“顶级分类”；编辑时排除本分类及其下级
 *
 * @param list 扁平的分类列表
 * @param excludeId 编辑的分类 ID
 */
export function buildParentTree(
  list: CategoryApi.Category[],
  excludeId?: string,
) {
  const excluded = new Set<string>();
  if (excludeId) {
    excluded.add(excludeId);
    // 祖级列表中含有本分类的都是下级
    for (const item of list) {
      const ancestors = (item.ancestors ?? '').split(',');
      if (ancestors.includes(excludeId)) {
        excluded.add(String(item.categoryId));
      }
    }
  }
  const nodes = list.filter((item) => !excluded.has(String(item.categoryId)));
  return [
    {
      categoryId: ROOT_PARENT_ID,
      categoryName: $t('workflow.category.root'),
      children: listToTree(nodes, 'categoryId', 'parentId'),
    },
  ];
}
