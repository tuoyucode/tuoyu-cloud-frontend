import type { MesApi } from '../../api/mes/common';
import type { MesEnumType } from './enums';

/** 状态履历弹窗的参数：标题、状态枚举类型与读取履历的方法 */
export interface StatusLogModalData {
  enumType: MesEnumType;
  load: () => Promise<MesApi.StatusLog[]>;
  title: string;
}
