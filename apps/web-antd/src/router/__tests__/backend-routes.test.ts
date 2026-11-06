import type { BackendRoute } from '../backend-routes';

import { describe, expect, it } from 'vitest';

import { COMING_SOON_PAGE, convertBackendRoutes } from '../backend-routes';

/** 前端已有的页面 */
const pages = new Set(['/system/post/index']);
const hasPage = (page: string) => pages.has(page);

/** 与后端种子数据结构一致的示例（字段取自 RouterVo） */
const backendRoutes: BackendRoute[] = [
  {
    alwaysShow: true,
    children: [
      {
        component: 'system/user/index',
        meta: { icon: 'user', noCache: false, title: '用户管理' },
        name: 'User1761400000000000100',
        path: 'user',
      },
      {
        component: 'system/post/index',
        meta: { icon: 'lucide:briefcase', noCache: true, title: '岗位管理' },
        name: 'Post1761400000000000104',
        path: 'post',
      },
      {
        component: 'system/role/authUser',
        hidden: true,
        meta: {
          activeMenu: '/system/role',
          noCache: true,
          title: '分配用户',
        },
        name: 'Role-auth/user/:roleId1761400000000000130',
        path: 'role-auth/user/:roleId',
      },
      {
        alwaysShow: true,
        children: [
          {
            component: 'monitor/operlog/index',
            meta: { noCache: false, title: '操作日志' },
            name: 'Operlog1761400000000000500',
            path: 'operlog',
          },
        ],
        component: 'ParentView',
        meta: { icon: 'log', noCache: false, title: '日志管理' },
        name: 'Log1761400000000000108',
        path: 'log',
        redirect: 'noRedirect',
      },
    ],
    component: 'Layout',
    meta: { icon: 'lucide:settings', noCache: false, title: '系统管理' },
    name: 'System1761400000000000001',
    path: '/system',
    redirect: 'noRedirect',
  },
  {
    children: [
      {
        component: 'Layout',
        meta: { noCache: false, title: 'Nacos控制台' },
        name: 'Http://localhost:8848/nacos1761400000000000112',
        path: 'http://localhost:8848/nacos',
      },
      {
        component: 'InnerLink',
        meta: { link: 'https://example.com/docs', title: '内嵌文档' },
        name: 'Docs1761400000000000900',
        path: 'example/com/docs',
      },
    ],
    component: 'Layout',
    meta: { title: '系统监控' },
    name: 'Monitor1761400000000000002',
    path: '/monitor',
    redirect: 'noRedirect',
  },
  {
    children: [
      {
        component: 'tool/home/index',
        meta: { title: '顶级菜单', noCache: true },
        name: 'Home1761400000000000950',
        path: 'home',
        query: '{"tab":"a"}',
      },
    ],
    component: 'Layout',
    name: '1761400000000000950',
    path: '/',
  },
];

describe('后端菜单转换为 Vben 路由', () => {
  const routes = convertBackendRoutes(backendRoutes, hasPage);
  const system = routes[0];
  const [user, post, authUser, log] = system?.children ?? [];
  const monitor = routes[1];

  it('目录不带组件，也不保留后端的 noRedirect', () => {
    expect(system?.component).toBe('');
    expect(system?.redirect).toBeUndefined();
    expect(system?.path).toBe('/system');
    expect(log?.component).toBe('');
    expect(log?.redirect).toBeUndefined();
    expect(log?.children?.[0]?.path).toBe('operlog');
  });

  it('已有的页面映射到页面路径，还没有的页面显示“敬请期待”', () => {
    expect(post?.component).toBe('/system/post/index');
    expect(user?.component).toBe(COMING_SOON_PAGE);
  });

  it('只接受 Iconify 图标，旧的图标名先不显示', () => {
    expect(system?.meta?.icon).toBe('lucide:settings');
    expect(post?.meta?.icon).toBe('lucide:briefcase');
    expect(user?.meta?.icon).toBeUndefined();
  });

  it('缓存、隐藏与高亮菜单', () => {
    expect(user?.meta?.keepAlive).toBe(true);
    expect(post?.meta?.keepAlive).toBeUndefined();
    expect(authUser?.meta?.hideInMenu).toBe(true);
    expect(authUser?.meta?.activePath).toBe('/system/role');
  });

  it('外链在新窗口打开，内链在 iframe 中打开', () => {
    const [nacos, docs] = monitor?.children ?? [];
    expect(nacos?.component).toBe('IFrameView');
    expect(nacos?.meta?.link).toBe('http://localhost:8848/nacos');
    expect(nacos?.path).not.toMatch(/^https?:/);
    expect(docs?.component).toBe('IFrameView');
    expect(docs?.meta?.iframeSrc).toBe('https://example.com/docs');
  });

  it('顶级菜单去掉后端包的一层，路由参数从 JSON 解析', () => {
    const home = routes[2];
    expect(home?.path).toBe('/home');
    expect(home?.name).toBe('Home1761400000000000950');
    expect(home?.meta?.query).toEqual({ tab: 'a' });
  });

  it('保持后端的排序', () => {
    expect(routes.map((route) => route.meta?.order)).toEqual([1, 2, 3]);
  });
});
