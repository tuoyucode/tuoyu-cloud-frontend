import type { UserApi } from '@tuoyu/shared/api/system/user';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';
import { getUserDeptTree } from '@tuoyu/shared/api/system/user';
import { PASSWORD_MAX, PASSWORD_MIN } from '@tuoyu/shared/pages/system/user';

import { z } from '#/adapter/form';
import { $t } from '#/locales';

export {
  searchFieldMappingTime,
  toUserForm,
} from '@tuoyu/shared/pages/system/user';

/** 查询条件：一行 4 个，创建时间折叠 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'userName',
      label: $t('system.user.userName'),
    },
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'nickName',
      label: $t('system.user.nickName'),
    },
    {
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: $t('crud.inputPlaceholder'),
      },
      fieldName: 'phoneNumber',
      label: $t('system.user.phoneNumber'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: () => getDictOptions(DictType.NORMAL_DISABLE),
        clearable: true,
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'status',
      label: $t('crud.status'),
    },
    {
      component: 'DatePicker',
      componentProps: {
        class: 'w-full',
        type: 'daterange',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: 'createTime',
      label: $t('crud.createTime'),
    },
  ];
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<UserApi.User>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    { field: 'userName', minWidth: 120, title: $t('system.user.userName') },
    { field: 'nickName', minWidth: 120, title: $t('system.user.nickName') },
    { field: 'deptName', minWidth: 120, title: $t('system.user.dept') },
    {
      field: 'phoneNumber',
      minWidth: 120,
      title: $t('system.user.phoneNumber'),
    },
    {
      field: 'status',
      slots: { default: 'status' },
      title: $t('crud.status'),
      width: 90,
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

/** 新增、编辑表单：两列，备注占整行 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('system.user.userNamePlaceholder') },
      fieldName: 'userName',
      label: $t('system.user.userName'),
      rules: z
        .string({ error: $t('system.user.userNameRequired') })
        .trim()
        .min(2, { message: $t('system.user.userNameLength') })
        .max(30, { message: $t('system.user.userNameLength') }),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('system.user.nickNamePlaceholder') },
      fieldName: 'nickName',
      label: $t('system.user.nickName'),
      rules: z
        .string({ error: $t('system.user.nickNameRequired') })
        .trim()
        .min(1, { message: $t('system.user.nickNameRequired') })
        .max(30, { message: $t('system.user.nickNameLength') }),
    },
    {
      component: 'Input',
      componentProps: {
        autocomplete: 'new-password',
        placeholder: $t('system.user.passwordPlaceholder'),
        showPassword: true,
        type: 'password',
      },
      // 只在新增时显示，编辑时由抽屉隐藏
      fieldName: 'password',
      formItemClass: 'md:col-span-2',
      label: $t('system.user.password'),
      rules: z
        .string({ error: $t('system.user.passwordRequired') })
        .min(PASSWORD_MIN, { message: $t('system.user.passwordLength') })
        .max(PASSWORD_MAX, { message: $t('system.user.passwordLength') }),
    },
    {
      component: 'ApiTreeSelect',
      componentProps: {
        api: getUserDeptTree,
        // 任意一级部门都可以选，不只是末级
        checkStrictly: true,
        childrenField: 'children',
        clearable: true,
        defaultExpandAll: true,
        filterable: true,
        labelField: 'label',
        placeholder: $t('crud.selectPlaceholder'),
        valueField: 'id',
      },
      fieldName: 'deptId',
      label: $t('system.user.dept'),
    },
    {
      component: 'Select',
      // 选项随所属部门变化，由抽屉加载
      componentProps: {
        clearable: true,
        filterable: true,
        multiple: true,
        options: [],
        placeholder: $t('system.user.postsPlaceholder'),
      },
      fieldName: 'postIds',
      label: $t('system.user.posts'),
    },
    {
      component: 'Select',
      // 选项由抽屉加载
      componentProps: {
        clearable: true,
        filterable: true,
        multiple: true,
        options: [],
        placeholder: $t('system.user.rolesPlaceholder'),
      },
      fieldName: 'roleIds',
      formItemClass: 'md:col-span-2',
      label: $t('system.user.roles'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('system.user.phonePlaceholder') },
      fieldName: 'phoneNumber',
      label: $t('system.user.phoneNumber'),
      rules: z
        .string()
        .regex(/^\d{0,11}$/, { message: $t('system.user.phoneInvalid') })
        .optional(),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('system.user.emailPlaceholder') },
      fieldName: 'email',
      label: $t('system.user.email'),
      rules: z
        .union([
          z.literal(''),
          z.email({ message: $t('system.user.emailInvalid') }),
        ])
        .optional(),
    },
    {
      component: 'RadioGroup',
      // 选项在抽屉打开时从字典加载
      componentProps: { options: [] },
      fieldName: 'gender',
      label: $t('system.user.gender'),
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
  const [gender, status] = await Promise.all([
    getDictOptions(DictType.USER_GENDER),
    getDictOptions(DictType.NORMAL_DISABLE),
  ]);
  const toOptions = (options: { label: string; value: string }[]) =>
    options.map(({ label, value }) => ({ label, value }));
  return { gender: toOptions(gender), status: toOptions(status) };
}

/** 重置密码表单 */
export function useResetPasswordSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        autocomplete: 'new-password',
        placeholder: $t('system.user.passwordPlaceholder'),
        showPassword: true,
        type: 'password',
      },
      fieldName: 'password',
      label: $t('system.user.newPassword'),
      rules: z
        .string({ error: $t('system.user.passwordRequired') })
        .min(PASSWORD_MIN, { message: $t('system.user.passwordLength') })
        .max(PASSWORD_MAX, { message: $t('system.user.passwordLength') }),
    },
    {
      component: 'Input',
      componentProps: {
        autocomplete: 'new-password',
        placeholder: $t('system.user.confirmPasswordPlaceholder'),
        showPassword: true,
        type: 'password',
      },
      dependencies: {
        rules(values) {
          const { password } = values;
          return z
            .string({ error: $t('system.user.confirmPasswordPlaceholder') })
            .min(1, { message: $t('system.user.confirmPasswordPlaceholder') })
            .refine((value) => value === password, {
              message: $t('system.user.passwordMismatch'),
            });
        },
        triggerFields: ['password'],
      },
      fieldName: 'confirmPassword',
      label: $t('system.user.confirmPassword'),
    },
  ];
}
