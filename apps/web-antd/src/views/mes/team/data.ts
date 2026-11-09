import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { TeamApi } from '#/api/mes/team';

import { markRaw } from 'vue';

import { getMesOptions, toSelectOptions } from '#/api/mes/common';
import { DictType, getDictOptions } from '#/api/system/dict';
import { $t } from '#/locales';

import UserSelect from './user-select.vue';

/** 启用的车间（下拉选项） */
async function workshopOptions() {
  return toSelectOptions(await getMesOptions('workshop'));
}

/** 查询条件：一行最多 4 个 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: workshopOptions,
        optionFilterProp: 'label',
        placeholder: $t('crud.selectPlaceholder'),
        showSearch: true,
      },
      fieldName: 'workshopId',
      label: $t('mes.team.workshop'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'teamCode',
      label: $t('mes.team.teamCode'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'teamName',
      label: $t('mes.team.teamName'),
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
export function useColumns(): VxeTableGridOptions<TeamApi.Team>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'teamCode',
      minWidth: 120,
      sortable: true,
      title: $t('mes.team.teamCode'),
    },
    { field: 'teamName', minWidth: 140, title: $t('mes.team.teamName') },
    {
      field: 'workshopName',
      minWidth: 140,
      title: $t('mes.team.workshop'),
    },
    {
      field: 'leaderUserName',
      minWidth: 100,
      title: $t('mes.team.leader'),
    },
    {
      field: 'memberCount',
      title: $t('mes.team.memberCount'),
      width: 100,
    },
    { field: 'sortNo', title: $t('crud.sort'), width: 100 },
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
      width: 200,
    },
  ];
}

/** 新增、编辑表单：两列，备注占整行；所属工厂由车间带出 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: {
        api: workshopOptions,
        class: 'w-full',
        optionFilterProp: 'label',
        placeholder: $t('crud.selectPlaceholder'),
        showSearch: true,
      },
      fieldName: 'workshopId',
      formItemClass: 'md:col-span-2',
      label: $t('mes.team.workshop'),
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        placeholder: $t('mes.team.teamCodePlaceholder'),
      },
      fieldName: 'teamCode',
      label: $t('mes.team.teamCode'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 128,
        placeholder: $t('mes.team.teamNamePlaceholder'),
      },
      fieldName: 'teamName',
      label: $t('mes.team.teamName'),
      rules: 'required',
    },
    {
      component: markRaw(UserSelect),
      // 编辑时由抽屉传入班组长昵称（initialLabel）
      componentProps: {},
      fieldName: 'leaderUserId',
      help: $t('mes.team.leaderHelp'),
      label: $t('mes.team.leader'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0 },
      defaultValue: 0,
      fieldName: 'sortNo',
      label: $t('crud.sort'),
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
