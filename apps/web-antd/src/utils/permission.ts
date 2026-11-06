import { useAccessStore, useUserStore } from '@vben/stores';

/** 超级管理员的权限码，表示拥有全部权限 */
const ALL_PERMISSIONS = '*:*:*';

/** 超级管理员的角色标识（与后端 SystemConstants.SUPER_ADMIN_ROLE_KEY 一致） */
export const SUPER_ADMIN_ROLE = 'superadmin';

/**
 * 当前用户是否拥有任一权限码（与后端 @SaCheckPermission 的权限码一致，例如 system:post:add）
 */
export function hasPermission(...codes: string[]): boolean {
  const owned = useAccessStore().accessCodes;
  return (
    owned.includes(ALL_PERMISSIONS) ||
    codes.some((code) => owned.includes(code))
  );
}

/**
 * 当前用户是否拥有任一角色（与后端 @SaCheckRole 的角色标识一致）
 */
export function hasRole(...roles: string[]): boolean {
  const owned = useUserStore().userRoles;
  return roles.some((role) => owned.includes(role));
}

/**
 * 只有超级管理员才能执行的操作：后端同时要求 @SaCheckRole(superadmin) 与权限码（例如菜单的增删改）
 */
export function hasSuperAdminPermission(...codes: string[]): boolean {
  return hasRole(SUPER_ADMIN_ROLE) && hasPermission(...codes);
}
