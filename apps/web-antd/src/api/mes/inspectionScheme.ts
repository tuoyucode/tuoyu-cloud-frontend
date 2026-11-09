import type { MesApi } from './common';

import type { PageQuery, PageResult } from '#/api/types';

import { requestClient } from '#/api/request';

import { MES_BASE } from './common';

export namespace InspectionSchemeApi {
  /** 检验方案（MesInspectionSchemeVo） */
  export interface Scheme {
    /** 检验项目与标准，每行一项 */
    checkItems?: string;
    createTime?: string;
    /** 检验类型（InspectionType） */
    inspectionType: string;
    materialCode?: string;
    /** 适用产品，为空表示通用 */
    materialId?: string;
    materialName?: string;
    /** 适用工序编码，为空表示不限 */
    operationCode?: string;
    remark?: string;
    sampleQty?: number;
    schemeCode: string;
    schemeId: string;
    schemeName: string;
    /** 0 正常，1 停用 */
    status: string;
  }

  /** 查询条件（MesInspectionSchemeBo） */
  export interface Query extends PageQuery {
    inspectionType?: string;
    materialId?: string;
    operationCode?: string;
    schemeCode?: string;
    schemeName?: string;
    status?: string;
  }

  /** 新增、修改的参数（MesInspectionSchemeBo） */
  export type Form = Omit<
    Scheme,
    'createTime' | 'materialCode' | 'materialName' | 'schemeId'
  > & {
    schemeId?: string;
  };
}

const BASE = `${MES_BASE}/inspection-scheme`;

export function listInspectionScheme(query: InspectionSchemeApi.Query) {
  return requestClient.get<PageResult<InspectionSchemeApi.Scheme>>(
    `${BASE}/list`,
    { params: query },
  );
}

/** 启用的检验方案（下拉选项），可按检验类型与产品过滤 */
export function getInspectionSchemeOptions(params: {
  inspectionType?: string;
  materialId?: string;
}) {
  return requestClient.get<MesApi.Option[]>(`${BASE}/options`, { params });
}

/** 新增检验单时自动匹配的方案，没有时为 null */
export function matchInspectionScheme(params: {
  inspectionType: string;
  materialId?: string;
  operationCode?: string;
}) {
  return requestClient.get<InspectionSchemeApi.Scheme | null>(`${BASE}/match`, {
    params,
  });
}

export function getInspectionScheme(schemeId: string) {
  return requestClient.get<InspectionSchemeApi.Scheme>(`${BASE}/${schemeId}`);
}

export function addInspectionScheme(data: InspectionSchemeApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function updateInspectionScheme(data: InspectionSchemeApi.Form) {
  return requestClient.put<null>(BASE, data);
}

export function removeInspectionScheme(schemeIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${schemeIds.join(',')}`);
}
