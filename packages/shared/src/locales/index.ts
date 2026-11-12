import type { SupportedLanguagesType } from '@vben/locales';

import { loadLocalesMapFromDir } from '@vben/locales';

/**
 * 两个 UI 版本共用的文案：请求层的提示、通用的增删改查文案与各页面的文案。
 * 每个页面一个文件（langs/<语言>/<模块>/<业务>.json），按语言按需加载
 */
const localesMap = loadLocalesMapFromDir(
  /\.\/langs\/([^/]+)\/(.*)\.json$/,
  import.meta.glob('./langs/**/*.json'),
);

/**
 * 读取一种语言的共享文案，键为文件路径（如 `system/post`）。
 * 应用把它与自己的文案一起交给 `nestNamespaces`，应用的同名键优先
 */
export async function loadSharedMessages(
  lang: SupportedLanguagesType,
): Promise<Record<string, any>> {
  const loaded = (await localesMap[lang]?.()) as
    | undefined
    | { default?: Record<string, any> };
  return loaded?.default ?? {};
}
