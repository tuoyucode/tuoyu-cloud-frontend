import type { PageQuery, PageResult } from '#/api/types';

import { postEncrypted, requestClient } from '#/api/request';

export namespace TenantApi {
  /** 租户（SysTenantVo） */
  export interface Tenant {
    /** 用户数上限；为空表示不限 */
    accountCount?: null | number;
    contactPhone?: string;
    contactUser?: string;
    createTime?: string;
    /** 绑定的访问域名；登录页按它识别租户 */
    domain?: string;
    /** 过期时间（yyyy-MM-dd HH:mm:ss）；为空表示不过期 */
    expireTime?: null | string;
    /** 租户套餐；默认租户不属于任何套餐 */
    packageId?: null | number | string;
    remark?: string;
    /** 0 正常，1 停用（字典 sys_normal_disable） */
    status: string;
    /** 租户编码：小写字母、数字、连字符，创建后不能修改 */
    tenantId: string;
    tenantName: string;
  }

  /** 查询条件（SysTenantBo） */
  export interface Query extends PageQuery {
    contactUser?: string;
    status?: string;
    tenantId?: string;
    tenantName?: string;
  }

  /** 修改的参数（SysTenantBo） */
  export type Form = Omit<Tenant, 'createTime'>;

  /** 新增的参数：同时创建租户管理员（口令加密传输） */
  export type CreateForm = Form & {
    adminPassword: string;
    adminUserName: string;
  };

  /** 当前所在的租户（GET /system/tenant/dynamic） */
  export interface CurrentTenant {
    /** 是否开启多租户 */
    enabled: boolean;
    tenantId: null | string;
    /** 超级管理员是否切换进入了其他租户 */
    switched: boolean;
  }
}

/** 默认租户（平台）：不能停用、删除 */
export const DEFAULT_TENANT_ID = 'default';

/** 租户编码规则，与后端 SysTenantBo 一致 */
export const TENANT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,19}$/;

export function isDefaultTenant(tenantId?: null | string) {
  return tenantId === DEFAULT_TENANT_ID;
}

const BASE = '/system/tenant';

export function listTenant(query: TenantApi.Query) {
  return requestClient.get<PageResult<TenantApi.Tenant>>(`${BASE}/list`, {
    params: query,
  });
}

export function getTenant(tenantId: string) {
  return requestClient.get<TenantApi.Tenant>(`${BASE}/${tenantId}`);
}

/** 新增租户：请求中带管理员口令，后端要求加密传输（@ApiEncrypt） */
export function addTenant(data: TenantApi.CreateForm) {
  return postEncrypted<null>(BASE, data);
}

export function updateTenant(data: TenantApi.Form) {
  return requestClient.put<null>(BASE, data);
}

export function changeTenantStatus(tenantId: string, status: string) {
  return requestClient.put<null>(`${BASE}/changeStatus`, { status, tenantId });
}

export function removeTenant(tenantIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${tenantIds.join(',')}`);
}

/** 当前所在的租户；关闭多租户时 enabled 为 false */
export function getCurrentTenant() {
  return requestClient.get<TenantApi.CurrentTenant>(`${BASE}/dynamic`);
}

/** 超级管理员切换进入某个租户 */
export function switchTenant(tenantId: string) {
  return requestClient.get<null>(
    `${BASE}/dynamic/${encodeURIComponent(tenantId)}`,
  );
}

/** 超级管理员退出切换，回到所属租户 */
export function clearTenantSwitch() {
  return requestClient.get<null>(`${BASE}/dynamic/clear`);
}
