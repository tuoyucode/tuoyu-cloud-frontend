/**
 * 请求层的界面部分：用 Element Plus 显示请求错误，登录失效时退出登录
 */
import { h } from 'vue';

import { setupRequestHandlers } from '@tuoyu/shared/api/request';
import { ElButton, ElMessage } from 'element-plus';

import { $t } from '#/locales';
import { useAuthStore } from '#/store';

/** 提示中附带 traceId 的时长（毫秒）：比普通提示长，并可手动关闭，便于复制 */
const TRACE_MESSAGE_DURATION = 8000;

async function copyTraceId(traceId: string) {
  try {
    await navigator.clipboard.writeText(traceId);
    ElMessage.success($t('request.traceIdCopied'));
  } catch {
    // 浏览器不允许写剪贴板（例如非 HTTPS）时，用户仍可从提示中手动选取
  }
}

function showError(text: string, traceId?: string) {
  if (!traceId) {
    ElMessage.error(text);
    return;
  }
  ElMessage({
    duration: TRACE_MESSAGE_DURATION,
    message: h('span', { class: 'inline-flex flex-col items-start gap-0.5' }, [
      h('span', text),
      h('span', { class: 'inline-flex items-center gap-2 text-xs' }, [
        h(
          'span',
          { class: 'select-all text-muted-foreground' },
          $t('request.traceId', { traceId }),
        ),
        h(
          ElButton,
          {
            link: true,
            onClick: () => copyTraceId(traceId),
            size: 'small',
            type: 'primary',
          },
          () => $t('request.copyTraceId'),
        ),
      ]),
    ]),
    showClose: true,
    type: 'error',
  });
}

export function initRequestAdapter() {
  setupRequestHandlers({
    logout: () => useAuthStore().logout(),
    showError,
  });
}
