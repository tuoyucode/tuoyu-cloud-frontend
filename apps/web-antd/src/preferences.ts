import type { Preferences } from '@vben/preferences';
import type { DeepPartial } from '@vben/types';

import { defineOverridesPreferences } from '@vben/preferences';

/**
 * @description 项目配置文件
 * 品牌与主题的取值依据仓库根目录 CONTRIBUTING.md 的“品牌与设计”一节，修改前先改规范。
 * 只需要覆盖项目中的一部分配置，不需要的配置不用覆盖，会自动使用默认配置
 */

/** 最终用户不能打开偏好设置面板切换主题色；明暗与语言由顶栏按钮切换。部署方需要时可以改为 true（演示站即如此） */
const enablePreferences = false;

/**
 * 由部署方决定的配置。Vben 启动时浏览器缓存的偏好设置优先于代码中的配置，
 * 部署方改了这些配置后，老用户的浏览器仍会用缓存中的旧值。
 * 关闭偏好设置面板时，启动后用这里的值覆盖缓存（见 main.ts），保证改动对所有用户生效
 */
export const lockedPreferences: DeepPartial<Preferences> = {
  app: {
    // 菜单来自后端（/system/menu/getRouters），本地静态路由（首页等）同时保留
    accessMode: 'mixed',
    // 首页：部署方式、服务状态、安全自检（views/home）
    defaultHomePath: '/home',
    enablePreferences,
    name: import.meta.env.VITE_APP_TITLE,
  },
  copyright: {
    companyName: 'tuoyu',
    companySiteLink: '',
    date: '2026',
    enable: true,
    // 备案号由部署方按自己的备案信息填写
    icp: '',
    icpLink: '',
    settingShow: false,
  },
  logo: {
    source: '/logo.svg',
    sourceDark: '/logo-dark.svg',
  },
  theme: {
    builtinType: 'custom',
    // 靛蓝，与 Ant Design / Vben 默认的亮蓝拉开区别
    colorPrimary: 'hsl(228 64% 46%)',
    colorSuccess: 'hsl(131 54% 40%)',
    colorWarning: 'hsl(37 87% 41%)',
    colorDestructive: 'hsl(357 69% 53%)',
    // 根字号保持 Vben 默认的 16：菜单为根字号的 0.875 倍（14px），正文与组件也是 14px。
    // 不要改成 14，那会把整个界面按比例缩小 12.5%
    fontSize: 16,
    // 6px
    radius: '0.375',
    // 浅色侧边栏，暗色模式下随页面变暗
    semiDarkSidebar: false,
  },
};

/** 启动后是否用 lockedPreferences 覆盖浏览器缓存 */
export const lockPreferences = !enablePreferences;

/** 初始配置。明暗模式（mode）由用户在顶栏切换，保留缓存中的选择 */
export const overridesPreferences = defineOverridesPreferences({
  ...lockedPreferences,
  theme: { ...lockedPreferences.theme, mode: 'auto' },
});
