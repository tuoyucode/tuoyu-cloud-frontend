import { describe, expect, it } from 'vitest';

import { trimDecimal, trimFixedDecimal } from '../decimal';

describe('trimDecimal', () => {
  it('去掉小数末尾多余的 0', () => {
    expect(trimDecimal('9.000000')).toBe('9');
    expect(trimDecimal('2.500000')).toBe('2.5');
    expect(trimDecimal(0.25)).toBe('0.25');
    expect(trimDecimal('-1.250')).toBe('-1.25');
  });

  it('整数与空值原样返回', () => {
    expect(trimDecimal(10)).toBe('10');
    expect(trimDecimal('100')).toBe('100');
    expect(trimDecimal(undefined)).toBe('');
    expect(trimDecimal('')).toBe('');
  });

  it('输入过程中原样显示用户键入的内容', () => {
    expect(trimDecimal('1.0', { input: '1.0', userTyping: true })).toBe('1.0');
    expect(trimDecimal('1.', { input: '1.', userTyping: true })).toBe('1.');
  });

  it('不是普通小数的内容原样返回', () => {
    expect(trimDecimal('1e-7')).toBe('1e-7');
    expect(trimDecimal('abc')).toBe('abc');
  });
});

describe('trimFixedDecimal', () => {
  const format = trimFixedDecimal(6);

  it('失去焦点后按 precision 补齐的显示去掉末尾多余的 0', () => {
    expect(format('9.000000')).toBe('9');
    expect(format('2.500000')).toBe('2.5');
    expect(trimFixedDecimal(4)('1.2500')).toBe('1.25');
  });

  it('键入中的内容原样显示，不打断输入', () => {
    expect(format('1.')).toBe('1.');
    expect(format('1.0')).toBe('1.0');
    expect(format('2.05')).toBe('2.05');
    expect(format('1.10')).toBe('1.10');
  });

  it('整数与空值', () => {
    expect(format('12')).toBe('12');
    expect(format(12)).toBe('12');
    expect(format('')).toBe('');
    expect(format(undefined)).toBe('');
  });
});
