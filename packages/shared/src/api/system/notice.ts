import type { PageQuery, PageResult } from '../types';

import { requestClient } from '../request';

export namespace NoticeApi {
  /** 通知公告（SysNoticeVo） */
  export interface Notice {
    createBy?: string;
    /** 发布人姓名 */
    createByName?: string;
    createTime?: string;
    noticeContent?: string;
    noticeId: string;
    noticeTitle: string;
    /** 1 通知，2 公告（字典 sys_notice_type） */
    noticeType: string;
    remark?: string;
    /** 0 正常，1 关闭（字典 sys_notice_status） */
    status: string;
  }

  /** 查询条件（SysNoticeBo） */
  export interface Query extends PageQuery {
    /** 发布人账号（精确匹配） */
    createByName?: string;
    noticeTitle?: string;
    noticeType?: string;
  }

  /** 新增、修改的参数（SysNoticeBo） */
  export type Form = Pick<
    Notice,
    'noticeContent' | 'noticeTitle' | 'noticeType' | 'remark' | 'status'
  > & {
    noticeId?: string;
  };
}

const BASE = '/system/notice';

export function listNotice(query: NoticeApi.Query) {
  return requestClient.get<PageResult<NoticeApi.Notice>>(`${BASE}/list`, {
    params: query,
  });
}

export function getNotice(noticeId: string) {
  return requestClient.get<NoticeApi.Notice>(`${BASE}/${noticeId}`);
}

/** 新增后后端会向所有在线用户推送这条通知 */
export function addNotice(data: NoticeApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function updateNotice(data: NoticeApi.Form) {
  return requestClient.put<null>(BASE, data);
}

export function removeNotice(noticeIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${noticeIds.join(',')}`);
}
