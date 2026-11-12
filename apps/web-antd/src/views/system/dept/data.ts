import type { DeptApi } from '@tuoyu/shared/api/system/dept';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';
import {
  EMAIL_PATTERN,
  isRootDept,
  STATUS_NORMAL,
} from '@tuoyu/shared/pages/system/dept';

import { z } from '#/adapter/form';
import { $t } from '#/locales';

export {
  isRootDept,
  leaderLabel,
  ROOT_PARENT_ID,
  STATUS_NORMAL,
} from '@tuoyu/shared/pages/system/dept';

/** 查询条件：一行最多 4 个 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'deptName',
      label: $t('system.dept.deptName'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'deptCategory',
      label: $t('system.dept.deptCategory'),
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
export function useColumns(): VxeTableGridOptions<DeptApi.Dept>['columns'] {
  return [
    {
      field: 'deptName',
      minWidth: 200,
      title: $t('system.dept.deptName'),
      treeNode: true,
    },
    {
      field: 'deptCategory',
      minWidth: 120,
      title: $t('system.dept.deptCategory'),
    },
    { field: 'leaderName', minWidth: 120, title: $t('system.dept.leader') },
    { field: 'phone', minWidth: 130, title: $t('system.dept.phone') },
    { field: 'orderNum', title: $t('crud.sort'), width: 100 },
    {
      cellRender: {
        name: 'CellDict',
        props: { dictType: DictType.NORMAL_DISABLE },
      },
      field: 'status',
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
      width: 200,
    },
  ];
}

/** 新增、编辑表单：两列 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'TreeSelect',
      // 部门树在抽屉打开时加载
      componentProps: {
        fieldNames: {
          children: 'children',
          label: 'deptName',
          value: 'deptId',
        },
        placeholder: $t('crud.selectPlaceholder'),
        showSearch: true,
        treeData: [],
        treeDefaultExpandAll: true,
        treeNodeFilterProp: 'deptName',
      },
      dependencies: {
        // 根部门没有上级
        resolve: ({ values }) => ({ if: !isRootDept(values.parentId) }),
        triggerFields: ['parentId'],
      },
      fieldName: 'parentId',
      formItemClass: 'md:col-span-2',
      label: $t('system.dept.parent'),
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 30,
        placeholder: $t('system.dept.deptNamePlaceholder'),
      },
      fieldName: 'deptName',
      label: $t('system.dept.deptName'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 100,
        placeholder: $t('system.dept.deptCategoryPlaceholder'),
      },
      fieldName: 'deptCategory',
      label: $t('system.dept.deptCategory'),
    },
    {
      component: 'Select',
      // 负责人在抽屉打开时从本部门的用户中加载；清空后保存即取消负责人
      componentProps: {
        allowClear: true,
        optionFilterProp: 'label',
        options: [],
        placeholder: $t('crud.selectPlaceholder'),
        showSearch: true,
      },
      fieldName: 'leader',
      label: $t('system.dept.leader'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0 },
      defaultValue: 0,
      fieldName: 'orderNum',
      label: $t('crud.sort'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 11,
        placeholder: $t('system.dept.phonePlaceholder'),
      },
      fieldName: 'phone',
      label: $t('system.dept.phone'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 50,
        placeholder: $t('system.dept.emailPlaceholder'),
      },
      fieldName: 'email',
      label: $t('system.dept.email'),
      rules: z
        .string()
        .refine((value) => value === '' || EMAIL_PATTERN.test(value), {
          message: $t('system.dept.emailInvalid'),
        })
        .nullish(),
    },
    {
      component: 'RadioGroup',
      // 选项在抽屉打开时从字典加载
      componentProps: { options: [] },
      defaultValue: STATUS_NORMAL,
      description: $t('system.dept.statusHelp'),
      fieldName: 'status',
      formItemClass: 'md:col-span-2',
      label: $t('crud.status'),
    },
  ];
}
