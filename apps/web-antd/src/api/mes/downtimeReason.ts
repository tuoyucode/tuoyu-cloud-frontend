import type { PageQuery, PageResult } from '#/api/types';

import { requestClient } from '#/api/request';

import { MES_BASE } from './common';

export namespace DowntimeReasonApi {
  /** 停机原因（MesDowntimeReasonVo） */
  export interface Reason {
    createTime?: string;
    reasonCode: string;
    reasonId: string;
    reasonName: string;
    /** 原因分类（DowntimeReasonType） */
    reasonType: string;
    remark?: string;
    sortNo: number;
    /** 0 正常，1 停用 */
    status: string;
  }

  /** 查询条件（MesDowntimeReasonBo） */
  export interface Query extends PageQuery {
    reasonCode?: string;
    reasonName?: string;
    reasonType?: string;
    status?: string;
  }

  /** 新增、修改的参数（MesDowntimeReasonBo） */
  export type Form = Omit<Reason, 'createTime' | 'reasonId'> & {
    reasonId?: string;
  };
}

const BASE = `${MES_BASE}/downtime-reason`;

export function listDowntimeReason(query: DowntimeReasonApi.Query) {
  return requestClient.get<PageResult<DowntimeReasonApi.Reason>>(
    `${BASE}/list`,
    { params: query },
  );
}

export function getDowntimeReason(reasonId: string) {
  return requestClient.get<DowntimeReasonApi.Reason>(`${BASE}/${reasonId}`);
}

export function addDowntimeReason(data: DowntimeReasonApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function updateDowntimeReason(data: DowntimeReasonApi.Form) {
  return requestClient.put<null>(BASE, data);
}

export function removeDowntimeReason(reasonIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${reasonIds.join(',')}`);
}
