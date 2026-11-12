import type { MenuApi } from '../../api/system/menu';

import { $t } from '@vben/locales';

import { listToTree } from '../../utils/tree';

/** 菜单类型 */
export const MenuType = {
  /** 按钮：只有权限标识，不出现在菜单中 */
  BUTTON: 'F',
  /** 目录：包含下级菜单 */
  DIR: 'M',
  /** 菜单：打开一个页面 */
  MENU: 'C',
} as const satisfies Record<string, MenuApi.MenuType>;

/** 顶级菜单的上级 ID */
export const ROOT_PARENT_ID = 0;

/** Iconify 图标名：图标集:图标，例如 lucide:user */
const ICONIFY_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

/** 权限标识的格式，与后端 RegexConstants.PERMISSION_STRING 一致 */
export const PERMISSION_PATTERN = /^[\w]+:[\w*]+:[\w*]+$/;

/** 是否 Iconify 图标名（菜单图标只接受这种格式） */
export function isIconifyName(icon?: null | string): icon is string {
  return !!icon && ICONIFY_PATTERN.test(icon);
}

/** 是否 JSON 对象字符串（路由参数） */
export function isJsonObject(text: string) {
  try {
    const value = JSON.parse(text);
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  } catch {
    return false;
  }
}

/** 菜单类型的选项 */
export function menuTypeOptions() {
  return [
    { label: $t('system.menu.typeDir'), value: MenuType.DIR },
    { label: $t('system.menu.typeMenu'), value: MenuType.MENU },
    { label: $t('system.menu.typeButton'), value: MenuType.BUTTON },
  ];
}

/** 上级菜单可选树的节点 */
export type MenuParentNode = Pick<MenuApi.Menu, 'menuName'> & {
  children?: MenuParentNode[];
  menuId: number | string;
};

/**
 * 上级菜单的可选树：最上面是“顶级”，按钮不能作为上级；编辑时排除本菜单及其下级
 *
 * @param menus 全部菜单
 * @param menuId 正在编辑的菜单；新增时为空
 */
export function toMenuParentTree(
  menus: MenuApi.Menu[],
  menuId?: string,
): MenuParentNode[] {
  const candidates = menus.filter(
    (menu) => menu.menuType !== MenuType.BUTTON && menu.menuId !== menuId,
  );
  // 本菜单被排除后，它的下级找不到上级，会成为根节点，这里一并去掉
  const ids = new Set(candidates.map((menu) => String(menu.menuId)));
  const tree = listToTree(candidates, 'menuId', 'parentId').filter(
    (node) =>
      String(node.parentId) === String(ROOT_PARENT_ID) ||
      ids.has(String(node.parentId)),
  );
  return [
    {
      children: tree,
      menuId: ROOT_PARENT_ID,
      menuName: $t('system.menu.root'),
    },
  ];
}

/**
 * 只提交当前菜单类型用到的字段；隐藏字段使用默认值，避免切换类型后残留旧值
 */
export function toMenuForm(values: MenuApi.Form): MenuApi.Form {
  const data: MenuApi.Form = {
    ...values,
    isCache: values.isCache ?? 'Y',
    isFrame: values.isFrame ?? 'N',
    visible: values.visible ?? '0',
  };
  if (data.menuType !== MenuType.MENU) {
    data.component = '';
    data.queryParam = '';
    data.activeMenu = '';
  }
  if (data.menuType === MenuType.DIR) {
    data.perms = '';
  }
  if (data.menuType === MenuType.BUTTON) {
    data.path = '';
    data.icon = '';
    data.isFrame = 'N';
    data.visible = '0';
  }
  return data;
}
