import { requestClient } from '../request';

export namespace MesApi {
  /** 下拉选项（MesOptionVo）：只含 ID、编码与名称 */
  export interface Option {
    code: string;
    id: string;
    name: string;
    /** 上级 ID（车间所属的工厂、产线所属的车间等），没有时为空 */
    parentId?: string;
  }

  /** 状态履历（MesStatusLogVo） */
  export interface StatusLog {
    action: string;
    bizCode?: string;
    fromStatus?: string;
    logId: string;
    operateTime: string;
    operatorName?: string;
    reason?: string;
    toStatus: string;
  }
}

/** MES 接口的前缀（网关与单体相同） */
export const MES_BASE = '/mes';

/**
 * 主数据的下拉选项，例如 getMesOptions('factory') 调用 /mes/factory/options。
 * 带参数时按上级过滤，例如 getMesOptions('workshop', { factoryId })
 */
export function getMesOptions(
  resource: string,
  params?: Record<string, string | undefined>,
) {
  return requestClient.get<MesApi.Option[]>(`${MES_BASE}/${resource}/options`, {
    params,
  });
}

/** 把选项转为 Select 的 options（显示“编码 名称”） */
export function toSelectOptions(options: MesApi.Option[]) {
  return options.map((item) => ({
    label: `${item.code} ${item.name}`,
    value: item.id,
  }));
}
