import type { GenApi } from '@tuoyu/shared/api/tool/gen';

/** Java 类型（与后端 GenConstants 一致） */
export const JAVA_TYPES = [
  'Long',
  'String',
  'Integer',
  'Double',
  'Float',
  'BigDecimal',
  'Boolean',
  'LocalDateTime',
] as const;

/** 查询方式 */
export const QUERY_TYPES = [
  'EQ',
  'NE',
  'GT',
  'GE',
  'LT',
  'LE',
  'LIKE',
  'BETWEEN',
] as const;

/** 显示类型（与后端 GenConstants.HTML_* 一致） */
export const HTML_TYPES = [
  'input',
  'textarea',
  'inputNumber',
  'select',
  'radio',
  'checkbox',
  'switch',
  'datetime',
  'imageUpload',
  'fileUpload',
  'editor',
] as const;

/** 可以选择字典的显示类型（其他类型保存时后端会清空字典） */
const DICT_HTML_TYPES = new Set(['checkbox', 'radio', 'select', 'switch']);

/** 是否类字段 */
export const FLAG_FIELDS = [
  'isInsert',
  'isEdit',
  'isList',
  'isQuery',
  'isRequired',
] as const;

export type FlagField = (typeof FLAG_FIELDS)[number];

const YES = '1';
const NO = '0';

/** 树表的选项字段 */
const TREE_OPTION_FIELDS = [
  'treeAncestors',
  'treeCode',
  'treeName',
  'treeOrderField',
  'treeParentCode',
  'treeRootValue',
] as const;

/** 审计字段：保存时不提交，由后端维护 */
const AUDIT_FIELDS = [
  'createBy',
  'createDept',
  'createTime',
  'updateBy',
  'updateTime',
] as const;

export function isDictHtmlType(htmlType?: string) {
  return !!htmlType && DICT_HTML_TYPES.has(htmlType);
}

export function isFlagOn(value?: string) {
  return value === YES;
}

export function toFlag(checked: boolean) {
  return checked ? YES : NO;
}

/**
 * 前端模板类型：只认 ele（Element Plus）与 antd（Ant Design Vue），
 * 其他值（例如未设置）按 ele 处理，与后端新导入表的默认值一致
 */
export function toFrontendType(value?: unknown): GenApi.FrontendType {
  return value === 'antd' ? 'antd' : 'ele';
}

/** 字段的下拉选项：值为列名，显示“列名：注释” */
export function columnOptions(columns: GenApi.Column[]) {
  return columns.map((column) => ({
    label: column.columnComment
      ? `${column.columnName}：${column.columnComment}`
      : column.columnName,
    value: column.columnName,
  }));
}

/**
 * 从详情接口返回的业务表中读出生成选项。
 * 注意：详情返回 treeAncestorsField，保存时的键名是 treeAncestors
 */
export function readOptions(info: GenApi.Table): GenApi.Options {
  return {
    enableExport: info.enableExport ?? true,
    enableSort: info.enableSort ?? false,
    enableStatus: info.enableStatus ?? false,
    enableUnique: info.enableUnique ?? false,
    parentMenuId:
      info.parentMenuId === undefined || info.parentMenuId === null
        ? undefined
        : String(info.parentMenuId),
    parentMenuName: info.parentMenuName,
    sortField: info.sortField || undefined,
    statusField: info.statusField || undefined,
    treeAncestors: info.treeAncestorsField || undefined,
    treeCode: info.treeCode || undefined,
    treeName: info.treeName || undefined,
    treeOrderField: info.treeOrderField || undefined,
    treeParentCode: info.treeParentCode || undefined,
    treeRootValue: info.treeRootValue || undefined,
    uniqueFields: info.uniqueFields ?? [],
  };
}

/**
 * 整理生成选项：关闭的功能不保留字段；单表不保留树表字段；空值不提交
 */
export function normalizeOptions(
  options: GenApi.Options,
  tplCategory?: string,
): GenApi.Options {
  const dropped = new Set<string>();
  if (!options.enableStatus) {
    dropped.add('statusField');
  }
  if (!options.enableSort) {
    dropped.add('sortField');
  }
  if (tplCategory !== 'tree') {
    for (const field of TREE_OPTION_FIELDS) {
      dropped.add(field);
    }
  }
  const entries = Object.entries(options).filter(
    ([key, value]) =>
      !dropped.has(key) &&
      value !== undefined &&
      value !== null &&
      value !== '',
  );
  return {
    ...(Object.fromEntries(entries) as GenApi.Options),
    uniqueFields: options.enableUnique ? [...(options.uniqueFields ?? [])] : [],
  };
}

/**
 * 检查生成选项，返回第一个问题的文案键；没有问题时返回 undefined。
 * 与后端 validateEdit 的规则一致，提前在前端提示
 */
export function validateOptions(
  options: GenApi.Options,
  tplCategory?: string,
): string | undefined {
  if (tplCategory === 'tree') {
    if (!options.treeCode) {
      return 'tool.gen.treeCodeRequired';
    }
    if (!options.treeParentCode) {
      return 'tool.gen.treeParentCodeRequired';
    }
    if (!options.treeName) {
      return 'tool.gen.treeNameRequired';
    }
  }
  if (options.enableStatus && !options.statusField) {
    return 'tool.gen.statusFieldRequired';
  }
  if (options.enableSort && !options.sortField) {
    return 'tool.gen.sortFieldRequired';
  }
  if (options.enableUnique && (options.uniqueFields ?? []).length === 0) {
    return 'tool.gen.uniqueFieldsRequired';
  }
  return undefined;
}

/** 详情中由 options 拆出来的字段与字段列表：保存时不随业务表提交 */
const DERIVED_FIELDS = [
  'columns',
  'enableExport',
  'enableSort',
  'enableStatus',
  'enableUnique',
  'options',
  'parentMenuId',
  'parentMenuName',
  'sortField',
  'statusField',
  'treeAncestorsField',
  'treeCode',
  'treeName',
  'treeOrderField',
  'treeParentCode',
  'treeRootValue',
  'uniqueFields',
] as const;

function omit<T extends Record<string, any>>(
  value: T,
  fields: readonly string[],
): T {
  const excluded = new Set(fields);
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !excluded.has(key)),
  ) as T;
}

/**
 * 组装保存参数：业务表的基本信息与生成信息、全部字段、整理后的生成选项。
 * 审计字段与详情中由 options 拆出来的字段不提交，选项统一放在 params 中
 */
export function buildSaveForm(
  info: GenApi.Table,
  columns: GenApi.Column[],
  options: GenApi.Options,
): GenApi.SaveForm {
  const base = omit(info, [...AUDIT_FIELDS, ...DERIVED_FIELDS]);
  return {
    ...base,
    columns: columns.map((column) => {
      const copy = omit(column, AUDIT_FIELDS);
      // 不能选字典的显示类型不提交字典（后端也会清空）
      if (!isDictHtmlType(copy.htmlType)) {
        copy.dictType = '';
      }
      return copy;
    }),
    params: normalizeOptions(options, info.tplCategory),
  };
}
