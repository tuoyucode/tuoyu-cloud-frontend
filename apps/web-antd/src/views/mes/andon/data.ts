import type { AndonApi } from '@tuoyu/shared/api/mes/andon';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getMesOptions, toSelectOptions } from '@tuoyu/shared/api/mes/common';
import { listUserOptions } from '@tuoyu/shared/api/system/user';

import { $t } from '#/locales';

import { enumOptions } from '../_shared/enums';

/** 对话框中的动作：派单（改派）、解决、关闭 */
export type AndonAction = 'assign' | 'close' | 'resolve';

/** 关联工单时可选的工单状态 */
const WORKORDER_STATUSES = 'released,in_progress,paused';

/** 派单时一次加载的用户数（下拉中按姓名、账号筛选） */
const USER_OPTION_LIMIT = 500;

/** 查询条件：一行 4 个，其余折叠 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'eventCode',
      label: $t('mes.andon.eventCode'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: enumOptions('AndonStatus'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'eventStatus',
      label: $t('crud.status'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: enumOptions('AndonType'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'eventType',
      label: $t('mes.andon.eventType'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: enumOptions('AndonLevel'),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'eventLevel',
      label: $t('mes.andon.eventLevel'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: async () => toSelectOptions(await getMesOptions('workshop')),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'workshopId',
      label: $t('mes.andon.workshop'),
    },
    {
      component: 'RangePicker',
      componentProps: { class: 'w-full', valueFormat: 'YYYY-MM-DD' },
      fieldName: 'reportTime',
      label: $t('mes.andon.reportTime'),
    },
    {
      component: 'Switch',
      defaultValue: false,
      fieldName: 'mine',
      label: $t('mes.andon.mine'),
    },
  ];
}

/** 把查询表单的值转换为后端的查询条件：上报时间范围转为 params.beginTime / endTime */
export function toQuery(values: Record<string, any>): AndonApi.Query {
  const { mine, reportTime, ...rest } = values;
  const query: AndonApi.Query = { ...rest };
  if (mine) {
    query.mine = true;
  }
  if (Array.isArray(reportTime) && reportTime.length === 2) {
    query.params = {
      beginTime: `${reportTime[0]} 00:00:00`,
      endTime: `${reportTime[1]} 23:59:59`,
    };
  }
  return query;
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<AndonApi.Event>['columns'] {
  return [
    {
      field: 'eventCode',
      minWidth: 150,
      sortable: true,
      title: $t('mes.andon.eventCode'),
    },
    {
      field: 'eventLevel',
      slots: { default: 'eventLevel' },
      title: $t('mes.andon.eventLevel'),
      width: 90,
    },
    {
      field: 'eventType',
      slots: { default: 'eventType' },
      title: $t('mes.andon.eventType'),
      width: 90,
    },
    { field: 'title', minWidth: 180, title: $t('mes.andon.title') },
    {
      field: 'location',
      formatter: ({ row }) =>
        [row.workshopName, row.lineName, row.stationName]
          .filter(Boolean)
          .join(' / '),
      minWidth: 180,
      title: $t('mes.andon.location'),
    },
    {
      field: 'eventStatus',
      slots: { default: 'eventStatus' },
      title: $t('crud.status'),
      width: 100,
    },
    {
      field: 'reportUserName',
      minWidth: 100,
      title: $t('mes.andon.reportUser'),
    },
    {
      field: 'reportTime',
      sortable: true,
      title: $t('mes.andon.reportTime'),
      width: 170,
    },
    {
      field: 'handlerUserName',
      minWidth: 100,
      title: $t('mes.andon.handler'),
    },
    {
      field: 'durationMinutes',
      formatter: ({ cellValue }) => formatMinutes(cellValue),
      title: $t('mes.andon.duration'),
      width: 120,
    },
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

/** 分钟数显示为“X 小时 Y 分”；为空时显示 - */
export function formatMinutes(value?: null | number) {
  if (value === undefined || value === null) {
    return '-';
  }
  const minutes = Math.max(0, Math.floor(value));
  if (minutes < 60) {
    return $t('mes.andon.minutes', { m: minutes });
  }
  return $t('mes.andon.hoursMinutes', {
    h: Math.floor(minutes / 60),
    m: minutes % 60,
  });
}

/** 上报表单：两列，标题、描述占整行；产线、工位、设备随车间（产线）联动 */
export function useReportSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: { options: enumOptions('AndonType') },
      fieldName: 'eventType',
      label: $t('mes.andon.eventType'),
      rules: 'selectRequired',
    },
    {
      component: 'Select',
      componentProps: { options: enumOptions('AndonLevel') },
      defaultValue: 'normal',
      fieldName: 'eventLevel',
      help: $t('mes.andon.eventLevelHelp'),
      label: $t('mes.andon.eventLevel'),
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 128,
        placeholder: $t('mes.andon.titlePlaceholder'),
      },
      fieldName: 'title',
      formItemClass: 'md:col-span-2',
      label: $t('mes.andon.title'),
      rules: 'required',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: async () => toSelectOptions(await getMesOptions('workshop')),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'workshopId',
      label: $t('mes.andon.workshop'),
      rules: 'selectRequired',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: async (params: Record<string, string | undefined>) =>
          params.workshopId
            ? toSelectOptions(await getMesOptions('line', params))
            : [],
        placeholder: $t('crud.selectPlaceholder'),
      },
      dependencies: {
        componentProps: (values) => ({
          disabled: !values.workshopId,
          params: { workshopId: values.workshopId },
        }),
        triggerFields: ['workshopId'],
      },
      fieldName: 'lineId',
      label: $t('mes.andon.line'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: async (params: Record<string, string | undefined>) =>
          params.lineId
            ? toSelectOptions(await getMesOptions('station', params))
            : [],
        placeholder: $t('mes.andon.stationPlaceholder'),
      },
      dependencies: {
        componentProps: (values) => ({
          disabled: !values.lineId,
          params: { lineId: values.lineId },
        }),
        triggerFields: ['lineId'],
      },
      fieldName: 'stationId',
      label: $t('mes.andon.station'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: async (params: Record<string, string | undefined>) =>
          params.workshopId
            ? toSelectOptions(await getMesOptions('device', params))
            : [],
        placeholder: $t('crud.selectPlaceholder'),
      },
      dependencies: {
        componentProps: (values) => ({
          disabled: !values.workshopId,
          params: { workshopId: values.workshopId },
        }),
        triggerFields: ['workshopId'],
      },
      fieldName: 'deviceId',
      label: $t('mes.andon.device'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: async () =>
          toSelectOptions(
            await getMesOptions('workorder', { statuses: WORKORDER_STATUSES }),
          ),
        optionFilterProp: 'label',
        placeholder: $t('crud.selectPlaceholder'),
        showSearch: true,
      },
      fieldName: 'workorderId',
      label: $t('mes.andon.workorder'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: async () =>
          toSelectOptions(await getMesOptions('downtime-reason')),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'downtimeReasonId',
      label: $t('mes.andon.downtimeReason'),
    },
    {
      component: 'Textarea',
      componentProps: {
        maxlength: 500,
        placeholder: $t('mes.andon.contentPlaceholder'),
        rows: 3,
      },
      fieldName: 'content',
      formItemClass: 'md:col-span-2',
      label: $t('mes.andon.content'),
    },
  ];
}

/** 派单表单：选择处理人 */
export function useAssignSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: {
        api: async () => {
          const page = await listUserOptions({
            page: 1,
            pageSize: USER_OPTION_LIMIT,
          });
          return page.items.map((user) => ({
            label: `${user.nickName}（${user.userName}）`,
            value: user.userId,
          }));
        },
        optionFilterProp: 'label',
        placeholder: $t('mes.andon.handlerPlaceholder'),
        showSearch: true,
      },
      fieldName: 'handlerUserId',
      label: $t('mes.andon.handler'),
      rules: 'selectRequired',
    },
  ];
}

/** 解决表单：处理说明必填，停机原因可选 */
export function useResolveSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Textarea',
      componentProps: {
        maxlength: 500,
        placeholder: $t('mes.andon.resolveRemarkPlaceholder'),
        rows: 3,
      },
      fieldName: 'resolveRemark',
      label: $t('mes.andon.resolveRemark'),
      rules: 'required',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: async () =>
          toSelectOptions(await getMesOptions('downtime-reason')),
        placeholder: $t('mes.andon.downtimeReasonPlaceholder'),
      },
      fieldName: 'downtimeReasonId',
      help: $t('mes.andon.downtimeHelp'),
      label: $t('mes.andon.downtimeReason'),
    },
  ];
}

/** 关闭表单：未处理的事件直接关闭（误报）时原因必填 */
export function useCloseSchema(reasonRequired: boolean): VbenFormSchema[] {
  return [
    {
      component: 'Textarea',
      componentProps: {
        maxlength: 500,
        placeholder: reasonRequired
          ? $t('mes.andon.closeReasonRequiredPlaceholder')
          : $t('mes.andon.closeReasonPlaceholder'),
        rows: 3,
      },
      fieldName: 'reason',
      label: $t('mes.andon.closeReason'),
      rules: reasonRequired ? 'required' : undefined,
    },
  ];
}
