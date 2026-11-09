/**
 * 消息中心的数据处理：把历史消息（/resource/message/box）与实时推送统一成一种结构，合并、去重、排序；
 * 已读与已移除的状态只保存在本地（后端没有已读接口）
 */
import type { MessageApi } from '../api/core/message';

/** 消息分类，与后端 SysMessageServiceImpl 的分类一致 */
export type MessageCategory = 'notice' | 'system' | 'workflow';

/** 铃铛中的一条消息 */
export interface MessageItem {
  category: MessageCategory;
  /** 通知公告的正文（纯文本） */
  content?: string;
  /** 后端的消息 ID；没有入库的推送为本地生成的 ID */
  id: string;
  message: string;
  /** 相关页面的路由路径（可能带查询参数），例如工作流消息的 /task/taskWaiting */
  path?: string;
  /** 消息时间（毫秒时间戳） */
  time: number;
}

/** 同一令牌建立新连接时，后端发给旧连接的控制消息 */
export const KICKED_MESSAGE = 'kicked';

/** 铃铛中最多保留的消息条数（后端每类最多返回 100 条） */
export const MESSAGE_LIMIT = 300;

/** 本地最多记录的已读、已移除消息 ID 数量 */
export const STATE_ID_LIMIT = 1000;

const CATEGORIES = new Set<MessageCategory>(['notice', 'system', 'workflow']);

/** 按类型与来源确定分类（与后端 resolveCategory 一致） */
export function resolveCategory(
  type?: null | string,
  source?: null | string,
): MessageCategory {
  if (type === 'notice' || source === 'notice') {
    return 'notice';
  }
  if (source === 'workflow') {
    return 'workflow';
  }
  return 'system';
}

/**
 * 是否为消息中心的消息（与后端存入消息盒子的条件一致）：类型为 message 或 notice，且不是大模型的流式输出
 */
export function isBoxMessage(type?: null | string, source?: null | string) {
  return (type === 'message' || type === 'notice') && source !== 'llm';
}

function toId(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  return String(value);
}

function toText(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const text = String(value);
  return text === '' ? undefined : text;
}

/** 后端时间（yyyy-MM-dd HH:mm:ss，本地时区）转为毫秒时间戳；无法解析时为 0 */
export function parseTime(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value !== 'string' || value === '') {
    return 0;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(
    value,
  );
  if (match) {
    const [, y, mo, d, h, mi, s] = match;
    return new Date(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s ?? 0),
    ).getTime();
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** 通知公告推送的 data 中带有正文 noticeContent */
function contentOf(data: unknown): string | undefined {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return toText((data as Record<string, unknown>).noticeContent);
  }
  return undefined;
}

/** 历史消息（SysMessageBoxVo）转为消息列表 */
export function fromMessageBox(
  box: MessageApi.MessageBox | null | undefined,
): MessageItem[] {
  if (!box) {
    return [];
  }
  const lists = [box.systemList, box.noticeList, box.workflowList];
  const items: MessageItem[] = [];
  for (const list of lists) {
    for (const vo of list ?? []) {
      const id = toId(vo.messageId);
      if (!id) {
        continue;
      }
      const category = CATEGORIES.has(vo.category as MessageCategory)
        ? (vo.category as MessageCategory)
        : resolveCategory(vo.type, vo.source);
      items.push({
        category,
        content: toText(vo.content) ?? contentOf(vo.data),
        id,
        message: toText(vo.message) ?? toText(vo.title) ?? '',
        path: toText(vo.path),
        time: parseTime(vo.createTime),
      });
    }
  }
  return items;
}

/** 推送数据的解析结果 */
export type PushParseResult =
  | { item: MessageItem; kind: 'message' }
  | { kind: 'ignored' }
  | { kind: 'kicked' };

/**
 * 解析一条推送（SSE 的 data）。后端推送的是 PushPayloadDTO 的 JSON；
 * 同一令牌被新连接替换时，旧连接收到文本 kicked
 *
 * @param data 推送内容
 * @param now 推送中没有时间时使用的当前时间
 */
export function parsePushData(
  data: string,
  now: number = Date.now(),
): PushParseResult {
  const text = data.trim();
  if (text === KICKED_MESSAGE) {
    return { kind: 'kicked' };
  }
  let payload: MessageApi.PushPayload;
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { kind: 'ignored' };
    }
    payload = parsed as MessageApi.PushPayload;
  } catch {
    return { kind: 'ignored' };
  }
  if (!isBoxMessage(payload.type, payload.source)) {
    return { kind: 'ignored' };
  }
  const message = toText(payload.message);
  if (!message) {
    return { kind: 'ignored' };
  }
  const time = parseTime(payload.timestamp) || now;
  return {
    item: {
      category: resolveCategory(payload.type, payload.source),
      content: contentOf(payload.data),
      // 没有入库的推送（后端未返回 messageId）用时间与内容生成本地 ID，重复推送时可以去重
      id: toId(payload.messageId) ?? `local-${time}-${message}`,
      message,
      path: toText(payload.path),
      time,
    },
    kind: 'message',
  };
}

/**
 * 合并消息：按 ID 去重（新来的覆盖旧的），按时间倒序，最多保留 limit 条
 */
export function mergeMessages(
  current: readonly MessageItem[],
  incoming: readonly MessageItem[],
  limit: number = MESSAGE_LIMIT,
): MessageItem[] {
  const byId = new Map<string, MessageItem>();
  for (const item of current) {
    byId.set(item.id, item);
  }
  for (const item of incoming) {
    byId.set(item.id, item);
  }
  return [...byId.values()]
    .toSorted((a, b) => b.time - a.time || (a.id < b.id ? 1 : -1))
    .slice(0, limit);
}

/** 本地保存的消息状态 */
export interface MessageLocalState {
  /** 已移除（用户点了删除或清空）的消息 ID */
  hidden: string[];
  /** 已读的消息 ID */
  read: string[];
}

const STATE_KEY_PREFIX = 'tuoyu-message-state:';

function emptyState(): MessageLocalState {
  return { hidden: [], read: [] };
}

function toIdList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((id): id is string => typeof id === 'string')
    : [];
}

/** 读取某个用户的本地消息状态；浏览器禁止存储或数据损坏时返回空状态 */
export function loadMessageState(userId: string): MessageLocalState {
  try {
    const raw = window.localStorage.getItem(STATE_KEY_PREFIX + userId);
    if (!raw) {
      return emptyState();
    }
    const parsed = JSON.parse(raw);
    return { hidden: toIdList(parsed?.hidden), read: toIdList(parsed?.read) };
  } catch {
    return emptyState();
  }
}

/** 保存某个用户的本地消息状态；失败时忽略（只影响刷新后的已读显示） */
export function saveMessageState(userId: string, state: MessageLocalState) {
  try {
    window.localStorage.setItem(
      STATE_KEY_PREFIX + userId,
      JSON.stringify(state),
    );
  } catch {
    // 隐私模式、存储已满等情况下忽略
  }
}

/**
 * 追加 ID 并去重，只保留最近的 limit 个（旧的消息 30 天后后端也不再返回）
 */
export function appendIds(
  list: readonly string[],
  ids: readonly string[],
  limit: number = STATE_ID_LIMIT,
): string[] {
  const set = new Set(list);
  for (const id of ids) {
    set.delete(id);
    set.add(id);
  }
  const result = [...set];
  return result.length > limit ? result.slice(result.length - limit) : result;
}
