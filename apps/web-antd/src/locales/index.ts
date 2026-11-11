import type { Locale } from 'ant-design-vue/es/locale';

import type { App } from 'vue';

import type { LocaleSetupOptions, SupportedLanguagesType } from '@vben/locales';

import { ref } from 'vue';

import {
  $t,
  setupI18n as coreSetup,
  loadLocalesMapFromDir,
} from '@vben/locales';
import { preferences } from '@vben/preferences';

import { loadSharedMessages } from '@tuoyu/shared/locales';
import { nestNamespaces } from '@tuoyu/shared/utils/locale';
import antdEnLocale from 'ant-design-vue/es/locale/en_US';
import antdDefaultLocale from 'ant-design-vue/es/locale/zh_CN';
import dayjs from 'dayjs';

const antdLocale = ref<Locale>(antdDefaultLocale);

// 只放本应用独有的文案（例如业务分支中的业务页面）；框架页面的文案在 @tuoyu/shared
const modules = import.meta.glob('./langs/**/*.json');

const localesMap = loadLocalesMapFromDir(
  /\.\/langs\/([^/]+)\/(.*)\.json$/,
  modules,
);
/**
 * 加载应用的语言包：两个 UI 版本共用的文案（@tuoyu/shared）与应用自己的文案合并，应用的同名键优先
 * @param lang
 */
async function loadMessages(lang: SupportedLanguagesType) {
  const [sharedMessages, appLocaleMessages] = await Promise.all([
    loadSharedMessages(lang),
    localesMap[lang]?.(),
    loadThirdPartyMessage(lang),
  ]);
  return nestNamespaces(sharedMessages, appLocaleMessages?.default ?? {});
}

/**
 * 加载第三方组件库的语言包
 * @param lang
 */
async function loadThirdPartyMessage(lang: SupportedLanguagesType) {
  await Promise.all([loadAntdLocale(lang), loadDayjsLocale(lang)]);
}

/**
 * 加载dayjs的语言包
 * @param lang
 */
async function loadDayjsLocale(lang: SupportedLanguagesType) {
  let locale;
  switch (lang) {
    case 'en-US': {
      locale = await import('dayjs/locale/en');
      break;
    }
    case 'zh-CN': {
      locale = await import('dayjs/locale/zh-cn');
      break;
    }
    // 默认使用英语
    default: {
      locale = await import('dayjs/locale/en');
    }
  }
  if (locale) {
    dayjs.locale(locale);
  } else {
    console.error(`Failed to load dayjs locale for ${lang}`);
  }
}

/**
 * 加载antd的语言包
 * @param lang
 */
async function loadAntdLocale(lang: SupportedLanguagesType) {
  switch (lang) {
    case 'en-US': {
      antdLocale.value = antdEnLocale;
      break;
    }
    case 'zh-CN': {
      antdLocale.value = antdDefaultLocale;
      break;
    }
  }
}

async function setupI18n(app: App, options: LocaleSetupOptions = {}) {
  await coreSetup(app, {
    defaultLocale: preferences.app.locale,
    loadMessages,
    missingWarn: !import.meta.env.PROD,
    ...options,
  });
}

export { $t, antdLocale, setupI18n };
