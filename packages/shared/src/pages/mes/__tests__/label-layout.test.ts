import { describe, expect, it } from 'vitest';

import {
  chunkRows,
  expandCopies,
  fieldValue,
  labelLayout,
  MAX_FONT_MM,
  maxCopies,
  MIN_FONT_MM,
  printCss,
  printDocument,
} from '../label-layout';

const base = {
  barcodeType: 'code128',
  columnCount: 1,
  columnGap: 0,
  fields: ['snCode', 'materialName', 'productionDate'],
  paperHeight: 30,
  paperWidth: 50,
};

describe('标签排版', () => {
  it('一行多列：页宽 = 列数 × 标签宽 + 列间距，页高为标签高', () => {
    const layout = labelLayout({ ...base, columnCount: 3, columnGap: 2 });
    expect(layout.page).toEqual({ height: 30, width: 154 });
    expect(layout.columns).toBe(3);
    expect(layout.gap).toBe(2);
  });

  it('一维码：占满宽度（去掉内边距），高度为可用高度的 40%，字段在下方', () => {
    const layout = labelLayout(base);
    // 内边距 = 短边 30 × 6% = 1.8 毫米
    expect(layout.label).toEqual({ height: 30, padding: 1.8, width: 50 });
    expect(layout.barcode).toEqual({
      height: 10.6,
      kind: 'code128',
      width: 46.4,
    });
    // 文字区高 = 26.4 − 10.6 − 1.8 = 14；3 行，字号 14 ÷ (3 × 1.25) ≈ 3.7
    expect(layout.text.height).toBe(14);
    expect(layout.text.fontSize).toBe(3.7);
    expect(layout.text.lineHeight).toBe(4.6);
  });

  it('二维码：正方形在左侧，边长取可用高度与可用宽度 45% 中较小的，字段在右侧', () => {
    const layout = labelLayout({ ...base, barcodeType: 'qrcode' });
    expect(layout.barcode).toEqual({
      height: 20.9,
      kind: 'qrcode',
      width: 20.9,
    });
    expect(layout.text.width).toBe(23.7);
    expect(layout.text.height).toBe(26.4);
  });

  it('字号限制在 1.5 ~ 4 毫米之间；内边距限制在 1 ~ 3 毫米', () => {
    const crowded = labelLayout({
      ...base,
      fields: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
      paperHeight: 15,
    });
    expect(crowded.text.fontSize).toBe(MIN_FONT_MM);
    expect(crowded.label.padding).toBe(1);

    const roomy = labelLayout({
      ...base,
      fields: ['snCode'],
      paperHeight: 100,
      paperWidth: 100,
    });
    expect(roomy.text.fontSize).toBe(MAX_FONT_MM);
    expect(roomy.label.padding).toBe(3);
    expect(roomy.barcode.height).toBe(25);
  });

  it('按列数分行，最后一行可以不满', () => {
    expect(chunkRows([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunkRows([1, 2], 0)).toEqual([[1], [2]]);
    expect(chunkRows([], 3)).toEqual([]);
  });

  it('多份打印按原顺序重复；份数上限保证总数不超过 500', () => {
    expect(expandCopies(['a', 'b'], 2)).toEqual(['a', 'a', 'b', 'b']);
    expect(expandCopies(['a'], 0)).toEqual(['a']);
    expect(maxCopies(3)).toBe(166);
    expect(maxCopies(600)).toBe(1);
    expect(maxCopies(0)).toBe(1);
  });

  it('字段的显示值：数量带单位，空值为空串', () => {
    const data = { batchCode: 'B01', quantity: 120, unit: '台' };
    expect(fieldValue('quantity', data)).toBe('120 台');
    expect(fieldValue('quantity', { quantity: '12.50' })).toBe('12.5');
    expect(fieldValue('batchCode', data)).toBe('B01');
    expect(fieldValue('snCode', data)).toBe('');
  });

  it('打印页：纸张为一行标签的尺寸、无页边距、每行分页；标题转义', () => {
    const css = printCss(
      labelLayout({ ...base, columnCount: 2, columnGap: 3 }),
    );
    expect(css).toContain('@page { size: 103mm 30mm; margin: 0; }');
    expect(css).toContain('break-after: page');
    const html = printDocument('<div>x</div>', css, '<模板>');
    expect(html).toContain('<title>&lt;模板&gt;</title>');
    expect(html).toContain('<body><div>x</div></body>');
  });
});
