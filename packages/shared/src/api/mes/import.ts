import type { ApiResult } from '../../utils/api-result';

import { errorMessageOf, isSuccess } from '../../utils/api-result';
import { exportExcel, requestClient, silentErrors } from '../request';
import { MES_BASE } from './common';

export namespace MesImportApi {
  /** 导入结果：成功时 message 为“导入成功，共 N 条”，失败时为后端逐行列出的原因 */
  export interface Result {
    message: string;
    success: boolean;
  }

  /** 拆分后的导入提示：第一行是摘要，其余每行一条错误（“第 5 行：……”） */
  export interface Message {
    lines: string[];
    summary: string;
  }
}

/**
 * 下载主数据的导入模板，例如 downloadMesImportTemplate('material', '物料导入模板.xlsx')
 * 调用 /mes/material/importTemplate
 */
export function downloadMesImportTemplate(resource: string, fileName: string) {
  return exportExcel(`${MES_BASE}/${resource}/importTemplate`, {}, fileName);
}

/**
 * 导入主数据，例如 importMesData('material', file) 调用 /mes/material/importData。
 * 后端先整体校验，有任何一行不合格时一行都不写入，HTTP 状态为 4xx，逐行的原因在 message 中。
 * 这里不弹出提示，由页面展示明细
 */
export async function importMesData(
  resource: string,
  file: Blob,
): Promise<MesImportApi.Result> {
  try {
    const body = await requestClient.upload<ApiResult<null>>(
      `${MES_BASE}/${resource}/importData`,
      { file },
      // 取完整返回体以读取 message；导入可能较慢，放宽超时
      silentErrors({ responseReturn: 'body', timeout: 5 * 60 * 1000 }),
    );
    return { message: body?.message ?? '', success: isSuccess(body) };
  } catch (error) {
    return { message: errorMessageOf(error, ''), success: false };
  }
}

/** 把导入提示拆成摘要与逐行的错误（后端每条错误占一行），空行忽略 */
export function splitImportMessage(message: string): MesImportApi.Message {
  const [summary = '', ...lines] = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '');
  return { lines, summary };
}
