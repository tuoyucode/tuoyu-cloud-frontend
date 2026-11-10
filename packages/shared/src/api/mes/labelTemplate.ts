import type { PageQuery, PageResult } from '../types';

import { requestClient } from '../request';
import { MES_BASE } from './common';

export namespace LabelTemplateApi {
  /** 适用对象（LabelTarget） */
  export type Target = 'batch' | 'sn';

  /** 条码类型（BarcodeType） */
  export type Barcode = 'code128' | 'qrcode';

  /** 标签模板（MesLabelTemplateVo） */
  export interface Template {
    /** 条码类型 */
    barcodeType: Barcode | string;
    /** 每行几列 */
    columnCount: number;
    /** 列间距（毫米） */
    columnGap: number;
    createTime?: string;
    /** 1 为该对象的默认模板 */
    defaultFlag: string;
    /** 显示的字段（LabelField 的编码，按显示顺序） */
    fields: string[];
    labelTemplateId: string;
    /** 标签高度（毫米） */
    paperHeight: number;
    /** 标签宽度（毫米） */
    paperWidth: number;
    remark?: string;
    /** 0 正常，1 停用 */
    status: string;
    targetType: string;
    templateName: string;
  }

  /** 查询条件（MesLabelTemplateBo） */
  export interface Query extends PageQuery {
    barcodeType?: string;
    status?: string;
    targetType?: string;
    templateName?: string;
  }

  /** 新增、修改的参数（MesLabelTemplateBo） */
  export type Form = Omit<Template, 'createTime' | 'labelTemplateId'> & {
    labelTemplateId?: string;
  };

  /** 一个标签的打印数据（MesLabelDataVo），属性名即显示字段的编码 */
  export interface LabelData {
    /** 条码内容：序列号标签为序列号，批次标签为批次号 */
    barcode: string;
    batchCode?: string;
    id: string;
    materialCode?: string;
    materialName?: string;
    /** 生产日期 yyyy-MM-dd */
    productionDate?: string;
    quantity?: number | string;
    snCode?: string;
    specification?: string;
    unit?: string;
    workorderCode?: string;
  }
}

const BASE = `${MES_BASE}/label-template`;

export function listLabelTemplate(query: LabelTemplateApi.Query) {
  return requestClient.get<PageResult<LabelTemplateApi.Template>>(
    `${BASE}/list`,
    { params: query },
  );
}

export function getLabelTemplate(labelTemplateId: string) {
  return requestClient.get<LabelTemplateApi.Template>(
    `${BASE}/${labelTemplateId}`,
  );
}

/** 打印时可选的模板：适用于该对象的启用模板，默认模板在最前 */
export function getLabelTemplateOptions(targetType: LabelTemplateApi.Target) {
  return requestClient.get<LabelTemplateApi.Template[]>(`${BASE}/options`, {
    params: { targetType },
  });
}

export function addLabelTemplate(data: LabelTemplateApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function updateLabelTemplate(data: LabelTemplateApi.Form) {
  return requestClient.put<null>(BASE, data);
}

export function removeLabelTemplate(labelTemplateIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${labelTemplateIds.join(',')}`);
}

/** 序列号标签的打印数据：勾选的序列号（snIds）或某个工单的全部未报废序列号（workorderId），最多 500 个 */
export function getSnLabels(data: { snIds?: string[]; workorderId?: string }) {
  return requestClient.post<LabelTemplateApi.LabelData[]>(
    `${MES_BASE}/label-print/sn`,
    data,
  );
}

/** 批次标签的打印数据：每个工单一个，最多 500 个 */
export function getBatchLabels(workorderIds: string[]) {
  return requestClient.post<LabelTemplateApi.LabelData[]>(
    `${MES_BASE}/label-print/batch`,
    { workorderIds },
  );
}
