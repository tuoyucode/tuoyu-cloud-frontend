import { initPreferences, updatePreferences } from '@vben/preferences';
import { unmountGlobalLoading } from '@vben/utils';

import { toHashCallbackUrl } from '@tuoyu/shared/utils/social-callback';

import {
  lockedPreferences,
  lockPreferences,
  overridesPreferences,
} from './preferences';

/**
 * 应用初始化完成之后再进行页面加载渲染
 */
async function initApplication() {
  // hash 路由：第三方授权回跳的 /social-callback?... 改写到 # 之后，必须在创建路由之前
  if (import.meta.env.VITE_ROUTER_HISTORY === 'hash') {
    const callbackUrl = toHashCallbackUrl(
      window.location,
      import.meta.env.VITE_BASE,
    );
    if (callbackUrl) {
      window.history.replaceState(null, '', callbackUrl);
    }
  }

  // name用于指定项目唯一标识
  // 用于区分不同项目的偏好设置以及存储数据的key前缀以及其他一些需要隔离的数据
  const env = import.meta.env.PROD ? 'prod' : 'dev';
  const appVersion = import.meta.env.VITE_APP_VERSION;
  const namespace = `${import.meta.env.VITE_APP_NAMESPACE}-${appVersion}-${env}`;

  // app偏好设置初始化
  await initPreferences({
    namespace,
    overrides: overridesPreferences,
  });
  // 部署方决定的配置以代码为准，不使用浏览器缓存中的旧值（见 preferences.ts）
  if (lockPreferences) {
    updatePreferences(lockedPreferences);
  }

  // 启动应用并挂载
  // vue应用主要逻辑及视图
  const { bootstrap } = await import('./bootstrap');
  await bootstrap(namespace);

  // 移除并销毁loading
  unmountGlobalLoading();
}

initApplication();
