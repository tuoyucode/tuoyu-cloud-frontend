/**
 * Warm-Flow 自带的设计器与流程图（后端 /warm-flow-ui，经网关转发）的嵌入工具。
 *
 * 登录令牌的传递方式（由 Warm-Flow 前端决定，见后端 warm-flow.token-name）：
 * - 页面地址的查询参数中带上 Authorization（Bearer 令牌）与 clientid；
 * - Warm-Flow 前端把这些参数存入本站点的 localStorage（键名前缀 Warm-），之后请求 /warm-flow/** 时作为请求头发送；
 * - 因为 iframe 与本系统同源（都经过 /api 转发），这些键与本系统共用 localStorage，退出登录时要清除（clearWarmFlowStorage）。
 */

/** Warm-Flow 前端写入 localStorage 的键名前缀 */
export const WARM_FLOW_STORAGE_PREFIX = 'Warm-';

/** Warm-Flow 前端的页面：设计器（默认）与流程图 */
export type WarmFlowPage = 'design' | 'FlowChart';

export interface WarmFlowUrlOptions {
  /** 后端地址前缀，例如 /api */
  apiURL: string;
  /** 后端客户端 ID */
  clientId: string;
  /** 只读查看（设计器不能修改） */
  disabled?: boolean;
  /** 设计器为流程定义 ID，流程图为流程实例 ID */
  id: string;
  /** 页面，默认设计器 */
  page?: WarmFlowPage;
  /** 明暗模式 */
  theme?: 'dark' | 'light';
  /** 登录令牌（不含 Bearer 前缀） */
  token: null | string;
}

/** 拼出 Warm-Flow 页面的地址 */
export function buildWarmFlowUrl(options: WarmFlowUrlOptions): string {
  const params = new URLSearchParams();
  params.set('id', options.id);
  if (options.page === 'FlowChart') {
    params.set('type', 'FlowChart');
  }
  if (options.disabled) {
    params.set('disabled', 'true');
  }
  if (options.theme) {
    params.set('theme', `theme-${options.theme}`);
  }
  if (options.token) {
    params.set('Authorization', `Bearer ${options.token}`);
  }
  params.set('clientid', options.clientId);
  const base = options.apiURL.replace(/\/+$/, '');
  return `${base}/warm-flow-ui/index.html?${params.toString()}`;
}

/** 页面地址对应的来源（协议 + 主机 + 端口），用于校验 iframe 发来的消息 */
export function resolveOrigin(url: string, base: string): string {
  return new URL(url, base).origin;
}

/** Warm-Flow 页面发给上级页面的消息，例如 { method: 'close' }、{ method: 'getTheme' } */
export interface WarmFlowMessage {
  method: string;
}

/**
 * 解析 iframe 发来的消息：只接受来自指定 iframe、指定来源的 { method } 消息
 */
export function parseWarmFlowMessage(
  event: Pick<MessageEvent, 'data' | 'origin' | 'source'>,
  frame: null | undefined | Window,
  origin: string,
): undefined | WarmFlowMessage {
  if (!frame || event.source !== frame || event.origin !== origin) {
    return undefined;
  }
  const data = event.data as unknown;
  if (
    data &&
    typeof data === 'object' &&
    typeof (data as { method?: unknown }).method === 'string'
  ) {
    return data as WarmFlowMessage;
  }
  return undefined;
}

/** 回复给 Warm-Flow 页面的主题消息 */
export function themeMessage(dark: boolean) {
  return { type: dark ? 'theme-dark' : 'theme-light' };
}

/**
 * 清除 Warm-Flow 前端保存在 localStorage 中的令牌等数据。退出登录时调用
 */
export function clearWarmFlowStorage(storage?: Storage) {
  try {
    const target = storage ?? globalThis.localStorage;
    if (!target) {
      return;
    }
    const keys: string[] = [];
    for (let index = 0; index < target.length; index++) {
      const key = target.key(index);
      if (key?.startsWith(WARM_FLOW_STORAGE_PREFIX)) {
        keys.push(key);
      }
    }
    for (const key of keys) {
      target.removeItem(key);
    }
  } catch {
    // 隐私模式等情况下无法访问 localStorage，忽略
  }
}
