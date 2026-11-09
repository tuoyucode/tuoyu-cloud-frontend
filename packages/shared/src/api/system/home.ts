import { requestClient } from '../request';

export namespace HomeApi {
  /** 今日统计 */
  export interface DailyStats {
    /** 失败数（登录失败 / 操作异常） */
    failures: number;
    /** 记录总数。登录日志中包含登录、退出、注册的记录 */
    total: number;
  }

  /** 最近的一条操作 */
  export interface RecentOperation {
    businessType: number;
    costTime: number;
    operId: string;
    operIp: string;
    operName: string;
    operTime: string;
    /** 0 正常，1 异常 */
    status: number;
    title: string;
  }

  /** 首页概况（HomeOverviewVo）。没有权限的部分为空 */
  export interface Overview {
    deploymentMode: 'microservice' | 'monolith';
    loginStats: DailyStats | null;
    onlineUsers: null | number;
    operationStats: DailyStats | null;
    profile: string;
    recentOperations: null | RecentOperation[];
    security: null | {
      checkedAt: string;
      production: boolean;
      productionProblems: number;
    };
    services: null | { instances: number; name: string }[];
    tenantEnabled: boolean;
    version: null | string;
  }
}

export function getHomeOverview() {
  return requestClient.get<HomeApi.Overview>('/system/home/overview');
}
