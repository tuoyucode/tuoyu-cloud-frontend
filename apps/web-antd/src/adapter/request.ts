/**
 * 请求层的界面部分：用 Ant Design Vue 显示请求错误，登录失效时退出登录
 */
import { h } from 'vue';

import { setupRequestHandlers } from '@tuoyu/shared/api/request';
import { message, Typography } from 'ant-design-vue';

import { $t } from '#/locales';
import { useAuthStore } from '#/store';

/** 提示中附带 traceId 的时长（秒）：比普通提示长，鼠标悬停时不会关闭，便于复制 */
const TRACE_MESSAGE_DURATION = 8;

function showError(text: string, traceId?: string) {
  if (!traceId) {
    message.error(text);
    return;
  }
  message.error({
    content: h('span', { class: 'inline-flex flex-col items-start' }, [
      h('span', text),
      h(
        Typography.Text,
        {
          class: 'text-xs',
          copyable: { text: traceId },
          type: 'secondary',
        },
        () => $t('request.traceId', { traceId }),
      ),
    ]),
    duration: TRACE_MESSAGE_DURATION,
  });
}

export function initRequestAdapter() {
  setupRequestHandlers({
    logout: () => useAuthStore().logout(),
    showError,
  });
}
