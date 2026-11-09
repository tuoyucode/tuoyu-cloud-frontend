/** 第三方授权回调页的路由路径，与后端 justauth.type.*.redirect-uri 中的路径一致 */
export const SOCIAL_CALLBACK_PATH = '/social-callback';

/**
 * hash 路由模式下，第三方授权回跳的地址是 `<站点>/social-callback?source=...&code=...&state=...`
 * （后端 justauth.type.*.redirect-uri），不在 `#` 之后，路由读不到。
 * 在创建路由之前把它改写为 `<站点>/#/social-callback?...`，后端配置不必区分路由模式。
 * 不是回调地址时返回 null
 */
export function toHashCallbackUrl(
  location: Pick<Location, 'pathname' | 'search'>,
  base = '/',
): null | string {
  const prefix = base.endsWith('/') ? base : `${base}/`;
  const path = location.pathname.replace(/\/+$/, '');
  if (path !== `${prefix}${SOCIAL_CALLBACK_PATH.slice(1)}`) {
    return null;
  }
  return `${prefix}#${SOCIAL_CALLBACK_PATH}${location.search}`;
}
