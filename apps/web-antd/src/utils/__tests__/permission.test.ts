import { useAccessStore, useUserStore } from '@vben/stores';

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  hasPermission,
  hasRole,
  hasSuperAdminPermission,
  SUPER_ADMIN_ROLE,
} from '../permission';

function login(roles: string[], codes: string[]) {
  useUserStore().setUserRoles(roles);
  useAccessStore().setAccessCodes(codes);
}

describe('permission', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('超级管理员的 *:*:* 拥有全部权限码', () => {
    login([SUPER_ADMIN_ROLE], ['*:*:*']);
    expect(hasPermission('system:menu:add')).toBe(true);
  });

  it('按角色标识判断', () => {
    login(['common'], ['system:menu:add']);
    expect(hasRole(SUPER_ADMIN_ROLE)).toBe(false);
    expect(hasRole('common', SUPER_ADMIN_ROLE)).toBe(true);
  });

  it('只限超级管理员的操作：同时需要角色与权限码', () => {
    login(['common'], ['system:menu:add']);
    expect(hasSuperAdminPermission('system:menu:add')).toBe(false);

    login([SUPER_ADMIN_ROLE], ['*:*:*']);
    expect(hasSuperAdminPermission('system:menu:add')).toBe(true);
  });
});
