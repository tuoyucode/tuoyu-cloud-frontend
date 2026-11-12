import { listTenantPackageOptions } from '../../api/system/tenantPackage';

/** 管理员账号、口令长度，与后端 SysTenantBo 一致 */
export const ADMIN_USER_NAME_MIN = 2;
export const ADMIN_USER_NAME_MAX = 30;
export const ADMIN_PASSWORD_MIN = 8;
export const ADMIN_PASSWORD_MAX = 64;

/** 套餐选项（只含启用的套餐）：value 统一为字符串（后端 Long 型 ID） */
export async function loadPackageOptions() {
  const packages = await listTenantPackageOptions();
  return packages.map((item) => ({
    label: item.packageName,
    value: String(item.packageId),
  }));
}
