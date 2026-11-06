import type { PageQuery, PageResult } from '#/api/types';

import { exportExcel, requestClient } from '#/api/request';

export namespace DictApi {
  /** 字典数据（SysDictDataVo） */
  export interface DictData {
    createTime?: string;
    /** 样式属性（附加的 CSS 类名） */
    cssClass?: string;
    /** 字典数据主键 */
    dictCode?: string;
    dictLabel: string;
    dictSort?: number;
    dictType: string;
    dictValue: string;
    /** 是否默认：Y 是，N 否（字典 sys_yes_no） */
    isDefault?: string;
    /** 回显样式：primary / success / info / warning / danger / default */
    listClass?: string;
    remark?: string;
  }

  /** 字典数据的查询条件（SysDictDataBo） */
  export interface DictDataQuery extends PageQuery {
    dictLabel?: string;
    /** 必填：只查询这个字典类型下的数据 */
    dictType: string;
  }

  /** 新增、修改字典数据的参数（SysDictDataBo） */
  export type DictDataForm = Omit<DictData, 'createTime' | 'dictCode'> & {
    dictCode?: string;
  };

  /** 字典类型（SysDictTypeVo） */
  export interface DictTypeItem {
    createTime?: string;
    dictId: string;
    dictName: string;
    /** 类型标识，例如 sys_normal_disable */
    dictType: string;
    remark?: string;
  }

  /** 字典类型的查询条件（SysDictTypeBo） */
  export interface DictTypeQuery extends PageQuery {
    dictName?: string;
    dictType?: string;
  }

  /** 新增、修改字典类型的参数（SysDictTypeBo） */
  export type DictTypeForm = Omit<DictTypeItem, 'createTime' | 'dictId'> & {
    dictId?: string;
  };

  /** 用于下拉框、单选框、标签的选项 */
  export interface DictOption {
    label: string;
    listClass?: string;
    value: string;
  }
}

/** 常用字典类型 */
export const DictType = {
  /** 成功 / 失败（登录日志、操作日志的状态） */
  COMMON_STATUS: 'sys_common_status',
  /** 客户端设备类型：PC、安卓、iOS、小程序 */
  DEVICE_TYPE: 'sys_device_type',
  /** 客户端授权类型：密码、短信、邮件等 */
  GRANT_TYPE: 'sys_grant_type',
  /** 正常 / 停用 */
  NORMAL_DISABLE: 'sys_normal_disable',
  /** 通知公告状态：正常 / 关闭 */
  NOTICE_STATUS: 'sys_notice_status',
  /** 通知公告类型：通知 / 公告 */
  NOTICE_TYPE: 'sys_notice_type',
  /** 操作类型：新增、修改、删除等 */
  OPER_TYPE: 'sys_oper_type',
  /** 显示 / 隐藏（菜单） */
  SHOW_HIDE: 'sys_show_hide',
  /** 用户性别：男、女、未知 */
  USER_GENDER: 'sys_user_gender',
  /** 是 / 否 */
  YES_NO: 'sys_yes_no',
  /** 流程状态：草稿、待审核、已完成、已退回等 */
  WF_BUSINESS_STATUS: 'wf_business_status',
  /** 任务状态（审批记录）：通过、退回、转办、委托等 */
  WF_TASK_STATUS: 'wf_task_status',
} as const;

const cache = new Map<string, Promise<DictApi.DictOption[]>>();

/**
 * 按类型获取字典选项。同一类型只请求一次，页面之间共用
 */
export function getDictOptions(
  dictType: string,
): Promise<DictApi.DictOption[]> {
  let options = cache.get(dictType);
  if (!options) {
    options = requestClient
      .get<DictApi.DictData[]>(`/system/dict/data/type/${dictType}`)
      .then((list) =>
        list.map((item) => ({
          label: item.dictLabel,
          listClass: item.listClass,
          value: item.dictValue,
        })),
      )
      .catch((error) => {
        // 失败时不缓存，下次重新请求
        cache.delete(dictType);
        throw error;
      });
    cache.set(dictType, options);
  }
  return options;
}

/** 清除字典缓存（修改字典数据后调用） */
export function clearDictCache() {
  cache.clear();
}

const TYPE_BASE = '/system/dict/type';
const DATA_BASE = '/system/dict/data';

export function listDictType(query: DictApi.DictTypeQuery) {
  return requestClient.get<PageResult<DictApi.DictTypeItem>>(
    `${TYPE_BASE}/list`,
    { params: query },
  );
}

/** 全部字典类型（下拉框用，例如代码生成中为字段选择字典） */
export function listDictTypeOptions() {
  return requestClient.get<DictApi.DictTypeItem[]>(`${TYPE_BASE}/optionselect`);
}

export function getDictType(dictId: string) {
  return requestClient.get<DictApi.DictTypeItem>(`${TYPE_BASE}/${dictId}`);
}

export function addDictType(data: DictApi.DictTypeForm) {
  return requestClient.post<null>(TYPE_BASE, data);
}

/** 修改字典类型：类型标识变化时，后端同步修改其下的字典数据 */
export async function updateDictType(data: DictApi.DictTypeForm) {
  await requestClient.put<null>(TYPE_BASE, data);
  clearDictCache();
}

/** 删除字典类型：类型下还有字典数据时后端拒绝删除 */
export async function removeDictType(dictIds: string[]) {
  await requestClient.delete<null>(`${TYPE_BASE}/${dictIds.join(',')}`);
  clearDictCache();
}

export function exportDictType(query: DictApi.DictTypeQuery, fileName: string) {
  return exportExcel(`${TYPE_BASE}/export`, { ...query }, fileName);
}

/** 刷新字典缓存：直接修改数据库后，让后端和本页面重新读取字典 */
export async function refreshDictCache() {
  await requestClient.delete<null>(`${TYPE_BASE}/refreshCache`);
  clearDictCache();
}

export function listDictData(query: DictApi.DictDataQuery) {
  return requestClient.get<PageResult<DictApi.DictData>>(`${DATA_BASE}/list`, {
    params: query,
  });
}

export function getDictData(dictCode: string) {
  return requestClient.get<DictApi.DictData>(`${DATA_BASE}/${dictCode}`);
}

export async function addDictData(data: DictApi.DictDataForm) {
  await requestClient.post<null>(DATA_BASE, data);
  clearDictCache();
}

export async function updateDictData(data: DictApi.DictDataForm) {
  await requestClient.put<null>(DATA_BASE, data);
  clearDictCache();
}

export async function removeDictData(dictCodes: string[]) {
  await requestClient.delete<null>(`${DATA_BASE}/${dictCodes.join(',')}`);
  clearDictCache();
}

export function exportDictData(query: DictApi.DictDataQuery, fileName: string) {
  return exportExcel(`${DATA_BASE}/export`, { ...query }, fileName);
}
