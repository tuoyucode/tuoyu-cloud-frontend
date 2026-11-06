import type { PageQuery, PageResult } from '#/api/types';

import { exportExcel, requestClient } from '#/api/request';

export namespace OperlogApi {
  /** 操作日志（SysOperLogVo） */
  export interface Operlog {
    /** 业务类型（字典 sys_oper_type）：0 其他，1 新增，2 修改，3 删除…… */
    businessType: number;
    clientKey?: string;
    browser?: string;
    /** 耗时（毫秒） */
    costTime?: number;
    deptId?: string;
    deptName?: string;
    /** 设备类型（字典 sys_device_type） */
    deviceType?: string;
    errorMsg?: string;
    /** 返回结果（JSON 字符串） */
    jsonResult?: string;
    /** 处理请求的方法，例如 org.tuoyu.system.controller.SysPostController.add() */
    method?: string;
    operId: string;
    operIp?: string;
    operLocation?: string;
    operName?: string;
    /** 请求参数（JSON 字符串） */
    operParam?: string;
    operTime?: string;
    /** 操作类别：0 其他，1 后台用户，2 手机端用户 */
    operatorType?: number;
    operUrl?: string;
    os?: string;
    requestMethod?: string;
    /** 操作状态（字典 sys_common_status）：0 成功，1 失败 */
    status: number;
    title?: string;
    userId?: string;
  }

  /** 查询条件（SysOperLogBo） */
  export interface Query extends PageQuery {
    businessType?: number | string;
    operIp?: string;
    operName?: string;
    /** 操作时间范围，格式 YYYY-MM-DD HH:mm:ss，起止都有时才生效 */
    params?: { beginTime?: string; endTime?: string };
    status?: number | string;
    title?: string;
  }
}

const BASE = '/monitor/operlog';

// params 为嵌套对象，axios 会序列化为 params[beginTime]=...，与后端 Bo 中的 Map 绑定一致

export function listOperlog(query: OperlogApi.Query) {
  return requestClient.get<PageResult<OperlogApi.Operlog>>(`${BASE}/list`, {
    params: query,
  });
}

export function removeOperlog(operIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${operIds.join(',')}`);
}

/** 清空全部操作日志 */
export function cleanOperlog() {
  return requestClient.delete<null>(`${BASE}/clean`);
}

export function exportOperlog(query: OperlogApi.Query, fileName: string) {
  return exportExcel(`${BASE}/export`, { ...query }, fileName);
}
