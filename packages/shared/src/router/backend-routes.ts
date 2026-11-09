import type { RouteRecordStringComponent } from '@vben/types';

/** 后端 /system/menu/getRouters 返回的路由（RouterVo） */
export interface BackendRoute {
  alwaysShow?: boolean;
  children?: BackendRoute[];
  component?: string;
  hidden?: boolean;
  meta?: {
    activeMenu?: string;
    icon?: string;
    link?: string;
    noCache?: boolean;
    title: string;
  };
  name?: string;
  path: string;
  query?: string;
  redirect?: string;
}

/** 路由元信息（vue-router 的 RouteMeta，已由 Vben 扩展） */
type RouteMeta = NonNullable<RouteRecordStringComponent['meta']>;

/** 后端的目录组件：Vben 中目录不需要组件，由上级布局渲染子路由 */
const DIRECTORY_COMPONENTS = new Set(['Layout', 'ParentView']);

/** 后端的内嵌页面组件（菜单中的“内链”，在 iframe 中打开） */
const INNER_LINK_COMPONENT = 'InnerLink';

/** 前端还没有对应页面时显示的页面 */
export const COMING_SOON_PAGE = '/_core/fallback/coming-soon';

const HTTP_PATTERN = /^https?:\/\//i;

/**
 * 把后端菜单转换为 Vben 的路由。
 *
 * @param routes 后端返回的路由树
 * @param hasPage 前端是否已有该页面（参数为以 / 开头、不带 .vue 的页面路径）
 */
export function convertBackendRoutes(
  routes: BackendRoute[],
  hasPage: (page: string) => boolean,
): RouteRecordStringComponent[] {
  return flattenTopLevel(routes).map((route, index) => {
    const converted = convertRoute(route, hasPage, true);
    // 保持后端的排序（后端已按显示顺序排好）
    if (converted.meta) {
      converted.meta.order = index + 1;
    }
    return converted;
  });
}

/**
 * 后端把顶级菜单（不是目录的菜单、顶级内链）包在一层 path 为 / 的 Layout 里，这一层在 Vben 中不需要
 */
function flattenTopLevel(routes: BackendRoute[]): BackendRoute[] {
  return routes.flatMap((route) => {
    if (route.path === '/' && route.children?.length) {
      return route.children.map((child) => ({
        ...child,
        path: child.path.startsWith('/') ? child.path : `/${child.path}`,
      }));
    }
    return [route];
  });
}

function convertRoute(
  route: BackendRoute,
  hasPage: (page: string) => boolean,
  topLevel: boolean,
): RouteRecordStringComponent {
  const name = route.name ?? route.path;
  const meta = convertMeta(route);

  // 外链：在新窗口打开，路由路径只用于菜单定位
  if (
    HTTP_PATTERN.test(route.path) &&
    route.component !== INNER_LINK_COMPONENT
  ) {
    const path = `link-${name.toLowerCase()}`;
    return {
      component: 'IFrameView',
      meta: { ...meta, link: route.path },
      name,
      path: topLevel ? `/${path}` : path,
    };
  }

  const result: RouteRecordStringComponent = {
    component: convertComponent(route, hasPage, meta),
    meta,
    name,
    path: route.path,
  };
  // 后端目录的 redirect 为 noRedirect，交给 Vben 自动重定向到第一个子菜单
  if (route.redirect && route.redirect !== 'noRedirect') {
    result.redirect = route.redirect;
  }
  if (route.children?.length) {
    result.children = route.children.map((child) =>
      convertRoute(child, hasPage, false),
    );
  }
  return result;
}

function convertComponent(
  route: BackendRoute,
  hasPage: (page: string) => boolean,
  meta: RouteMeta,
): string {
  const component = route.component ?? '';
  if (!component || DIRECTORY_COMPONENTS.has(component)) {
    return '';
  }
  if (component === INNER_LINK_COMPONENT) {
    meta.iframeSrc = route.meta?.link;
    return 'IFrameView';
  }
  const page = `/${component.replace(/^\/+/, '').replace(/\.vue$/, '')}`;
  return hasPage(page) ? page : COMING_SOON_PAGE;
}

function convertMeta(route: BackendRoute): RouteMeta {
  const source = route.meta;
  const meta: RouteMeta = { title: source?.title ?? route.name ?? '' };
  // 只接受 Iconify 图标（如 lucide:user）；后端种子数据中的旧图标名在调整菜单数据时统一替换
  if (source?.icon?.includes(':')) {
    meta.icon = source.icon;
  }
  if (route.hidden) {
    meta.hideInMenu = true;
  }
  if (source?.activeMenu) {
    meta.activePath = source.activeMenu;
  }
  if (source?.noCache === false) {
    meta.keepAlive = true;
  }
  const query = parseQuery(route.query);
  if (query) {
    meta.query = query;
  }
  return meta;
}

/** 后端的路由参数是 JSON 字符串，例如 {"id": 1} */
function parseQuery(query?: string) {
  if (!query) {
    return undefined;
  }
  try {
    const value = JSON.parse(query);
    return value && typeof value === 'object' ? value : undefined;
  } catch {
    return undefined;
  }
}
