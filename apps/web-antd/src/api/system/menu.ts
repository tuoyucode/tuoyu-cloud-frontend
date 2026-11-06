import { requestClient } from '#/api/request';

export namespace MenuApi {
  /** 菜单类型：M 目录，C 菜单，F 按钮 */
  export type MenuType = 'C' | 'F' | 'M';

  /** 菜单（SysMenuVo） */
  export interface Menu {
    /** 访问隐藏页面时高亮的菜单路径 */
    activeMenu?: string;
    /** 页面路径：views 下的相对路径，不带 .vue，例如 system/post/index */
    component?: null | string;
    createTime?: string;
    /** Iconify 图标名，例如 lucide:user */
    icon?: string;
    /** 是否缓存：Y 缓存，N 不缓存 */
    isCache?: string;
    /** 是否外链：Y 是（新窗口打开），N 否 */
    isFrame?: string;
    menuId: string;
    menuName: string;
    menuType: MenuType;
    orderNum: number;
    /** 顶级菜单为 0 */
    parentId: number | string;
    path?: string;
    /** 权限标识，例如 system:user:list */
    perms?: null | string;
    /** 路由参数，JSON 对象字符串 */
    queryParam?: null | string;
    remark?: string;
    /** 0 正常，1 停用（字典 sys_normal_disable） */
    status: string;
    /** 0 显示，1 隐藏（字典 sys_show_hide） */
    visible: string;
  }

  /** 查询条件（SysMenuBo） */
  export interface Query {
    menuName?: string;
    menuType?: MenuType;
    status?: string;
    visible?: string;
  }

  /** 新增、修改的参数（SysMenuBo） */
  export type Form = Omit<Menu, 'createTime' | 'menuId'> & {
    menuId?: string;
  };
}

const BASE = '/system/menu';

/** 菜单列表：扁平列表，由页面组装成树 */
export function listMenu(query: MenuApi.Query = {}) {
  return requestClient.get<MenuApi.Menu[]>(`${BASE}/list`, { params: query });
}

export function getMenu(menuId: string) {
  return requestClient.get<MenuApi.Menu>(`${BASE}/${menuId}`);
}

export function addMenu(data: MenuApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function updateMenu(data: MenuApi.Form) {
  return requestClient.put<null>(BASE, data);
}

/** 删除菜单。有下级菜单或已分配给角色时，后端拒绝并返回原因 */
export function removeMenu(menuId: string) {
  return requestClient.delete<null>(`${BASE}/${menuId}`);
}
