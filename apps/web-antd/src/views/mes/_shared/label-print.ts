/**
 * 用隐藏的 iframe 调用浏览器打印：不打开新窗口（不受弹窗拦截影响），打印完成或取消后移除 iframe。
 * 页面内容由调用方生成（printDocument），纸张大小由其中的 @page 决定。
 */

import type { LabelTemplateApi } from '@tuoyu/shared/api/mes/labelTemplate';

/** 打开打印对话框（label-print-modal）时传入的参数 */
export interface LabelPrintRequest {
  /** 每个标签可以打印多份（批次标签） */
  allowCopies?: boolean;
  /** 读取打印数据；pickWorkorder 时传入所选的工单 */
  loader: (workorderId?: string) => Promise<LabelTemplateApi.LabelData[]>;
  /** 先选择工单再读取（按工单打印序列号） */
  pickWorkorder?: boolean;
  target: LabelTemplateApi.Target;
}

/** 打印对话框关闭后多久移除 iframe（部分浏览器不触发 afterprint） */
const CLEANUP_DELAY = 60_000;

export function printHtml(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    frame.style.visibility = 'hidden';
    document.body.append(frame);

    let removed = false;
    const remove = () => {
      if (!removed) {
        removed = true;
        frame.remove();
      }
    };

    const view = frame.contentWindow;
    const doc = frame.contentDocument ?? view?.document;
    if (!view || !doc) {
      remove();
      reject(new Error('无法创建打印页面'));
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();

    // 等待内容（含 SVG）排版完成后再打印
    const print = () => {
      view.addEventListener('afterprint', remove, { once: true });
      setTimeout(remove, CLEANUP_DELAY);
      try {
        view.focus();
        view.print();
        resolve();
      } catch (error) {
        remove();
        reject(error);
      }
    };
    if (doc.readyState === 'complete') {
      setTimeout(print, 50);
    } else {
      view.addEventListener('load', () => setTimeout(print, 50), {
        once: true,
      });
    }
  });
}
