import type { AndonRuleApi } from '@tuoyu/shared/api/mes/andonRule';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';
import { listUserOptions } from '@tuoyu/shared/api/system/user';
import { enumOptions } from '@tuoyu/shared/pages/mes/enums';

import { $t } from '#/locales';

/** 提醒人员下拉中一次加载的用户数（按姓名、账号筛选） */
const USER_OPTION_LIMIT = 500;

/** 时限的上限：7 天（与后端一致） */
export const MAX_MINUTES = 10_080;

/** 一条规则最多提醒的人数（与后端一致） */
export const MAX_NOTIFY_USERS = 20;

/** 查询条件：一行最多 4 个 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'ruleName',
      label: $t('mes.andonRule.ruleName'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: enumOptions('AndonType'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'eventType',
      label: $t('mes.andonRule.eventType'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: enumOptions('AndonLevel'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'eventLevel',
      label: $t('mes.andonRule.eventLevel'),
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
export function useColumns(): VxeTableGridOptions<AndonRuleApi.Rule>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'ruleName',
      minWidth: 160,
      sortable: true,
      title: $t('mes.andonRule.ruleName'),
    },
    {
      field: 'eventType',
      slots: { default: 'eventType' },
      title: $t('mes.andonRule.eventType'),
      width: 110,
    },
    {
      field: 'eventLevel',
      slots: { default: 'eventLevel' },
      title: $t('mes.andonRule.eventLevel'),
      width: 110,
    },
    {
      field: 'responseMinutes',
      formatter: ({ cellValue }) => formatLimit(cellValue),
      title: $t('mes.andonRule.responseMinutes'),
      width: 120,
    },
    {
      field: 'resolveMinutes',
      formatter: ({ cellValue }) => formatLimit(cellValue),
      title: $t('mes.andonRule.resolveMinutes'),
      width: 120,
    },
    {
      field: 'escalateLevel',
      slots: { default: 'escalateLevel' },
      title: $t('mes.andonRule.escalateLevel'),
      width: 120,
    },
    {
      field: 'notifyUserNames',
      minWidth: 160,
      title: $t('mes.andonRule.notifyUsers'),
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

/** 时限显示为“X 分钟”或“X 小时 Y 分”；为空表示不检查 */
export function formatLimit(value?: null | number) {
  if (value === undefined || value === null) {
    return $t('mes.andonRule.noLimit');
  }
  const minutes = Math.max(0, Math.floor(value));
  if (minutes < 60) {
    return $t('mes.andonRule.minutes', { m: minutes });
  }
  return minutes % 60 === 0
    ? $t('mes.andonRule.hours', { h: minutes / 60 })
    : $t('mes.andonRule.hoursMinutes', {
        h: Math.floor(minutes / 60),
        m: minutes % 60,
      });
}

/** 新增、编辑表单：两列，提醒人员与备注占整行 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        placeholder: $t('mes.andonRule.ruleNamePlaceholder'),
      },
      fieldName: 'ruleName',
      formItemClass: 'md:col-span-2',
      label: $t('mes.andonRule.ruleName'),
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        allowClear: true,
        options: enumOptions('AndonType'),
        placeholder: $t('mes.andonRule.allTypes'),
      },
      fieldName: 'eventType',
      label: $t('mes.andonRule.eventType'),
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        allowClear: true,
        options: enumOptions('AndonLevel'),
        placeholder: $t('mes.andonRule.allLevels'),
      },
      fieldName: 'eventLevel',
      help: $t('mes.andonRule.scopeHelp'),
      label: $t('mes.andonRule.eventLevel'),
    },
    {
      component: 'InputNumber',
      componentProps: {
        addonAfter: $t('mes.andonRule.minuteUnit'),
        class: 'w-full',
        max: MAX_MINUTES,
        min: 1,
        placeholder: $t('mes.andonRule.limitPlaceholder'),
        precision: 0,
      },
      fieldName: 'responseMinutes',
      help: $t('mes.andonRule.responseHelp'),
      label: $t('mes.andonRule.responseMinutes'),
    },
    {
      component: 'InputNumber',
      componentProps: {
        addonAfter: $t('mes.andonRule.minuteUnit'),
        class: 'w-full',
        max: MAX_MINUTES,
        min: 1,
        placeholder: $t('mes.andonRule.limitPlaceholder'),
        precision: 0,
      },
      fieldName: 'resolveMinutes',
      help: $t('mes.andonRule.resolveHelp'),
      label: $t('mes.andonRule.resolveMinutes'),
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        allowClear: true,
        options: enumOptions('AndonLevel'),
        placeholder: $t('mes.andonRule.remindOnly'),
      },
      fieldName: 'escalateLevel',
      help: $t('mes.andonRule.escalateHelp'),
      label: $t('mes.andonRule.escalateLevel'),
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
      component: 'ApiSelect',
      componentProps: {
        class: 'w-full',
        api: async () => {
          const page = await listUserOptions({
            page: 1,
            pageSize: USER_OPTION_LIMIT,
          });
          return page.items.map((user) => ({
            label: `${user.nickName}（${user.userName}）`,
            value: String(user.userId),
          }));
        },
        maxCount: MAX_NOTIFY_USERS,
        mode: 'multiple',
        optionFilterProp: 'label',
        placeholder: $t('mes.andonRule.notifyUsersPlaceholder'),
        showSearch: true,
      },
      defaultValue: [],
      fieldName: 'notifyUserIds',
      formItemClass: 'md:col-span-2',
      help: $t('mes.andonRule.notifyHelp'),
      label: $t('mes.andonRule.notifyUsers'),
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

/** 规则转为表单的值：提醒人员由逗号分隔的 ID 转为数组 */
export function toFormValues(rule: AndonRuleApi.Rule): Record<string, unknown> {
  return {
    ...rule,
    notifyUserIds: rule.notifyUsers
      ? rule.notifyUsers.split(',').filter(Boolean)
      : [],
  };
}

/** 表单的值转为接口参数：可以清空的字段为空时发送 null（后端据此清空），提醒人员为空时发送空数组 */
export function toRuleForm(values: Record<string, any>): AndonRuleApi.Form {
  const orNull = <T>(value: '' | null | T | undefined) =>
    value === undefined || value === '' ? null : value;
  return {
    escalateLevel: orNull(values.escalateLevel),
    eventLevel: orNull(values.eventLevel),
    eventType: orNull(values.eventType),
    notifyUserIds: Array.isArray(values.notifyUserIds)
      ? values.notifyUserIds.map(String)
      : [],
    remark: values.remark,
    resolveMinutes: orNull(values.resolveMinutes),
    responseMinutes: orNull(values.responseMinutes),
    ruleName: values.ruleName,
    status: values.status,
  };
}
