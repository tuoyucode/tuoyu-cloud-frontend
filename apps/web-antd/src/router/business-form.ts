import type { Component } from 'vue';

import { defineAsyncComponent } from 'vue';

import { businessFormPath } from '@tuoyu/shared/pages/workflow/task-utils';

/**
 * views 下的全部页面，按需加载。键统一为 ../views/<路径>.vue（与 access.ts 中菜单路由的写法相同；
 * glob 写在 views 之外，键才不会因为与本文件同目录而被简化成别的相对路径）。
 *
 * 流程定义的表单路径指向其中一个业务详情组件，组件接收 props：
 * - businessId：流程的业务 ID（字符串，可能带有业务模块自己的后缀，由业务组件解析）；
 * - instanceId：流程实例 ID，可能为空。
 */
const pages = import.meta.glob<Component>('../views/**/*.vue');

const cache = new Map<string, Component>();

/**
 * 按表单路径取得业务详情组件。没有表单路径时返回 undefined；有路径但找不到页面时返回 null
 */
export function resolveBusinessForm(
  formPath?: string,
): Component | null | undefined {
  const path = businessFormPath(formPath);
  if (!path) {
    return undefined;
  }
  const loader = pages[`../views/${path}.vue`];
  if (!loader) {
    return null;
  }
  let component = cache.get(path);
  if (!component) {
    component = defineAsyncComponent(loader);
    cache.set(path, component);
  }
  return component;
}
