import { describe, expect, it } from 'vitest';

import {
  checksum,
  CODE128_PATTERNS,
  CODE128_QUIET_ZONE,
  Code128Error,
  code128Layout,
  code128Widths,
  encodeCode128,
} from '../code128';

describe('一维码 Code 128 的编码', () => {
  it('符号表：107 个符号互不相同，每个 11 个模块，终止符 13 个模块', () => {
    expect(CODE128_PATTERNS).toHaveLength(107);
    expect(new Set(CODE128_PATTERNS).size).toBe(107);
    CODE128_PATTERNS.forEach((pattern, value) => {
      const modules = [...pattern].reduce(
        (sum, digit) => sum + Number(digit),
        0,
      );
      expect(modules, `符号 ${value}`).toBe(value === 106 ? 13 : 11);
      expect(pattern).toHaveLength(value === 106 ? 7 : 6);
    });
    // 起始符 B、C 与终止符
    expect(CODE128_PATTERNS[104]).toBe('211214');
    expect(CODE128_PATTERNS[105]).toBe('211232');
    expect(CODE128_PATTERNS[106]).toBe('2331112');
  });

  it('字符集 B：Wikipedia（校验位 88）', () => {
    expect(encodeCode128('Wikipedia')).toEqual([
      104, 55, 73, 75, 73, 80, 69, 68, 73, 65, 88, 106,
    ]);
  });

  it('全部为偶数个数字时用字符集 C：1234 → 12、34，校验位 82', () => {
    expect(encodeCode128('1234')).toEqual([105, 12, 34, 82, 106]);
    // 条空宽度：起始符 C、12、34、校验位 82、终止符
    expect(code128Widths('1234')).toEqual(
      [...'211232', ...'112232', ...'131123', ...'121241', ...'2331112'].map(
        Number,
      ),
    );
  });

  it('字母后有连续 6 个数字时切换到字符集 C', () => {
    // B 起始，A、B，切到 C（99），12、34、56；校验位 (104 + 33 + 34×2 + 99×3 + 12×4 + 34×5 + 56×6) mod 103 = 26
    expect(encodeCode128('AB123456')).toEqual([
      104, 33, 34, 99, 12, 34, 56, 26, 106,
    ]);
  });

  it('奇数个数字：先用字符集 B 编一个，其余用 C；开头数字较多时从 C 开始，在字母前切回 B', () => {
    const sn = [104, 51, 46, 17, 99, 23, 45];
    expect(encodeCode128('SN12345')).toEqual([...sn, checksum(sn), 106]);
    const batch = [105, 20, 26, 11, 100, 33];
    expect(encodeCode128('202611A')).toEqual([...batch, checksum(batch), 106]);
  });

  it('数字较少时保持字符集 B', () => {
    const values = [104, 33, 17, 18, 34];
    expect(encodeCode128('A12B')).toEqual([...values, checksum(values), 106]);
  });

  it('空内容与 B、C 之外的字符（中文、控制字符）不能编码', () => {
    expect(() => encodeCode128('')).toThrow(Code128Error);
    expect(() => encodeCode128('批次01')).toThrow(Code128Error);
    expect(() => encodeCode128('A\tB')).toThrow(Code128Error);
  });

  it('条的位置：从静区之后开始，条空交替，总宽含两侧静区', () => {
    const layout = code128Layout('1234');
    const widths = code128Widths('1234');
    const modules = widths.reduce((sum, width) => sum + width, 0);
    expect(modules).toBe(11 * 4 + 13);
    expect(layout.totalWidth).toBe(modules + CODE128_QUIET_ZONE * 2);
    expect(layout.bars[0]).toEqual({ width: 2, x: CODE128_QUIET_ZONE });
    // 起始符 C 为 211232：第二个条在 2 + 1 个模块之后
    expect(layout.bars[1]).toEqual({ width: 1, x: CODE128_QUIET_ZONE + 3 });
    expect(layout.bars).toHaveLength(Math.ceil(widths.length / 2));
  });
});
