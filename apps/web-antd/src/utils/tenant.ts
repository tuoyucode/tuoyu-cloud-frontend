import type { AuthApi } from '#/api';

/** 记住上次登录选择的租户（只保存租户编码，不是敏感信息） */
const REMEMBERED_TENANT_KEY = 'tuoyu-login-tenant';

/** 登录页租户字段的状态 */
export interface LoginTenantState {
  /** 是否开启多租户；关闭时登录页不显示租户 */
  enabled: boolean;
  /** 访问域名绑定了租户：预先选中并锁定 */
  locked: boolean;
  options: { label: string; value: string }[];
  /** 预先选中的租户；没有时为空 */
  value?: string;
}

/**
 * 根据后端返回的租户计算登录页租户字段：
 * - 关闭多租户：不显示；
 * - 只返回一个租户且它绑定了当前访问域名：选中并锁定；
 * - 否则优先选中上次登录的租户；只有一个可选租户时直接选中
 */
export function resolveLoginTenant(
  result: AuthApi.LoginTenantResult | null | undefined,
  hostname: string,
  remembered?: null | string,
): LoginTenantState {
  if (!result?.enabled) {
    return { enabled: false, locked: false, options: [] };
  }
  const tenants = result.tenants ?? [];
  const options = tenants.map((tenant) => ({
    label: tenant.tenantName,
    value: tenant.tenantId,
  }));
  const [only] = tenants;
  if (
    tenants.length === 1 &&
    only?.domain &&
    only.domain.trim().toLowerCase() === hostname.toLowerCase()
  ) {
    return { enabled: true, locked: true, options, value: only.tenantId };
  }
  let value: string | undefined;
  if (remembered && tenants.some((tenant) => tenant.tenantId === remembered)) {
    value = remembered;
  } else if (tenants.length === 1) {
    value = only?.tenantId;
  }
  return { enabled: true, locked: false, options, value };
}

/** 上次登录选择的租户；浏览器禁止访问存储时为空 */
export function readRememberedTenant(): null | string {
  try {
    return globalThis.localStorage?.getItem(REMEMBERED_TENANT_KEY) ?? null;
  } catch {
    return null;
  }
}

/** 记住本次登录选择的租户；浏览器禁止访问存储时忽略 */
export function rememberTenant(tenantId: string) {
  try {
    globalThis.localStorage?.setItem(REMEMBERED_TENANT_KEY, tenantId);
  } catch {
    // 隐私模式等情况下无法写入，不影响登录
  }
}
