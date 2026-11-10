import type { PageQuery, PageResult } from '../types';

import { exportExcel, requestClient } from '../request';
import { MES_BASE } from './common';

export namespace MaterialApi {
  /** 物料（MesMaterialVo） */
  export interface Material {
    createTime?: string;
    materialCode: string;
    materialId: string;
    materialName: string;
    /** 物料类型（MaterialType） */
    materialType: string;
    remark?: string;
    sortNo: number;
    specification?: string;
    /** 0 正常，1 停用 */
    status: string;
    /** 追溯方式（TraceMode） */
    traceMode: string;
    unit: string;
  }

  /** 查询条件（MesMaterialBo） */
  export interface Query extends PageQuery {
    materialCode?: string;
    materialName?: string;
    materialType?: string;
    status?: string;
    traceMode?: string;
  }

  /** 新增、修改的参数（MesMaterialBo） */
  export type Form = Omit<Material, 'createTime' | 'materialId'> & {
    materialId?: string;
  };
}

const BASE = `${MES_BASE}/material`;

export function listMaterial(query: MaterialApi.Query) {
  return requestClient.get<PageResult<MaterialApi.Material>>(`${BASE}/list`, {
    params: query,
  });
}

export function getMaterial(materialId: string) {
  return requestClient.get<MaterialApi.Material>(`${BASE}/${materialId}`);
}

export function addMaterial(data: MaterialApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function updateMaterial(data: MaterialApi.Form) {
  return requestClient.put<null>(BASE, data);
}

export function removeMaterial(materialIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${materialIds.join(',')}`);
}

export function exportMaterial(query: MaterialApi.Query, fileName: string) {
  return exportExcel(`${BASE}/export`, { ...query }, fileName);
}
