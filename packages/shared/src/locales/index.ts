import type { SupportedLanguagesType } from '@vben/locales';

import enRequest from './langs/en-US/request.json';
import zhRequest from './langs/zh-CN/request.json';

/**
 * 共享代码用到的文案。应用加载语言包时与自己的文案合并（应用的同名键优先），
 * 共享代码中按 `request.*` 等键名通过 `$t` 读取
 */
export const sharedMessages: Record<
  SupportedLanguagesType,
  Record<string, unknown>
> = {
  'en-US': { request: enRequest },
  'zh-CN': { request: zhRequest },
};
