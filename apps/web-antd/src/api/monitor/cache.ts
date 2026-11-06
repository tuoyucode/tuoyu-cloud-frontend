import { requestClient } from '#/api/request';

export namespace CacheApi {
  /** 一条命令的调用次数 */
  export interface CommandStat {
    /** 命令名，例如 get、setex */
    name: string;
    /** 启动以来的调用次数（字符串形式的整数） */
    value: string;
  }

  /** 缓存监控信息（CacheController.CacheListInfoVo） */
  export interface Info {
    /** 命令统计（Redis INFO commandstats） */
    commandStats: CommandStat[];
    /** 当前库的 Key 数量 */
    dbSize: number;
    /** Redis INFO 的全部字段，值均为字符串，例如 redis_version、used_memory_human */
    info: Record<string, string>;
  }
}

export function getCacheInfo() {
  return requestClient.get<CacheApi.Info>('/monitor/cache');
}
