import type { MenuApi } from '../../../api/system/menu';

import { describe, expect, it, vi } from 'vitest';

import {
  isIconifyName,
  isJsonObject,
  MenuType,
  ROOT_PARENT_ID,
  toMenuForm,
  toMenuParentTree,
} from '../menu';

vi.mock('@vben/locales', () => ({ $t: (key: string) => key }));

function menu(
  menuId: string,
  parentId: number | string,
  menuType: MenuApi.MenuType,
): MenuApi.Menu {
  return {
    menuId,
    menuName: `菜单${menuId}`,
    menuType,
    orderNum: 0,
    parentId,
    status: '0',
    visible: '0',
  };
}

describe('菜单管理：上级菜单', () => {
  const menus = [
    menu('1', ROOT_PARENT_ID, MenuType.DIR),
    menu('11', '1', MenuType.MENU),
    menu('111', '11', MenuType.BUTTON),
    menu('12', '1', MenuType.DIR),
    menu('121', '12', MenuType.MENU),
  ];

  it('最上面是“顶级”，按钮不能作为上级', () => {
    const [root] = toMenuParentTree(menus);
    expect(root?.menuId).toBe(ROOT_PARENT_ID);
    expect(root?.menuName).toBe('system.menu.root');
    const [dir] = root?.children ?? [];
    expect(dir?.children?.map((node) => node.menuId)).toEqual(['11', '12']);
    expect(dir?.children?.[0]?.children).toBeUndefined();
  });

  it('编辑时排除本菜单及其下级', () => {
    const [root] = toMenuParentTree(menus, '12');
    const [dir] = root?.children ?? [];
    expect(root?.children).toHaveLength(1);
    expect(dir?.children?.map((node) => node.menuId)).toEqual(['11']);
  });
});

describe('菜单管理：提交数据', () => {
  const values = {
    activeMenu: '/system/user',
    component: 'system/user/index',
    icon: 'lucide:user',
    menuName: '用户',
    orderNum: 1,
    parentId: '1',
    path: 'user',
    perms: 'system:user:list',
    queryParam: '{"a":1}',
    status: '0',
  } as MenuApi.Form;

  it('目录不提交页面、路由参数与权限标识', () => {
    expect(toMenuForm({ ...values, menuType: MenuType.DIR })).toMatchObject({
      activeMenu: '',
      component: '',
      isCache: 'Y',
      isFrame: 'N',
      perms: '',
      queryParam: '',
      visible: '0',
    });
  });

  it('按钮只保留权限标识', () => {
    expect(
      toMenuForm({ ...values, menuType: MenuType.BUTTON, visible: '1' }),
    ).toMatchObject({
      component: '',
      icon: '',
      path: '',
      perms: 'system:user:list',
      visible: '0',
    });
  });

  it('菜单的字段原样提交', () => {
    expect(
      toMenuForm({ ...values, isCache: 'N', menuType: MenuType.MENU }),
    ).toMatchObject({ ...values, isCache: 'N' });
  });
});

describe('菜单管理：格式校验', () => {
  it('图标只接受 Iconify 名称', () => {
    expect(isIconifyName('lucide:user')).toBe(true);
    expect(isIconifyName('user')).toBe(false);
    expect(isIconifyName(null)).toBe(false);
  });

  it('路由参数必须是 JSON 对象', () => {
    expect(isJsonObject('{"id":1}')).toBe(true);
    expect(isJsonObject('[1]')).toBe(false);
    expect(isJsonObject('id=1')).toBe(false);
  });
});
