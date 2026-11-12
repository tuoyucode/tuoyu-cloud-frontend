import type { AuthApi } from '@tuoyu/shared/api';

import type { UserInfo } from '@vben/types';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import { resetAllStores, useAccessStore, useUserStore } from '@vben/stores';

import { getUserInfoApi, loginApi, logoutApi } from '@tuoyu/shared/api';
import { clearWarmFlowStorage } from '@tuoyu/shared/utils/warm-flow';
import { ElNotification } from 'element-plus';
import { defineStore } from 'pinia';

import { $t } from '#/locales';

import { useMessageStore } from './message';

export const useAuthStore = defineStore('auth', () => {
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const router = useRouter();

  const loginLoading = ref(false);

  /**
   * 账号密码登录：取得 token 后加载用户信息与权限码，再进入首页（或登录前要去的页面）。
   * 失败时抛出异常，由登录页刷新验证码
   */
  async function authLogin(
    params: AuthApi.LoginParams,
    onSuccess?: () => Promise<void> | void,
  ) {
    try {
      loginLoading.value = true;
      const { access_token: accessToken } = await loginApi(params);
      accessStore.setAccessToken(accessToken);
      const userInfo: UserInfo = await fetchUserInfo();

      if (accessStore.loginExpired) {
        accessStore.setLoginExpired(false);
      } else {
        onSuccess
          ? await onSuccess?.()
          : await router.push(
              userInfo.homePath || preferences.app.defaultHomePath,
            );
      }

      ElNotification({
        duration: 3000,
        message: `${$t('authentication.loginSuccessDesc')}:${userInfo.realName}`,
        title: $t('authentication.loginSuccess'),
        type: 'success',
      });
      return { userInfo };
    } finally {
      loginLoading.value = false;
    }
  }

  async function logout(redirect: boolean = true) {
    // 先断开消息推送：关闭连接的接口按令牌定位连接，要在令牌失效前调用
    await useMessageStore().disconnect();
    try {
      await logoutApi(accessStore.accessToken);
    } catch {
      // 登录已失效等情况下退出失败不影响前端清理
    }
    resetAllStores();
    accessStore.setLoginExpired(false);
    // 流程设计器、流程图（Warm-Flow 前端）把令牌存在本站点的 localStorage 中，一并清除
    clearWarmFlowStorage();

    // 已经在登录页时不能再带 redirect：此时 currentRoute.fullPath 就是登录页本身，
    // 再编码一层会得到「登录页?redirect=编码后的登录页」，反复登出会让 URL 逐跳变长
    const currentRoute = router.currentRoute.value;
    const alreadyOnLogin = currentRoute.path === LOGIN_PATH;

    // 回登录页带上当前路由地址
    await router.replace({
      path: LOGIN_PATH,
      query:
        redirect && !alreadyOnLogin
          ? { redirect: encodeURIComponent(currentRoute.fullPath) }
          : {},
    });
  }

  /**
   * 加载用户信息与权限码。登录后和刷新页面时（路由守卫）调用
   */
  async function fetchUserInfo() {
    const { permissions, userInfo } = await getUserInfoApi();
    userStore.setUserInfo(userInfo);
    accessStore.setAccessCodes(permissions);
    return userInfo;
  }

  function $reset() {
    loginLoading.value = false;
  }

  return {
    $reset,
    authLogin,
    fetchUserInfo,
    loginLoading,
    logout,
  };
});
