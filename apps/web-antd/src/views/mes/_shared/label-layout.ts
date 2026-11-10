/**
 * 标签的排版计算（纯函数）：按模板的标签尺寸（毫米）、每行列数与显示的字段，算出每页（一行标签）的尺寸、
 * 条码区与文字区的大小、字号，以及打印页的样式。单位一律为毫米，打印时按 @page 设置纸张大小。
 *
 * 打印方式按标签打印机的习惯：一行标签为一页（卷纸上每行有几列标签），页宽 = 列数 × 标签宽 + 列间距。
 */

/** 排版需要的模板字段（与 LabelTemplateApi.Template 一致） */
export interface LabelTemplateSpec {
  barcodeType: string;
  columnCount: number;
  columnGap: number;
  fields: string[];
  paperHeight: number;
  paperWidth: number;
}

/** 一个标签的排版 */
export interface LabelLayout {
  /** 条码区（毫米）：一维码在上方占满宽度，二维码在左侧为正方形 */
  barcode: { height: number; kind: 'code128' | 'qrcode'; width: number };
  /** 每页的列数 */
  columns: number;
  /** 列间距（毫米） */
  gap: number;
  /** 标签尺寸与内边距（毫米） */
  label: { height: number; padding: number; width: number };
  /** 每页（一行标签）的尺寸（毫米） */
  page: { height: number; width: number };
  /** 文字区（毫米）：字号与行高，最多显示的行数 */
  text: { fontSize: number; height: number; lineHeight: number; width: number };
}

/** 一次最多打印的标签数（与后端一致：标签都在浏览器中排版，太多时生成与打印预览都很慢） */
export const MAX_LABELS = 500;

/** 字号的范围（毫米）：1.5 毫米约 4.3 磅，太小打印不清；4 毫米约 11 磅 */
export const MIN_FONT_MM = 1.5;
export const MAX_FONT_MM = 4;

/** 行高与字号之比 */
export const LINE_HEIGHT_RATIO = 1.25;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** 保留一位小数，避免浮点误差出现在样式中 */
function round(value: number) {
  return Math.round(value * 10) / 10;
}

/**
 * 计算标签的排版
 *
 * - 内边距：短边的 6%，在 1 ~ 3 毫米之间；
 * - 一维码：宽度占满（去掉内边距），高度为可用高度的 40%，在 5 ~ 25 毫米之间；字段在条码下方；
 * - 二维码：正方形，边长取可用高度与可用宽度的 45% 中较小的；字段在右侧；
 * - 字号：文字区高度平均分给各行，按行高比换算，在 1.5 ~ 4 毫米之间（放不下时超出部分被裁掉）。
 */
export function labelLayout(spec: LabelTemplateSpec): LabelLayout {
  const width = Math.max(1, spec.paperWidth);
  const height = Math.max(1, spec.paperHeight);
  const columns = Math.max(1, Math.floor(spec.columnCount || 1));
  const gap = Math.max(0, spec.columnGap || 0);
  const padding = round(clamp(Math.min(width, height) * 0.06, 1, 3));
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const lines = Math.max(1, spec.fields.length);

  let barcode: LabelLayout['barcode'];
  let text: Omit<LabelLayout['text'], 'fontSize' | 'lineHeight'>;
  if (spec.barcodeType === 'qrcode') {
    const side = round(Math.min(innerHeight, innerWidth * 0.45));
    barcode = { height: side, kind: 'qrcode', width: side };
    text = {
      height: round(innerHeight),
      width: round(innerWidth - side - padding),
    };
  } else {
    const barHeight = round(clamp(innerHeight * 0.4, 5, 25));
    barcode = { height: barHeight, kind: 'code128', width: round(innerWidth) };
    text = {
      height: round(Math.max(0, innerHeight - barHeight - padding)),
      width: round(innerWidth),
    };
  }
  const fontSize = round(
    clamp(text.height / (lines * LINE_HEIGHT_RATIO), MIN_FONT_MM, MAX_FONT_MM),
  );
  return {
    barcode,
    columns,
    gap,
    label: { height, padding, width },
    page: { height, width: round(columns * width + (columns - 1) * gap) },
    text: {
      ...text,
      fontSize,
      lineHeight: round(fontSize * LINE_HEIGHT_RATIO),
    },
  };
}

/** 按每页的列数把标签分成若干行（每行一页），最后一行可能不满 */
export function chunkRows<T>(items: readonly T[], columns: number): T[][] {
  const size = Math.max(1, Math.floor(columns || 1));
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

/** 每个标签打印几份（批次标签常需要多份），按原顺序依次重复 */
export function expandCopies<T>(items: readonly T[], copies: number): T[] {
  const times = Math.max(1, Math.floor(copies || 1));
  return items.flatMap((item) => Array.from({ length: times }, () => item));
}

/** 在总数不超过上限的前提下，每个标签最多能打几份 */
export function maxCopies(count: number, limit: number = MAX_LABELS): number {
  return count <= 0 ? 1 : Math.max(1, Math.floor(limit / count));
}

/** 字段的显示值：数量带单位，空值显示为空串 */
export function fieldValue(key: string, data: Record<string, unknown>): string {
  const value = data[key];
  if (value === undefined || value === null) {
    return '';
  }
  if (key === 'quantity') {
    const number = Number(value);
    const text = Number.isFinite(number) ? String(number) : String(value);
    const unit = data.unit;
    return unit ? `${text} ${String(unit)}` : text;
  }
  return String(value);
}

/**
 * 打印页的样式：纸张大小为一行标签，页边距为 0，每行之后分页；二维码组件的外框按区域缩放
 */
export function printCss(layout: LabelLayout): string {
  return [
    `@page { size: ${layout.page.width}mm ${layout.page.height}mm; margin: 0; }`,
    'html, body { margin: 0; padding: 0; background: #fff; }',
    'body { color: #000; font-family: "Microsoft YaHei", "PingFang SC", sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
    '.mes-label-page { break-after: page; page-break-after: always; overflow: hidden; }',
    '.mes-label-page:last-child { break-after: auto; page-break-after: auto; }',
    '.mes-label-qr > div { width: 100% !important; height: 100% !important; padding: 0 !important; border: 0 !important; }',
    '.mes-label-qr svg { display: block; width: 100%; height: 100%; }',
  ].join('\n');
}

function escapeHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** 打印用的完整页面：标题会转义，正文是已渲染的标签（由 Vue 渲染，文字已转义） */
export function printDocument(
  body: string,
  css: string,
  title: string,
): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${css}</style></head><body>${body}</body></html>`;
}
