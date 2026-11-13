import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAutoRefresh } from '../use-auto-refresh';

describe('自动刷新', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('按间隔刷新，停止后不刷新', async () => {
    const refresh = vi.fn();
    const controller = createAutoRefresh({
      interval: 30_000,
      isHidden: () => false,
      refresh,
    });

    controller.start();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(refresh).toHaveBeenCalledTimes(2);

    controller.stop();
    expect(controller.running()).toBe(false);
    await vi.advanceTimersByTimeAsync(90_000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('页面不可见时暂停，重新可见时立即刷新并继续', async () => {
    let hidden = false;
    const refresh = vi.fn();
    const controller = createAutoRefresh({
      interval: 30_000,
      isHidden: () => hidden,
      refresh,
    });
    controller.start();

    hidden = true;
    controller.onHidden();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(refresh).not.toHaveBeenCalled();

    hidden = false;
    controller.onVisible();
    await vi.advanceTimersByTimeAsync(0);
    expect(refresh).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('页面一开始就不可见时不启动定时', () => {
    const controller = createAutoRefresh({
      isHidden: () => true,
      refresh: vi.fn(),
    });
    controller.start();
    expect(controller.running()).toBe(false);
  });

  it('上一次刷新未完成时跳过；刷新失败不影响下一次', async () => {
    let finishFirst: () => void = () => {};
    const refresh = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            finishFirst = resolve;
          }),
      )
      .mockImplementationOnce(() => Promise.reject(new Error('网络错误')))
      .mockImplementation(() => Promise.resolve());
    const controller = createAutoRefresh({
      interval: 1000,
      isHidden: () => false,
      refresh,
    });
    controller.start();

    await vi.advanceTimersByTimeAsync(2000);
    expect(refresh).toHaveBeenCalledTimes(1);

    finishFirst();
    await vi.advanceTimersByTimeAsync(1000);
    expect(refresh).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(refresh).toHaveBeenCalledTimes(3);
    controller.stop();
  });
});
