import type { PageQuery, PageResult } from '../types';

import { exportExcel, requestClient } from '../request';
import { MES_BASE } from './common';

export namespace TeamApi {
  /** 班组（MesTeamVo） */
  export interface Team {
    createTime?: string;
    /** 所属工厂：由车间带出 */
    factoryId?: string;
    factoryName?: string;
    leaderUserId?: string;
    /** 班组长昵称 */
    leaderUserName?: string;
    /** 成员人数（列表中返回） */
    memberCount?: number;
    remark?: string;
    sortNo: number;
    /** 0 正常，1 停用 */
    status: string;
    teamCode: string;
    teamId: string;
    teamName: string;
    workshopId: string;
    workshopName?: string;
  }

  /** 查询条件（MesTeamBo） */
  export interface Query extends PageQuery {
    factoryId?: string;
    status?: string;
    teamCode?: string;
    teamName?: string;
    workshopId?: string;
  }

  /** 新增、修改的参数（MesTeamBo）：leaderUserId 为空表示没有班组长 */
  export type Form = Omit<
    Team,
    | 'createTime'
    | 'factoryName'
    | 'leaderUserName'
    | 'memberCount'
    | 'teamId'
    | 'workshopName'
  > & {
    teamId?: string;
  };

  /** 班组成员（MesTeamMemberVo） */
  export interface Member {
    nickname?: string;
    userId: string;
  }
}

const BASE = `${MES_BASE}/team`;

export function listTeam(query: TeamApi.Query) {
  return requestClient.get<PageResult<TeamApi.Team>>(`${BASE}/list`, {
    params: query,
  });
}

export function getTeam(teamId: string) {
  return requestClient.get<TeamApi.Team>(`${BASE}/${teamId}`);
}

export function addTeam(data: TeamApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function updateTeam(data: TeamApi.Form) {
  return requestClient.put<null>(BASE, data);
}

export function removeTeam(teamIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${teamIds.join(',')}`);
}

export function exportTeam(query: TeamApi.Query, fileName: string) {
  return exportExcel(`${BASE}/export`, { ...query }, fileName);
}

export function listTeamMembers(teamId: string) {
  return requestClient.get<TeamApi.Member[]>(`${BASE}/${teamId}/members`);
}

/** 整体覆盖班组成员：空数组表示清空 */
export function updateTeamMembers(teamId: string, userIds: string[]) {
  return requestClient.put<null>(`${BASE}/${teamId}/members`, { userIds });
}
