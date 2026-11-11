import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/home/index.vue'),
    meta: {
      affixTab: true,
      icon: 'lucide:house',
      order: -1,
      title: $t('page.home.title'),
    },
    name: 'Home',
    path: '/home',
  },
];

export default routes;
