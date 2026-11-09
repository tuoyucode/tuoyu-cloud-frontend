import type { BackendRoute } from '../../router/backend-routes';

import { requestClient } from '../request';

/**
 * 获取当前用户的菜单路由（后端按角色过滤并排好序）
 */
export async function getAllMenusApi() {
  return requestClient.get<BackendRoute[]>('/system/menu/getRouters');
}
