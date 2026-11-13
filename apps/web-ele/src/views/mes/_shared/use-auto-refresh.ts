import { onActivated, onBeforeUnmount, onDeactivated, onMounted } from 'vue';

/** 自动刷新的默认间隔：30 秒 */
export const AUTO_REFRESH_INTERVAL = 30_000;

export interface AutoRefreshOptions {
  /** 间隔（毫秒） */
  interval?: number;
  /** 页面当前是否不可见（默认读 document.visibilityState） */
  isHidden?: () => boolean;
  /** 刷新；返回 Promise 时，上一次没完成前不会开始下一次 */
  refresh: () => unknown;
}

/** 自动刷新的控制器：开始、停止、页面可见性变化 */
export interface AutoRefreshController {
  /** 页面重新可见：立即刷新一次并恢复定时 */
  onVisible: () => void;
  /** 页面不可见：暂停定时 */
  onHidden: () => void;
  /** 是否正在定时 */
  running: () => boolean;
  start: () => void;
  stop: () => void;
}

/**
 * 定时刷新：页面不可见时暂停，重新可见时立即刷新并继续；刷新出错只影响这一次。
 * 与 Vue 无关，便于测试；页面中用 {@link useAutoRefresh}
 */
export function createAutoRefresh(
  options: AutoRefreshOptions,
): AutoRefreshController {
  const interval = options.interval ?? AUTO_REFRESH_INTERVAL;
  const isHidden =
    options.isHidden ??
    (() =>
      typeof document !== 'undefined' && document.visibilityState === 'hidden');
  let timer: ReturnType<typeof setInterval> | undefined;
  let busy = false;

  async function tick() {
    if (busy || isHidden()) {
      return;
    }
    busy = true;
    try {
      await options.refresh();
    } catch {
      // 失败原因已由请求层提示，下一次照常刷新
    } finally {
      busy = false;
    }
  }

  function stop() {
    if (timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  }

  function start() {
    stop();
    if (!isHidden()) {
      timer = setInterval(tick, interval);
    }
  }

  return {
    onHidden: stop,
    onVisible() {
      void tick();
      start();
    },
    running: () => timer !== undefined,
    start,
    stop,
  };
}

/**
 * 页面中的自动刷新：挂载时开始；页面在标签页缓存中被切走时停止，切回时立即刷新一次再继续；
 * 卸载时停止并清理定时器与事件监听
 */
export function useAutoRefresh(
  refresh: () => unknown,
  interval: number = AUTO_REFRESH_INTERVAL,
): AutoRefreshController {
  const controller = createAutoRefresh({ interval, refresh });
  let active = false;
  let wasDeactivated = false;

  function onVisibilityChange() {
    if (!active) {
      return;
    }
    if (document.visibilityState === 'hidden') {
      controller.onHidden();
    } else {
      controller.onVisible();
    }
  }

  function activate(refreshNow: boolean) {
    if (active) {
      return;
    }
    active = true;
    document.addEventListener('visibilitychange', onVisibilityChange);
    if (refreshNow) {
      controller.onVisible();
    } else {
      controller.start();
    }
  }

  function deactivate() {
    active = false;
    document.removeEventListener('visibilitychange', onVisibilityChange);
    controller.stop();
  }

  onMounted(() => activate(false));
  onActivated(() => {
    if (wasDeactivated) {
      activate(true);
    }
  });
  onDeactivated(() => {
    wasDeactivated = true;
    deactivate();
  });
  onBeforeUnmount(deactivate);
  return controller;
}
