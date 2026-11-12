import type { GenApi } from '../../api/tool/gen';

import { $t } from '@vben/locales';

import { listDataNames } from '../../api/tool/gen';

/** 编辑生成配置页面的路由（菜单“修改生成配置”，隐藏） */
export const EDIT_PAGE_PATH = '/tool/gen-edit/index';

/** 代码生成列表页面的路由 */
export const LIST_PAGE_PATH = '/tool/gen';

/** 标记为“是”的值 */
export const YES = '1';

/** 生成信息表单中按字段选择的项（加载字段后统一填入选项） */
export const FIELD_SELECT_NAMES = [
  'sortField',
  'statusField',
  'treeAncestors',
  'treeCode',
  'treeName',
  'treeOrderField',
  'treeParentCode',
  'uniqueFields',
] as const;

/** 数据源下拉选项 */
export async function loadDataNameOptions() {
  const names = await listDataNames();
  return (names ?? []).map((name) => ({ label: name, value: name }));
}

/** 把查询表单的值转换为后端的查询条件：日期范围转为 params.beginTime / endTime（包含结束当天） */
export function toQuery(values: Record<string, any>): GenApi.Query {
  const { createTime, ...rest } = values;
  const query: GenApi.Query = { ...rest };
  if (Array.isArray(createTime) && createTime.length === 2) {
    query.params = {
      beginTime: `${createTime[0]} 00:00:00`,
      endTime: `${createTime[1]} 23:59:59`,
    };
  }
  return query;
}

/**
 * 预览中显示的文件名：去掉模板根目录 fm/ 与模板后缀 .ftl，例如 fm/vben/index.vue.ftl → vben/index.vue
 */
export function templateLabel(path: string) {
  return path.replace(/^fm\//, '').replace(/\.ftl$/, '');
}

/** 预览代码的语言（只用于显示标签） */
export function templateLanguage(path: string) {
  const name = templateLabel(path);
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1);
}

/** 下载的文件名：单张表用表名，多张表用“代码生成” */
export function downloadFileName(tables: Pick<GenApi.Table, 'tableName'>[]) {
  const base =
    tables.length === 1 && tables[0]
      ? tables[0].tableName
      : $t('tool.gen.batchFileName');
  return `${base}.zip`;
}
