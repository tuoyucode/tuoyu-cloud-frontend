import type { RouteRecordRaw } from 'vue-router';

import { SOCIAL_CALLBACK_PATH } from '@tuoyu/shared/utils/social-callback';

import { $t } from '#/locales';

/**
 * 个人中心：所有登录用户可用，不在菜单中显示，从头像菜单进入。
 * 第三方授权回跳页：同样需要登录（未登录时先登录，再带着回跳参数回来），不在菜单和标签栏中显示
 */
const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/_core/profile/index.vue'),
    meta: {
      hideInMenu: true,
      icon: 'lucide:user',
      title: $t('page.auth.profile'),
    },
    name: 'Profile',
    path: '/profile',
  },
  {
    component: () => import('#/views/_core/profile/social-callback.vue'),
    meta: {
      hideInMenu: true,
      hideInTab: true,
      title: $t('page.profile.callbackTitle'),
    },
    name: 'SocialCallback',
    path: SOCIAL_CALLBACK_PATH,
  },
];

export default routes;
