import type { PageQuery, PageResult } from '../types';

import { requestClient } from '../request';

export namespace TenantPackageApi {
  /** 租户套餐（SysTenantPackageVo） */
  export interface TenantPackage {
    createTime?: string;
    /** 套餐中的菜单（含目录与按钮），只有详情接口返回 */
    menuIds?: (number | string)[];
    packageId: string;
    packageName: string;
    remark?: string;
    /** 0 正常，1 停用（字典 sys_normal_disable） */
    status: string;
  }

  /** 查询条件（SysTenantPackageBo） */
  export interface Query extends PageQuery {
    packageName?: string;
    status?: string;
  }

  /** 新增、修改的参数（SysTenantPackageBo）。menuIds 必须提交，空数组表示没有菜单 */
  export type Form = Omit<
    TenantPackage,
    'createTime' | 'menuIds' | 'packageId'
  > & {
    menuIds: string[];
    packageId?: string;
  };
}

const BASE = '/system/tenant/package';

export function listTenantPackage(query: TenantPackageApi.Query) {
  return requestClient.get<PageResult<TenantPackageApi.TenantPackage>>(
    `${BASE}/list`,
    { params: query },
  );
}

/** 启用的套餐（新增、修改租户时选择） */
export function listTenantPackageOptions() {
  return requestClient.get<TenantPackageApi.TenantPackage[]>(
    `${BASE}/optionselect`,
  );
}

export function getTenantPackage(packageId: string) {
  return requestClient.get<TenantPackageApi.TenantPackage>(
    `${BASE}/${packageId}`,
  );
}

export function addTenantPackage(data: TenantPackageApi.Form) {
  return requestClient.post<null>(BASE, data);
}

/** 修改套餐：使用该套餐的租户，管理员角色的菜单随之同步 */
export function updateTenantPackage(data: TenantPackageApi.Form) {
  return requestClient.put<null>(BASE, data);
}

/** 删除套餐。仍有租户使用时，后端拒绝并返回原因 */
export function removeTenantPackage(packageIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${packageIds.join(',')}`);
}
