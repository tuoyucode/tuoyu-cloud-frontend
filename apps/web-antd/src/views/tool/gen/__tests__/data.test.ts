import { describe, expect, it, vi } from 'vitest';

import {
  downloadFileName,
  templateLabel,
  templateLanguage,
  toQuery,
} from '../data';

vi.mock('#/locales', () => ({ $t: (key: string) => key }));

describe('代码生成：列表数据处理', () => {
  it('创建时间按整天转换为 params.beginTime / endTime', () => {
    expect(
      toQuery({ createTime: ['2026-10-01', '2026-10-27'], tableName: 'sys' }),
    ).toEqual({
      params: {
        beginTime: '2026-10-01 00:00:00',
        endTime: '2026-10-27 23:59:59',
      },
      tableName: 'sys',
    });
    expect(toQuery({ tableName: 'sys' })).toEqual({ tableName: 'sys' });
  });

  it('预览的文件名去掉模板根目录与 .ftl', () => {
    expect(templateLabel('fm/vben/index.vue.ftl')).toBe('vben/index.vue');
    expect(templateLabel('fm/java/domain.java.ftl')).toBe('java/domain.java');
    expect(templateLanguage('fm/vben/index.vue.ftl')).toBe('vue');
    expect(templateLanguage('fm/sql/mysql.sql.ftl')).toBe('sql');
  });

  it('下载文件名：单张表用表名，多张表用统一名称', () => {
    expect(downloadFileName([{ tableName: 'sys_post' }])).toBe('sys_post.zip');
    expect(downloadFileName([{ tableName: 'a' }, { tableName: 'b' }])).toBe(
      'tool.gen.batchFileName.zip',
    );
  });
});
