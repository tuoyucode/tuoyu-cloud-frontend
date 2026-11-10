import { describe, expect, it } from 'vitest';

import { trimDecimal } from '../decimal';

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
