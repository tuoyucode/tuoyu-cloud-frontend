import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
} from '@vben/types';

import { generateAccessible } from '@vben/access';
import { preferences } from '@vben/preferences';

import { getAllMenusApi } from '@tuoyu/shared/api';
import { convertBackendRoutes } from '@tuoyu/shared/router/backend-routes';
import { ElMessage } from 'element-plus';

import { BasicLayout, IFrameView } from '#/layouts';
import { $t } from '#/locales';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  const pageMap: ComponentRecordType = import.meta.glob('../views/**/*.vue');
  // 与 Vben 解析后端组件路径的方式一致：/system/post/index
  const pages = new Set(
    Object.keys(pageMap).map((key) =>
      key.replace(/^\.\.\/views/, '').replace(/\.vue$/, ''),
    ),
  );

  const layoutMap: ComponentRecordType = {
    BasicLayout,
    IFrameView,
  };

  return await generateAccessible(preferences.app.accessMode, {
    ...options,
    fetchMenuListAsync: async () => {
      ElMessage({
        duration: 1500,
        message: `${$t('common.loadingMenu')}...`,
      });
      const routes = await getAllMenusApi();
      // 本应用还没有的页面显示“敬请期待”
      return convertBackendRoutes(routes ?? [], (page) => pages.has(page));
    },
    // 可以指定没有权限跳转403页面
    forbiddenComponent,
    // 如果 route.meta.menuVisibleWithForbidden = true
    layoutMap,
    pageMap,
  });
}

export { generateAccess };
