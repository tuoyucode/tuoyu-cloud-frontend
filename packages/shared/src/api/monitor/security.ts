import { requestClient } from '../request';

export namespace SecurityApi {
  /** 检查结果 */
  export type CheckStatus = 'FAILED' | 'NOT_APPLICABLE' | 'PASSED' | 'SKIPPED';

  /** 一项启动自检：各服务中最需要关注的结果（未通过 > 已跳过 > 通过 > 不适用） */
  export interface Check {
    /** 未通过时的处理办法 */
    action: null | string;
    /** 未通过时的具体条目（配置项名等，不含敏感值） */
    details: string[];
    /** 检查编号：C1、C2、P1 ~ P9 */
    id: string;
    /** RUNTIME：任何环境都检查；PRODUCTION：生产环境检查 */
    scope: 'PRODUCTION' | 'RUNTIME';
    /** 得出该结果的服务 */
    services: string[];
    status: CheckStatus;
    title: string;
  }

  /** 参与汇总的服务 */
  export interface Source {
    /** 该服务最近一次启动时的自检时间 */
    checkedAt: string;
    production: boolean;
    service: string;
  }

  /** 运行时防护配置 */
  export interface Protections {
    apiCrypto: {
      algorithm: null | string;
      enabled: boolean;
      keySize: null | number;
      kid: null | string;
      requireHttps: boolean | null;
      rotating: boolean;
    };
    /** Excel 导出行数上限 */
    excelMaxExportRows: number;
    /** Excel 导入行数上限 */
    excelMaxImportRows: number;
    formMaxSize: string;
    maxThreads: number;
    pageMaxSize: number;
    redisAllowlist: { extraPrefixes: string[]; rejected: number };
    requestMaxBodySize: string;
    tenantEnabled: boolean;
    /** 可信代理网段；为空表示不信任任何代理 */
    trustedProxies: string[];
    uploadMaxFileSize: string;
    uploadMaxRequestSize: string;
  }

  /** 安全中心（SecurityOverviewVo）：各服务启动自检的汇总结果 */
  export interface Overview {
    checks: Check[];
    /** 是否有服务按生产模式检查 */
    production: boolean;
    /** 生产检查中未通过的项数（同一项在多个服务中未通过只算一次） */
    productionProblems: number;
    /** tuoyu-system 的运行时防护配置 */
    protections: Protections;
    /** 参与汇总的服务，tuoyu-system 排在第一个；为空表示没有任何自检结果 */
    sources: Source[];
  }
}

export function getSecurityOverview() {
  return requestClient.get<SecurityApi.Overview>('/monitor/security/overview');
}
