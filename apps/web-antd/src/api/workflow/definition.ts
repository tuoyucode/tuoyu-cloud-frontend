import type { PageQuery, PageResult } from '#/api/types';

import { downloadFileFromBlobPart } from '@vben/utils';

import { message } from 'ant-design-vue';

import { requestClient } from '#/api/request';
import { $t } from '#/locales';

export namespace DefinitionApi {
  /** 发布状态：0 未发布，1 已发布，9 已失效（发布了新版本后旧版本失效） */
  export type PublishStatus = 0 | 1 | 9;

  /** 设计器模式：CLASSICS 经典模式，MIMIC 仿钉钉模式 */
  export type ModelValue = 'CLASSICS' | 'MIMIC';

  /** 流程定义（FlowDefinitionVo） */
  export interface Definition {
    /** 1 激活，0 挂起 */
    activityStatus?: number;
    category?: string;
    categoryName?: string;
    createTime?: string;
    ext?: string;
    flowCode: string;
    flowName: string;
    /** 审批表单是否自定义：Y 是，N 否 */
    formCustom?: string;
    formPath?: string;
    id: string;
    isPublish?: PublishStatus;
    listenerPath?: string;
    listenerType?: string;
    modelValue?: ModelValue | string;
    updateTime?: string;
    version?: string;
  }

  /** 查询条件（FlowDefinition）：按分类查询时包含下级分类 */
  export interface Query extends PageQuery {
    category?: string;
    flowCode?: string;
    flowName?: string;
  }

  /** 新增、修改的参数（FlowDefinition） */
  export interface Form {
    category: string;
    flowCode: string;
    flowName: string;
    formCustom?: string;
    formPath?: string;
    id?: string;
    modelValue?: ModelValue | string;
  }
}

const BASE = '/workflow/definition';

/** 已发布的流程定义 */
export function listDefinition(query: DefinitionApi.Query) {
  return requestClient.get<PageResult<DefinitionApi.Definition>>(
    `${BASE}/list`,
    { params: query },
  );
}

/** 未发布或已失效的流程定义 */
export function listUnpublishedDefinition(query: DefinitionApi.Query) {
  return requestClient.get<PageResult<DefinitionApi.Definition>>(
    `${BASE}/unPublishList`,
    { params: query },
  );
}

export function getDefinition(id: string) {
  return requestClient.get<DefinitionApi.Definition>(`${BASE}/${id}`);
}

export function addDefinition(data: DefinitionApi.Form) {
  return requestClient.post<boolean>(BASE, data);
}

export function updateDefinition(data: DefinitionApi.Form) {
  return requestClient.put<boolean>(BASE, data);
}

/** 删除：已有流程实例使用时后端拒绝 */
export function removeDefinition(ids: string[]) {
  return requestClient.delete<null>(`${BASE}/${ids.join(',')}`);
}

/** 发布：有中间节点未配置办理人时后端拒绝，提示节点名称 */
export function publishDefinition(id: string) {
  return requestClient.put<boolean>(`${BASE}/publish/${id}`);
}

export function unpublishDefinition(id: string) {
  return requestClient.put<boolean>(`${BASE}/unPublish/${id}`);
}

/** 复制为新的未发布版本 */
export function copyDefinition(id: string) {
  return requestClient.post<boolean>(`${BASE}/copy/${id}`);
}

/** 激活（true）或挂起（false） */
export function activeDefinition(id: string, active: boolean) {
  return requestClient.put<boolean>(`${BASE}/active/${id}`, null, {
    params: { active },
  });
}

/** 导入流程定义（导出的 JSON 文件），归入指定分类 */
export function importDefinition(file: File, category: string) {
  return requestClient.upload<boolean>(`${BASE}/importDef`, { category, file });
}

/** 导出流程定义为 JSON 文件 */
export async function exportDefinition(id: string, fileName: string) {
  const blob = await requestClient.download<Blob>(`${BASE}/exportDef/${id}`, {
    method: 'POST',
  });
  // 后端出错时返回 R（application/json），导出成功时为 application/text
  if (blob.type.includes('json')) {
    const body = JSON.parse(await blob.text());
    message.error(body?.msg || $t('crud.exportFailed'));
    throw new Error(body?.msg);
  }
  downloadFileFromBlobPart({ fileName, source: blob });
}
