import { describe, expect, it, vi } from 'vitest';

import {
  fileExtension,
  formatFileSize,
  getFileSize,
  isImage,
  toFileQuery,
  uploadAccept,
  uploadRejection,
} from '../data';

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

describe('文件存储：上传前按服务端的限制检查', () => {
  const config = { allowedExtensions: ['jpg', 'pdf'], maxFileSize: 1024 };

  it('文件选择框的 accept 由服务端的白名单生成', () => {
    expect(uploadAccept(['jpg', 'pdf'])).toBe('.jpg,.pdf');
    expect(uploadAccept([])).toBe('');
  });

  it('扩展名不区分大小写，没有扩展名时为空', () => {
    expect(fileExtension('A.JPG')).toBe('jpg');
    expect(fileExtension('archive.tar.gz')).toBe('gz');
    expect(fileExtension('README')).toBe('');
    expect(fileExtension('.env')).toBe('');
  });

  it('类型不在白名单中或超过单个文件的上限时给出原因', () => {
    expect(
      uploadRejection({ name: 'a.jpg', size: 1024 }, config),
    ).toBeUndefined();
    expect(uploadRejection({ name: 'a.exe', size: 1 }, config)).toBe(
      'system.oss.uploadTypeNotAllowed',
    );
    expect(uploadRejection({ name: 'a.pdf', size: 1025 }, config)).toBe(
      'system.oss.uploadTooLarge',
    );
  });

  it('上限为负数时不限制大小', () => {
    expect(
      uploadRejection(
        { name: 'a.pdf', size: 10 ** 9 },
        { allowedExtensions: ['pdf'], maxFileSize: -1 },
      ),
    ).toBeUndefined();
  });
});
