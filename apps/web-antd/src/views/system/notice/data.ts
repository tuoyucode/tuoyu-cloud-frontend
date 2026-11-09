import type { NoticeApi } from '@tuoyu/shared/api/system/notice';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';

import { $t } from '#/locales';

/** 查询条件：一行最多 4 个 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'noticeTitle',
      label: $t('system.notice.noticeTitle'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: () => getDictOptions(DictType.NOTICE_TYPE),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'noticeType',
      label: $t('system.notice.noticeType'),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('system.notice.createByNamePlaceholder'),
      },
      fieldName: 'createByName',
      label: $t('system.notice.createByName'),
    },
  ];
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<NoticeApi.Notice>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'noticeTitle',
      minWidth: 240,
      showOverflow: 'tooltip',
      title: $t('system.notice.noticeTitle'),
    },
    {
      cellRender: {
        name: 'CellDict',
        props: { dictType: DictType.NOTICE_TYPE },
      },
      field: 'noticeType',
      title: $t('system.notice.noticeType'),
      width: 100,
    },
    {
      field: 'status',
      slots: { default: 'status' },
      title: $t('system.notice.status'),
      width: 100,
    },
    {
      field: 'createByName',
      minWidth: 120,
      title: $t('system.notice.createByName'),
    },
    { field: 'createTime', title: $t('system.notice.createTime'), width: 170 },
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

/** 新增、编辑表单：两列，标题、内容与备注占整行 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        maxlength: 50,
        placeholder: $t('system.notice.noticeTitlePlaceholder'),
        showCount: true,
      },
      fieldName: 'noticeTitle',
      formItemClass: 'md:col-span-2',
      label: $t('system.notice.noticeTitle'),
      rules: 'required',
    },
    {
      component: 'RadioGroup',
      // 选项在抽屉打开时从字典加载
      componentProps: { options: [] },
      defaultValue: '1',
      fieldName: 'noticeType',
      label: $t('system.notice.noticeType'),
      rules: 'selectRequired',
    },
    {
      component: 'RadioGroup',
      componentProps: { options: [] },
      defaultValue: '0',
      fieldName: 'status',
      label: $t('system.notice.status'),
    },
    {
      component: 'Textarea',
      componentProps: {
        placeholder: $t('system.notice.noticeContentPlaceholder'),
        rows: 10,
      },
      fieldName: 'noticeContent',
      formItemClass: 'md:col-span-2',
      label: $t('system.notice.noticeContent'),
    },
    {
      component: 'Textarea',
      componentProps: {
        maxlength: 500,
        placeholder: $t('crud.remarkPlaceholder'),
        rows: 2,
      },
      fieldName: 'remark',
      formItemClass: 'md:col-span-2',
      label: $t('crud.remark'),
    },
  ];
}

/** 加载表单中依赖字典的选项 */
export async function loadFormOptions() {
  const [noticeType, status] = await Promise.all([
    getDictOptions(DictType.NOTICE_TYPE),
    getDictOptions(DictType.NOTICE_STATUS),
  ]);
  return { noticeType, status };
}
