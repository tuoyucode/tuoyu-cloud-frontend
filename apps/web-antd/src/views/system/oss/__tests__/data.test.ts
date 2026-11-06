import { describe, expect, it, vi } from 'vitest';

import { formatFileSize, getFileSize, isImage, toFileQuery } from '../data';

vi.mock('#/locales', () => ({ $t: (key: string) => key }));

describe('文件存储：列表数据处理', () => {
  it('按后缀判断图片，不区分大小写', () => {
    expect(isImage({ fileSuffix: '.PNG' })).toBe(true);
    expect(isImage({ fileSuffix: '.webp' })).toBe(true);
    expect(isImage({ fileSuffix: '.pdf' })).toBe(false);
    expect(isImage({ fileSuffix: '' })).toBe(false);
  });

  it('从扩展信息中读取文件大小，格式不对时忽略', () => {
    expect(getFileSize({ ext1: '{"fileSize":2048}' })).toBe(2048);
    expect(getFileSize({ ext1: '{"fileSize":"2048"}' })).toBeUndefined();
    expect(getFileSize({ ext1: 'not json' })).toBeUndefined();
    expect(getFileSize({})).toBeUndefined();
  });

  it('文件大小格式化', () => {
    expect(formatFileSize(undefined)).toBe('');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536 * 1024)).toBe('1.5 MB');
    expect(formatFileSize(50 * 1024 * 1024 * 1024)).toBe('50 GB');
  });

  it('上传时间按整天转换为后端的 params 参数', () => {
    expect(
      toFileQuery({
        createTime: ['2026-10-01', '2026-10-27'],
        originalName: 'a',
      }),
    ).toEqual({
      originalName: 'a',
      'params[beginCreateTime]': '2026-10-01 00:00:00',
      'params[endCreateTime]': '2026-10-27 23:59:59',
    });
    expect(toFileQuery({ service: 'minio' })).toEqual({ service: 'minio' });
  });
});
