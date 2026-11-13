import { describe, expect, it } from 'vitest';

import {
  dataCodewords,
  encodeQrCode,
  QR_QUIET_ZONE,
  QrCodeError,
  qrCodePath,
  rsRemainder,
} from '../qrcode';

/** 读取左上角的格式信息（15 位，已去掉 0x5412 掩码）：纠错等级与掩码 */
function readFormat(modules: boolean[][]) {
  let bits = 0;
  const positions: [number, number][] = [
    [8, 0],
    [8, 1],
    [8, 2],
    [8, 3],
    [8, 4],
    [8, 5],
    [8, 7],
    [8, 8],
    [7, 8],
    [5, 8],
    [4, 8],
    [3, 8],
    [2, 8],
    [1, 8],
    [0, 8],
  ];
  positions.forEach(([x, y], i) => {
    if (modules[y]?.[x]) {
      bits |= 1 << i;
    }
  });
  const data = (bits ^ 21_522) >>> 10;
  return { level: data >>> 3, mask: data & 7 };
}

/** 左上、右上、左下三个定位图形（7×7，外框深色、内圈浅色、中心 3×3 深色） */
function hasFinders(modules: boolean[][], size: number) {
  const finder = (left: number, top: number) => {
    for (let dy = 0; dy < 7; dy++) {
      for (let dx = 0; dx < 7; dx++) {
        const ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
        if (modules[top + dy]?.[left + dx] !== (ring !== 2)) {
          return false;
        }
      }
    }
    return true;
  };
  return finder(0, 0) && finder(size - 7, 0) && finder(0, size - 7);
}

describe('二维码的编码', () => {
  it('纠错码（Reed-Solomon）与规范示例一致（版本 1-M）', () => {
    const data = [
      16, 32, 12, 86, 97, 128, 236, 17, 236, 17, 236, 17, 236, 17, 236, 17,
    ];
    expect(rsRemainder(data, 10)).toEqual([
      165, 36, 212, 193, 237, 54, 199, 135, 44, 85,
    ]);
  });

  it('数据容量：版本 1、10、40 的 M 级数据码字数', () => {
    expect(dataCodewords(1, 'M')).toBe(16);
    expect(dataCodewords(10, 'M')).toBe(216);
    expect(dataCodewords(40, 'M')).toBe(2334);
    expect(dataCodewords(40, 'L')).toBe(2956);
    expect(dataCodewords(1, 'H')).toBe(9);
  });

  it('按字节数选择最小的版本，超出版本 40 时报错', () => {
    expect(encodeQrCode('a'.repeat(14)).version).toBe(1);
    expect(encodeQrCode('a'.repeat(15)).version).toBe(2);
    expect(encodeQrCode('a'.repeat(2331)).version).toBe(40);
    expect(() => encodeQrCode('a'.repeat(2332))).toThrow(QrCodeError);
    // 中文按 UTF-8 每字 3 字节
    expect(encodeQrCode('批'.repeat(5)).version).toBe(2);
  });

  it('边长为 4 × 版本 + 17，有三个定位图形，格式信息记录纠错等级与掩码', () => {
    for (const [text, level] of [
      ['SN202611120001', 'M'],
      ['https://example.com/mes/sn/1', 'H'],
      ['x'.repeat(300), 'L'],
    ] as const) {
      const code = encodeQrCode(text, level);
      expect(code.size).toBe(code.version * 4 + 17);
      expect(code.modules).toHaveLength(code.size);
      expect(hasFinders(code.modules, code.size)).toBe(true);
      expect(readFormat(code.modules)).toEqual({
        level: { H: 2, L: 1, M: 0, Q: 3 }[level],
        mask: code.mask,
      });
      // 左下定位图形右上方固定的深色模块
      expect(code.modules[code.size - 8]?.[8]).toBe(true);
    }
  });

  it('可以指定掩码；不指定时结果固定', () => {
    expect(encodeQrCode('LOT-1', 'M', 5).mask).toBe(5);
    const first = encodeQrCode('LOT-1');
    expect(encodeQrCode('LOT-1')).toEqual(first);
  });

  it('画成 SVG 的路径：每个深色模块一个方块，坐标含静区', () => {
    const code = encodeQrCode('A');
    const path = qrCodePath(code);
    const dark = code.modules.flat().filter(Boolean).length;
    expect(path.match(/M/g)).toHaveLength(dark);
    expect(path.startsWith(`M${QR_QUIET_ZONE} ${QR_QUIET_ZONE}h1v1h-1z`)).toBe(
      true,
    );
  });
});
