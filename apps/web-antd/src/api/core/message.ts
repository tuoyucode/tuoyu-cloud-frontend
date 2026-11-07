import { useAppConfig } from '@vben/hooks';

import {
  baseRequestClient,
  CLIENT_ID,
  contentLanguage,
  formatToken,
  requestClient,
  silentErrors,
} from '#/api/request';

export namespace MessageApi {
  /** 历史消息（后端 SysMessageVo） */
  export interface Message {
    /** system / notice / workflow */
    category?: string;
    /** 通知公告的正文 */
    content?: null | string;
    /** yyyy-MM-dd HH:mm:ss */
    createTime?: string;
    data?: unknown;
    message?: null | string;
    messageId: number | string;
    path?: null | string;
    source?: string;
    /** 后端按分类生成的标题，例如“系统消息” */
    title?: string;
    type?: string;
  }

  /** 消息盒子（后端 SysMessageBoxVo）：30 天内、每类最多 100 条，按时间倒序 */
  export interface MessageBox {
    noticeList?: Message[];
    systemList?: Message[];
    workflowList?: Message[];
  }

  /** 实时推送的消息体（后端 PushPayloadDTO） */
  export interface PushPayload {
    data?: unknown;
    message?: null | string;
    /** 存入消息盒子后的 ID；不入库的推送没有 */
    messageId?: null | number | string;
    path?: null | string;
    /** backend / notice / workflow / llm / client */
    source?: string;
    /** 毫秒时间戳 */
    timestamp?: number;
    /** message / notice / llm / custom */
    type?: string;
  }
}

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

/** SSE 推送地址（经网关，后端配置 message.path） */
export const MESSAGE_STREAM_PATH = '/resource/message';

/** SSE 连接的完整地址 */
export function messageStreamUrl() {
  return `${apiURL.replace(/\/+$/, '')}${MESSAGE_STREAM_PATH}`;
}

/**
 * 当前用户的消息盒子（只要求登录）。
 * 消息只是辅助功能：失败时（包括消息服务不可用）不弹出提示，由调用方决定如何处理
 */
export async function getMessageBox(): Promise<MessageApi.MessageBox> {
  const box = await requestClient.get<MessageApi.MessageBox | null>(
    '/resource/message/box',
    silentErrors({}),
  );
  return box ?? {};
}

/**
 * 通知后端关闭本令牌的推送连接（免登录接口，按请求头中的令牌定位连接）。
 * 退出登录前调用；不经过统一拦截器，失败时不提示、不触发重新登录
 */
export async function closeMessageStream(token: null | string) {
  if (!token) {
    return;
  }
  await baseRequestClient.get(`${MESSAGE_STREAM_PATH}/close`, {
    headers: {
      Authorization: formatToken(token),
      clientid: CLIENT_ID,
      'Content-Language': contentLanguage(),
    },
    timeout: 3000,
  });
}
