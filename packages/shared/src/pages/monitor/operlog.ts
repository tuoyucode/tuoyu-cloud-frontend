import type { OperlogApi } from '../../api/monitor/operlog';

/** 把查询表单的值转换为后端的查询条件：日期范围转为 params.beginTime / endTime */
export function toQuery(values: Record<string, any>): OperlogApi.Query {
  const { operTime, ...rest } = values;
  const query: OperlogApi.Query = { ...rest };
  if (Array.isArray(operTime) && operTime.length === 2) {
    query.params = {
      beginTime: `${operTime[0]} 00:00:00`,
      endTime: `${operTime[1]} 23:59:59`,
    };
  }
  return query;
}

/** 请求参数、返回结果按 JSON 缩进显示；不是 JSON 时原样显示 */
export function prettyJson(text?: string) {
  if (!text) {
    return '';
  }
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}
