/**
 * Code 128 条码的编码（纯函数，不依赖第三方库）：字符集 B（可打印的 ASCII 32 ~ 126）与字符集 C（两位数字一个符号），
 * 连续数字较多时切换到字符集 C 以缩短条码。输出条与空的宽度序列（以模块为单位），由调用方画成 SVG。
 *
 * 每个符号由 3 条 3 空共 6 个元素组成，总宽 11 个模块；终止符多一条，总宽 13 个模块。
 * 校验位 = (起始符的值 + Σ 第 i 个符号的值 × i) mod 103，i 从 1 开始，含字符集切换符。
 */

/** 107 个符号（值 0 ~ 106）的条空宽度，依次为条、空、条、空、条、空（终止符 106 为 7 个元素） */
export const CODE128_PATTERNS: readonly string[] = [
  '212222',
  '222122',
  '222221',
  '121223',
  '121322',
  '131222',
  '122213',
  '122312',
  '132212',
  '221213',
  '221312',
  '231212',
  '112232',
  '122132',
  '122231',
  '113222',
  '123122',
  '123221',
  '223211',
  '221132',
  '221231',
  '213212',
  '223112',
  '312131',
  '311222',
  '321122',
  '321221',
  '312212',
  '322112',
  '322211',
  '212123',
  '212321',
  '232121',
  '111323',
  '131123',
  '131321',
  '112313',
  '132113',
  '132311',
  '211313',
  '231113',
  '231311',
  '112133',
  '112331',
  '132131',
  '113123',
  '113321',
  '133121',
  '313121',
  '211331',
  '231131',
  '213113',
  '213311',
  '213131',
  '311123',
  '311321',
  '331121',
  '312113',
  '312311',
  '332111',
  '314111',
  '221411',
  '431111',
  '111224',
  '111422',
  '121124',
  '121421',
  '141122',
  '141221',
  '112214',
  '112412',
  '122114',
  '122411',
  '142112',
  '142211',
  '241211',
  '221114',
  '413111',
  '241112',
  '134111',
  '111242',
  '121142',
  '121241',
  '114212',
  '124112',
  '124211',
  '411212',
  '421112',
  '421211',
  '212141',
  '214121',
  '412121',
  '111143',
  '111341',
  '131141',
  '114113',
  '114311',
  '411113',
  '411311',
  '113141',
  '114131',
  '311141',
  '411131',
  '211412',
  '211214',
  '211232',
  '2331112',
];

const START_B = 104;
const START_C = 105;
/** 字符集 B 中切换到 C */
const CODE_C = 99;
/** 字符集 C 中切换到 B */
const CODE_B = 100;
const STOP = 106;

/** 条码两侧的静区宽度（模块数），规范要求至少 10 个模块 */
export const CODE128_QUIET_ZONE = 10;

/** 内容中有 Code 128 B/C 无法表示的字符（例如中文、控制字符） */
export class Code128Error extends Error {
  constructor(text: string) {
    super(`Code 128 不支持的内容：${text}`);
    this.name = 'Code128Error';
  }
}

function isDigit(char: string) {
  return char >= '0' && char <= '9';
}

/** 从 index 开始的连续数字个数 */
function digitRun(text: string, index: number) {
  let end = index;
  while (end < text.length && isDigit(text.charAt(end))) {
    end++;
  }
  return end - index;
}

/**
 * 编码为符号值：起始符、数据（含字符集切换）、校验位、终止符。
 * 字符集的选择：开头有至少 4 个连续数字（或全部是偶数个数字）时用 C 开始；用 B 编码时遇到至少 6 个连续数字
 * （在末尾时至少 4 个）切换到 C，按偶数个数字编码后切回 B。
 *
 * @throws Code128Error 内容为空或有无法表示的字符
 */
export function encodeCode128(text: string): number[] {
  if (text.length === 0) {
    throw new Code128Error(text);
  }
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 32 || code > 126) {
      throw new Code128Error(text);
    }
  }
  const values: number[] = [];
  let index = 0;
  const leading = digitRun(text, 0);
  let setC = leading >= 4 || (leading === text.length && leading % 2 === 0);
  values.push(setC ? START_C : START_B);
  while (index < text.length) {
    if (setC) {
      if (digitRun(text, index) >= 2) {
        values.push(Number(text.slice(index, index + 2)));
        index += 2;
        continue;
      }
      values.push(CODE_B);
      setC = false;
      continue;
    }
    const run = digitRun(text, index);
    const atEnd = index + run === text.length;
    if (run >= 6 || (atEnd && run >= 4)) {
      // 奇数个数字时先用 B 编码一个，余下的偶数个用 C
      if (run % 2 === 1) {
        values.push((text.codePointAt(index) ?? 32) - 32);
        index++;
      }
      values.push(CODE_C);
      setC = true;
      continue;
    }
    values.push((text.codePointAt(index) ?? 32) - 32);
    index++;
  }
  values.push(checksum(values), STOP);
  return values;
}

/** 校验位：起始符的值 + Σ 符号值 × 位置（从 1 开始），对 103 取模 */
export function checksum(values: readonly number[]): number {
  let sum = values[0] ?? 0;
  for (let i = 1; i < values.length; i++) {
    sum += (values[i] ?? 0) * i;
  }
  return sum % 103;
}

/** 条与空的宽度序列（模块数），第一个是条；不含静区 */
export function code128Widths(text: string): number[] {
  return encodeCode128(text).flatMap((value) =>
    [...(CODE128_PATTERNS[value] ?? '')].map(Number),
  );
}

/** 一个条：起点与宽度（模块数，已含左侧静区） */
export interface Code128Bar {
  width: number;
  x: number;
}

/** 画条码所需的数据：各个条的位置与总宽度（含两侧静区，单位为模块） */
export interface Code128Layout {
  bars: Code128Bar[];
  totalWidth: number;
}

/**
 * 条的位置：从左侧静区之后开始，条与空交替排列，只返回条
 *
 * @param quietZone 两侧静区的模块数
 */
export function code128Layout(
  text: string,
  quietZone: number = CODE128_QUIET_ZONE,
): Code128Layout {
  const widths = code128Widths(text);
  const bars: Code128Bar[] = [];
  let x = quietZone;
  widths.forEach((width, i) => {
    if (i % 2 === 0) {
      bars.push({ width, x });
    }
    x += width;
  });
  return { bars, totalWidth: x + quietZone };
}
