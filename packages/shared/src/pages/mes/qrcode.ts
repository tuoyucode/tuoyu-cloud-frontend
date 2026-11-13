/**
 * 二维码（QR Code，ISO/IEC 18004）的编码（纯函数，不依赖第三方库）：字节模式（UTF-8），按内容长度选择最小的版本（1 ~ 40），
 * 按规范的扣分规则在 8 种掩码中选扣分最少的。输出模块矩阵（true 为深色），由调用方画成 SVG。
 *
 * 步骤：数据位流（模式、字符数、数据、终止符与填充）→ 按版本与纠错等级分块、计算 Reed-Solomon 纠错码并交织 →
 * 画定位、分隔、定时、校正图形与格式、版本信息 → 按蛇形顺序放入数据 → 掩码。
 */

/** 纠错等级：L 约 7%、M 约 15%、Q 约 25%、H 约 30% 的码字可以恢复 */
export type QrErrorLevel = 'H' | 'L' | 'M' | 'Q';

/** 编码结果：边长（模块数，不含静区）与模块矩阵 modules[行][列] */
export interface QrCode {
  mask: number;
  modules: boolean[][];
  size: number;
  version: number;
}

/** 二维码两侧的静区宽度（模块数），规范要求至少 4 个模块 */
export const QR_QUIET_ZONE = 4;

/** 内容超出版本 40 的容量 */
export class QrCodeError extends Error {
  constructor(length: number) {
    super(`二维码内容过长：${length} 字节`);
    this.name = 'QrCodeError';
  }
}

const LEVEL_INDEX: Record<QrErrorLevel, number> = { H: 3, L: 0, M: 1, Q: 2 };

/** 格式信息中纠错等级的编码 */
const LEVEL_FORMAT_BITS: Record<QrErrorLevel, number> = {
  H: 2,
  L: 1,
  M: 0,
  Q: 3,
};

/** 每块的纠错码字数，按纠错等级 L、M、Q、H 与版本（下标 0 不用） */
const ECC_CODEWORDS_PER_BLOCK: readonly (readonly number[])[] = [
  [
    -1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30,
    28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
    30, 30, 30,
  ],
  [
    -1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26,
    26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
    28, 28, 28,
  ],
  [
    -1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28,
    26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
    30, 30, 30,
  ],
  [
    -1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28,
    26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
    30, 30, 30,
  ],
];

/** 纠错块数，按纠错等级 L、M、Q、H 与版本（下标 0 不用） */
const ECC_BLOCKS: readonly (readonly number[])[] = [
  [
    -1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10,
    12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25,
  ],
  [
    -1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17,
    17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49,
  ],
  [
    -1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23,
    23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68,
  ],
  [
    -1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25,
    25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77,
    81,
  ],
];

const MIN_VERSION = 1;
const MAX_VERSION = 40;

/** 字节模式的模式指示符 */
const MODE_BYTE = 0b0100;

/**
 * 常数写成十进制：GF(2^8) 的本原多项式 0x11D、填充码字 0xEC 与 0x11、
 * 格式信息的生成多项式 0x537 与掩码 0x5412、版本信息的生成多项式 0x1F25
 */
const GF_POLYNOMIAL = 285;
const PAD_1 = 236;
const PAD_2 = 17;
const FORMAT_GENERATOR = 1335;
const FORMAT_MASK = 21_522;
const VERSION_GENERATOR = 7973;

/** 扣分规则的权重：连续同色、2×2 同色块、类似定位图形、深浅比例 */
const PENALTY_N1 = 3;
const PENALTY_N2 = 3;
const PENALTY_N3 = 40;
const PENALTY_N4 = 10;

function bit(value: number, index: number) {
  return ((value >>> index) & 1) !== 0;
}

/** 一个版本中可放数据与纠错码的模块数（去掉功能图形与格式、版本信息） */
function rawDataModules(version: number) {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const align = Math.floor(version / 7) + 2;
    result -= (25 * align - 10) * align - 55;
    if (version >= 7) {
      result -= 36;
    }
  }
  return result;
}

/** 一个版本、纠错等级下的数据码字数 */
export function dataCodewords(version: number, level: QrErrorLevel) {
  const index = LEVEL_INDEX[level];
  return (
    Math.floor(rawDataModules(version) / 8) -
    (ECC_CODEWORDS_PER_BLOCK[index]?.[version] ?? 0) *
      (ECC_BLOCKS[index]?.[version] ?? 0)
  );
}

/** 字节模式的字符数位数：版本 1 ~ 9 为 8 位，之后为 16 位 */
function countBits(version: number) {
  return version <= 9 ? 8 : 16;
}

/** GF(2^8) 上的乘法，本原多项式 x^8 + x^4 + x^3 + x^2 + 1 */
function gfMultiply(x: number, y: number) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * GF_POLYNOMIAL);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

/** Reed-Solomon 生成多项式（不含最高次项的系数，从高次到低次） */
function rsDivisor(degree: number): number[] {
  const result: number[] = Array.from({ length: degree }, () => 0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMultiply(result[j] ?? 0, root);
      if (j + 1 < degree) {
        result[j] = (result[j] ?? 0) ^ (result[j + 1] ?? 0);
      }
    }
    root = gfMultiply(root, 2);
  }
  return result;
}

/** 数据码字的 Reed-Solomon 纠错码字 */
export function rsRemainder(data: readonly number[], degree: number): number[] {
  const divisor = rsDivisor(degree);
  const result: number[] = Array.from({ length: degree }, () => 0);
  for (const byte of data) {
    const factor = byte ^ (result.shift() ?? 0);
    result.push(0);
    divisor.forEach((coefficient, i) => {
      result[i] = (result[i] ?? 0) ^ gfMultiply(coefficient, factor);
    });
  }
  return result;
}

/** 数据码字：模式、字符数、数据、终止符，补齐到整字节后用 0xEC、0x11 交替填充 */
function encodeData(
  bytes: readonly number[],
  version: number,
  capacity: number,
) {
  const bits: number[] = [];
  const append = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) {
      bits.push((value >>> i) & 1);
    }
  };
  append(MODE_BYTE, 4);
  append(bytes.length, countBits(version));
  for (const byte of bytes) {
    append(byte, 8);
  }
  const capacityBits = capacity * 8;
  append(0, Math.min(4, capacityBits - bits.length));
  append(0, (8 - (bits.length % 8)) % 8);
  for (let pad = PAD_1; bits.length < capacityBits; pad ^= PAD_1 ^ PAD_2) {
    append(pad, 8);
  }
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let value = 0;
    for (let j = 0; j < 8; j++) {
      value = (value << 1) | (bits[i + j] ?? 0);
    }
    codewords.push(value);
  }
  return codewords;
}

/** 分块、计算纠错码并交织：先依次取各块的数据码字，再依次取各块的纠错码字 */
function addEccAndInterleave(
  data: readonly number[],
  version: number,
  level: QrErrorLevel,
) {
  const index = LEVEL_INDEX[level];
  const blockCount = ECC_BLOCKS[index]?.[version] ?? 1;
  const eccLength = ECC_CODEWORDS_PER_BLOCK[index]?.[version] ?? 0;
  const rawCodewords = Math.floor(rawDataModules(version) / 8);
  const shortBlocks = blockCount - (rawCodewords % blockCount);
  const shortLength = Math.floor(rawCodewords / blockCount);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < blockCount; i++) {
    const block = data.slice(
      k,
      k + shortLength - eccLength + (i < shortBlocks ? 0 : 1),
    );
    k += block.length;
    const ecc = rsRemainder(block, eccLength);
    if (i < shortBlocks) {
      // 短块在数据末尾占一个空位，交织时跳过
      block.push(0);
    }
    blocks.push([...block, ...ecc]);
  }
  const result: number[] = [];
  const length = blocks[0]?.length ?? 0;
  for (let i = 0; i < length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortLength - eccLength || j >= shortBlocks) {
        result.push(block[i] ?? 0);
      }
    });
  }
  return result;
}

/** 校正图形中心的行列坐标 */
function alignmentPositions(version: number): number[] {
  if (version === 1) {
    return [];
  }
  const count = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const step =
    version === 32 ? 26 : Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const result = [6];
  for (let position = size - 7; result.length < count; position -= step) {
    result.splice(1, 0, position);
  }
  return result;
}

/** 第 mask 种掩码在 (x, y) 处是否取反 */
function maskHit(mask: number, x: number, y: number) {
  switch (mask) {
    case 0: {
      return (x + y) % 2 === 0;
    }
    case 1: {
      return y % 2 === 0;
    }
    case 2: {
      return x % 3 === 0;
    }
    case 3: {
      return (x + y) % 3 === 0;
    }
    case 4: {
      return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    }
    case 5: {
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    }
    case 6: {
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    }
    default: {
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
    }
  }
}

class Matrix {
  readonly functions: boolean[][];
  readonly modules: boolean[][];
  readonly size: number;
  readonly version: number;

  constructor(version: number) {
    this.version = version;
    this.size = version * 4 + 17;
    this.modules = Array.from({ length: this.size }, () =>
      Array.from({ length: this.size }, () => false),
    );
    this.functions = Array.from({ length: this.size }, () =>
      Array.from({ length: this.size }, () => false),
    );
  }

  /** 掩码只作用于数据模块；再次调用同一掩码即还原 */
  applyMask(mask: number) {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (!this.functions[y]?.[x] && maskHit(mask, x, y)) {
          const row = this.modules[y] as boolean[];
          row[x] = !row[x];
        }
      }
    }
  }

  /** 按蛇形顺序放入数据：从右下角开始每两列一组上下往返，跳过定时图形所在的第 6 列 */
  drawCodewords(data: readonly number[]) {
    const { size } = this;
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) {
        right = 5;
      }
      for (let vertical = 0; vertical < size; vertical++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? size - 1 - vertical : vertical;
          if (!this.functions[y]?.[x] && i < data.length * 8) {
            (this.modules[y] as boolean[])[x] = bit(
              data[i >>> 3] ?? 0,
              7 - (i & 7),
            );
            i++;
          }
        }
      }
    }
  }

  /** 格式信息：纠错等级与掩码，BCH(15,5) 编码后异或 0x5412，左上一份、右上与左下拆成一份 */
  drawFormatBits(mask: number, level: QrErrorLevel) {
    const data = (LEVEL_FORMAT_BITS[level] << 3) | mask;
    let remainder = data;
    for (let i = 0; i < 10; i++) {
      remainder = (remainder << 1) ^ ((remainder >>> 9) * FORMAT_GENERATOR);
    }
    const bits = ((data << 10) | remainder) ^ FORMAT_MASK;
    const { size } = this;
    for (let i = 0; i <= 5; i++) {
      this.setFunction(8, i, bit(bits, i));
    }
    this.setFunction(8, 7, bit(bits, 6));
    this.setFunction(8, 8, bit(bits, 7));
    this.setFunction(7, 8, bit(bits, 8));
    for (let i = 9; i < 15; i++) {
      this.setFunction(14 - i, 8, bit(bits, i));
    }
    for (let i = 0; i < 8; i++) {
      this.setFunction(size - 1 - i, 8, bit(bits, i));
    }
    for (let i = 8; i < 15; i++) {
      this.setFunction(8, size - 15 + i, bit(bits, i));
    }
    // 固定的深色模块
    this.setFunction(8, size - 8, true);
  }

  /** 画功能图形：定时、定位（含分隔）、校正图形，以及版本信息；格式信息先占位 */
  drawFunctionPatterns() {
    const { size } = this;
    for (let i = 0; i < size; i++) {
      this.setFunction(6, i, i % 2 === 0);
      this.setFunction(i, 6, i % 2 === 0);
    }
    this.drawFinder(3, 3);
    this.drawFinder(size - 4, 3);
    this.drawFinder(3, size - 4);
    const positions = alignmentPositions(this.version);
    const last = positions.length - 1;
    positions.forEach((x, i) => {
      positions.forEach((y, j) => {
        // 与三个定位图形重叠的位置不画
        if (
          !(i === 0 && j === 0) &&
          !(i === 0 && j === last) &&
          !(i === last && j === 0)
        ) {
          this.drawAlignment(x, y);
        }
      });
    });
    this.drawFormatBits(0, 'M');
    this.drawVersion();
  }

  /** 版本信息（版本 7 起）：BCH(18,6) 编码，右上与左下各一份 */
  drawVersion() {
    if (this.version < 7) {
      return;
    }
    let remainder = this.version;
    for (let i = 0; i < 12; i++) {
      remainder = (remainder << 1) ^ ((remainder >>> 11) * VERSION_GENERATOR);
    }
    const bits = (this.version << 12) | remainder;
    for (let i = 0; i < 18; i++) {
      const dark = bit(bits, i);
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.setFunction(a, b, dark);
      this.setFunction(b, a, dark);
    }
  }

  /** 扣分：连续 5 个以上同色、2×2 同色块、类似定位图形的 1:1:3:1:1、深色比例偏离 50% */
  penalty() {
    const { modules, size } = this;
    let result = 0;
    const line = (get: (a: number, b: number) => boolean) => {
      for (let a = 0; a < size; a++) {
        let color = false;
        let run = 0;
        const history = [0, 0, 0, 0, 0, 0, 0];
        for (let b = 0; b < size; b++) {
          if (get(a, b) === color) {
            run++;
            if (run === 5) {
              result += PENALTY_N1;
            } else if (run > 5) {
              result++;
            }
          } else {
            this.addHistory(run, history);
            if (!color) {
              result += this.finderLike(history) * PENALTY_N3;
            }
            color = get(a, b);
            run = 1;
          }
        }
        result += this.terminateHistory(color, run, history) * PENALTY_N3;
      }
    };
    line((y, x) => modules[y]?.[x] ?? false);
    line((x, y) => modules[y]?.[x] ?? false);
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const color = modules[y]?.[x];
        if (
          color === modules[y]?.[x + 1] &&
          color === modules[y + 1]?.[x] &&
          color === modules[y + 1]?.[x + 1]
        ) {
          result += PENALTY_N2;
        }
      }
    }
    const dark = modules.reduce(
      (sum, row) => sum + row.filter(Boolean).length,
      0,
    );
    const total = size * size;
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    return result + k * PENALTY_N4;
  }

  private addHistory(run: number, history: number[]) {
    // 第一段前面视为有一圈浅色的静区
    const length = history[0] === 0 ? run + this.size : run;
    history.pop();
    history.unshift(length);
  }

  private drawAlignment(x: number, y: number) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.setFunction(
          x + dx,
          y + dy,
          Math.max(Math.abs(dx), Math.abs(dy)) !== 1,
        );
      }
    }
  }

  /** 定位图形与外圈一个模块的浅色分隔 */
  private drawFinder(x: number, y: number) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size) {
          this.setFunction(xx, yy, distance !== 2 && distance !== 4);
        }
      }
    }
  }

  /** 最近的几段是否构成 1:1:3:1:1 且一侧有 4 倍宽的浅色 */
  private finderLike(history: readonly number[]) {
    const n = history[1] ?? 0;
    const core =
      n > 0 &&
      history[2] === n &&
      history[3] === n * 3 &&
      history[4] === n &&
      history[5] === n;
    const h0 = history[0] ?? 0;
    const h6 = history[6] ?? 0;
    return (
      (core && h0 >= n * 4 && h6 >= n ? 1 : 0) +
      (core && h6 >= n * 4 && h0 >= n ? 1 : 0)
    );
  }

  private setFunction(x: number, y: number, dark: boolean) {
    (this.modules[y] as boolean[])[x] = dark;
    (this.functions[y] as boolean[])[x] = true;
  }

  /** 一行结束：末尾视为接上一圈浅色的静区 */
  private terminateHistory(color: boolean, run: number, history: number[]) {
    let length = run;
    if (color) {
      this.addHistory(length, history);
      length = 0;
    }
    this.addHistory(length + this.size, history);
    return this.finderLike(history);
  }
}

/**
 * 编码为模块矩阵
 *
 * @param text 内容，按 UTF-8 编码
 * @param level 纠错等级，默认 M
 * @param mask 指定掩码（0 ~ 7）；不指定时按扣分规则选择
 * @throws QrCodeError 内容超出版本 40 的容量
 */
export function encodeQrCode(
  text: string,
  level: QrErrorLevel = 'M',
  mask?: number,
): QrCode {
  const bytes = [...new TextEncoder().encode(text)];
  let version = MIN_VERSION;
  for (; version <= MAX_VERSION; version++) {
    const needed = 4 + countBits(version) + bytes.length * 8;
    if (needed <= dataCodewords(version, level) * 8) {
      break;
    }
  }
  if (version > MAX_VERSION) {
    throw new QrCodeError(bytes.length);
  }
  const data = encodeData(bytes, version, dataCodewords(version, level));
  const matrix = new Matrix(version);
  matrix.drawFunctionPatterns();
  matrix.drawCodewords(addEccAndInterleave(data, version, level));

  let chosen = mask ?? -1;
  if (chosen < 0) {
    let best = Number.POSITIVE_INFINITY;
    for (let candidate = 0; candidate < 8; candidate++) {
      matrix.applyMask(candidate);
      matrix.drawFormatBits(candidate, level);
      const penalty = matrix.penalty();
      if (penalty < best) {
        best = penalty;
        chosen = candidate;
      }
      matrix.applyMask(candidate);
    }
  }
  matrix.applyMask(chosen);
  matrix.drawFormatBits(chosen, level);
  return {
    mask: chosen,
    modules: matrix.modules,
    size: matrix.size,
    version,
  };
}

/**
 * SVG 路径：每个深色模块一个 1×1 的方块（坐标已含静区）
 *
 * @param quietZone 四周静区的模块数
 */
export function qrCodePath(code: QrCode, quietZone: number = QR_QUIET_ZONE) {
  const parts: string[] = [];
  code.modules.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) {
        parts.push(`M${x + quietZone} ${y + quietZone}h1v1h-1z`);
      }
    });
  });
  return parts.join('');
}
