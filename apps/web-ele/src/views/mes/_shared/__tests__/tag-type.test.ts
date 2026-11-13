import { MES_ENUMS } from '@tuoyu/shared/pages/mes/enums';
import { EQUIPMENT_ENUMS } from '@tuoyu/shared/pages/mes/equipment-enums';
import { describe, expect, it } from 'vitest';

import { tagType } from '../tag-type';

describe('语义色名映射为 Element Plus 的类型', () => {
  it('按语义映射，没有对应时为 info', () => {
    expect(tagType('default')).toBe('info');
    expect(tagType('processing')).toBe('primary');
    expect(tagType('blue')).toBe('primary');
    expect(tagType('success')).toBe('success');
    expect(tagType('green')).toBe('success');
    expect(tagType('warning')).toBe('warning');
    expect(tagType('orange')).toBe('warning');
    expect(tagType('error')).toBe('danger');
    expect(tagType('red')).toBe('danger');
    expect(tagType('gray')).toBe('info');
    expect(tagType('purple')).toBe('info');
    expect(tagType(undefined)).toBe('info');
  });

  it('状态与类型中用到的颜色都有对应的类型', () => {
    const colors = new Set(
      [...Object.values(MES_ENUMS), ...Object.values(EQUIPMENT_ENUMS)].flatMap(
        (items) => items.map((item) => item.color),
      ),
    );
    for (const color of colors) {
      expect(
        color === 'default' || tagType(color) !== 'info',
        `颜色 ${color}`,
      ).toBe(true);
    }
  });
});
