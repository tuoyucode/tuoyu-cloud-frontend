import type { LogininfoApi } from '../../api/monitor/logininfo';

/** 把查询表单的值转换为后端的查询条件：日期范围转为 params.beginTime / endTime */
export function toQuery(values: Record<string, any>): LogininfoApi.Query {
  const { loginTime, ...rest } = values;
  const query: LogininfoApi.Query = { ...rest };
  if (Array.isArray(loginTime) && loginTime.length === 2) {
    query.params = {
      beginTime: `${loginTime[0]} 00:00:00`,
      endTime: `${loginTime[1]} 23:59:59`,
    };
  }
  return query;
}
