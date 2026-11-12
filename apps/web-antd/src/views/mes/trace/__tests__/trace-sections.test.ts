import { describe, expect, it, vi } from 'vitest';

import enUS from '#/locales/langs/en-US/mes/trace.json';
import zhCN from '#/locales/langs/zh-CN/mes/trace.json';

import { deniedSectionsText, TRACE_SECTIONS } from '../data';

vi.mock('#/locales', async () => {
  const module = await import('#/locales/langs/zh-CN/mes/trace.json');
  const zh = module.default as Record<string, unknown>;
  return {
    // mes.trace.<键>[.<子键>] → 中文文案；没有时返回键本身（与 vue-i18n 一致）
    $t: (key: string) => {
      let value: unknown = zh;
      for (const part of key.split('.').slice(2)) {
        value =
          value && typeof value === 'object'
            ? (value as Record<string, unknown>)[part]
            : undefined;
      }
      return typeof value === 'string' ? value : key;
    },
  };
});

describe('追溯：按段的查看权限', () => {
  it('没有权限的段按页面上的顺序列出名称', () => {
    expect(deniedSectionsText(['stockIns', 'reports', 'defects'])).toBe(
      '报工、不良、入库',
    );
  });

  it('全部有权限或后端未返回时为空串（不显示提示）', () => {
    expect(deniedSectionsText([])).toBe('');
    expect(deniedSectionsText(undefined)).toBe('');
  });

  it('每个段在中英文中都有名称，提示文案带占位符', () => {
    for (const locale of [zhCN, enUS]) {
      for (const section of TRACE_SECTIONS) {
        expect(locale.sections[section]).toBeTruthy();
      }
      expect(locale.deniedSections).toContain('{sections}');
      expect(locale.noPermission).toContain('{name}');
      expect(locale.tabDenied).toContain('{name}');
      expect(locale.sectionSeparator).toBeTruthy();
      expect(locale.quality).toBeTruthy();
    }
  });
});
