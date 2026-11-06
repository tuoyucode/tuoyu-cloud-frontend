import type { PageQuery, PageResult } from '#/api/types';

import { downloadFileFromBlobPart } from '@vben/utils';

import { message } from 'ant-design-vue';

import { requestClient } from '#/api/request';
import { $t } from '#/locales';

export namespace GenApi {
  /** 模板类型：crud 单表，tree 树表 */
  export type TplCategory = 'crud' | 'tree';

  /** 前端模板：vben（默认，与本前端的页面约定一致）、vue（Element Plus）、react */
  export type FrontendType = 'react' | 'vben' | 'vue';

  /**
   * 生成选项（保存在 gen_table.options 中）。
   * 字段类的选项填列名（column_name），后端按列名或 Java 字段名查找
   */
  export interface Options {
    enableExport?: boolean;
    enableSort?: boolean;
    enableStatus?: boolean;
    enableUnique?: boolean;
    parentMenuId?: string;
    parentMenuName?: string;
    sortField?: string;
    statusField?: string;
    /** 树祖级字段（注意键名是 treeAncestors，与返回的 treeAncestorsField 不同） */
    treeAncestors?: string;
    treeCode?: string;
    treeName?: string;
    treeOrderField?: string;
    treeParentCode?: string;
    treeRootValue?: string;
    uniqueFields?: string[];
  }

  /** 业务表（GenTable）；详情接口会把 options 拆成下面的同名字段返回 */
  export interface Table {
    businessName?: string;
    className?: string;
    columns?: Column[];
    createTime?: string;
    dataName?: string;
    enableExport?: boolean;
    enableSort?: boolean;
    enableStatus?: boolean;
    enableUnique?: boolean;
    frontendType?: FrontendType | string;
    functionAuthor?: string;
    functionName?: string;
    moduleName?: string;
    options?: string;
    packageName?: string;
    parentMenuId?: number | string;
    parentMenuName?: string;
    remark?: string;
    sortField?: string;
    statusField?: string;
    tableComment?: string;
    tableId: string;
    tableName: string;
    tplCategory?: string;
    treeAncestorsField?: string;
    treeCode?: string;
    treeName?: string;
    treeOrderField?: string;
    treeParentCode?: string;
    treeRootValue?: string;
    uniqueFields?: string[];
    updateTime?: string;
  }

  /** 字段（GenTableColumn）；是否类的标记为 '1' 表示是 */
  export interface Column {
    columnComment?: string;
    columnId: string;
    columnName: string;
    columnType?: string;
    dictType?: string;
    /** 显示类型：input、textarea、select、radio、checkbox、datetime 等 */
    htmlType?: string;
    isEdit?: string;
    isIncrement?: string;
    isInsert?: string;
    isList?: string;
    isPk?: string;
    isQuery?: string;
    isRequired?: string;
    javaField: string;
    javaType?: string;
    /** 查询方式：EQ、NE、GT、GE、LT、LE、LIKE、BETWEEN */
    queryType?: string;
    sort?: number;
    tableId?: string;
  }

  /** 查询条件 */
  export interface Query extends PageQuery {
    dataName?: string;
    /** 创建时间范围：params[beginTime]、params[endTime] */
    params?: Record<string, unknown>;
    tableComment?: string;
    tableName?: string;
  }

  /** 数据库中尚未导入的表 */
  export interface DbTable {
    createTime?: string;
    tableComment?: string;
    tableName: string;
    updateTime?: string;
  }

  export interface DbQuery extends PageQuery {
    dataName?: string;
    tableComment?: string;
    tableName?: string;
  }

  /** 详情：info 为业务表，rows 为字段 */
  export interface Detail {
    info: Table;
    rows: Column[];
  }

  /** 保存生成配置的参数：业务表、全部字段与生成选项 */
  export interface SaveForm extends Omit<
    Table,
    'columns' | 'createTime' | 'options' | 'updateTime'
  > {
    columns: Column[];
    params: Options;
  }
}

const BASE = '/tool/gen';

export function listGenTable(query: GenApi.Query) {
  return requestClient.get<PageResult<GenApi.Table>>(`${BASE}/list`, {
    params: query,
  });
}

export function listDbTable(query: GenApi.DbQuery) {
  return requestClient.get<PageResult<GenApi.DbTable>>(`${BASE}/db/list`, {
    params: query,
  });
}

/** 可用的数据源名称 */
export function listDataNames() {
  return requestClient.get<string[]>(`${BASE}/getDataNames`);
}

export function getGenTable(tableId: string) {
  return requestClient.get<GenApi.Detail>(`${BASE}/${tableId}`);
}

/** 导入表：表名用逗号拼接 */
export function importTables(tables: string[], dataName: string) {
  return requestClient.post<null>(`${BASE}/importTable`, null, {
    params: { dataName, tables: tables.join(',') },
  });
}

export function updateGenTable(data: GenApi.SaveForm) {
  return requestClient.put<null>(BASE, data);
}

export function removeGenTable(tableIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${tableIds.join(',')}`);
}

/** 预览：键为模板路径（如 fm/vben/index.vue.ftl），值为生成的代码 */
export function previewGenCode(tableId: string) {
  return requestClient.get<Record<string, string>>(
    `${BASE}/preview/${tableId}`,
  );
}

/** 按数据库中的最新表结构同步字段（保留已配置的查询方式、字典、显示类型等） */
export function syncGenTable(tableId: string) {
  return requestClient.get<null>(`${BASE}/synchDb/${tableId}`);
}

/**
 * 下载生成的代码（zip）。可以一次下载多张表
 *
 * @param tableIds 业务表 ID
 * @param fileName 保存的文件名
 */
export async function downloadGenCode(tableIds: string[], fileName: string) {
  const url =
    tableIds.length === 1
      ? `${BASE}/download/${tableIds[0]}`
      : `${BASE}/batchGenCode`;
  const blob = await requestClient.download<Blob>(url, {
    params:
      tableIds.length === 1 ? undefined : { tableIdStr: tableIds.join(',') },
    timeout: 0,
  });
  if (blob.type.includes('json')) {
    const body = JSON.parse(await blob.text());
    message.error(body?.msg || $t('tool.gen.downloadFailed'));
    throw new Error(body?.msg);
  }
  downloadFileFromBlobPart({ fileName, source: blob });
}
