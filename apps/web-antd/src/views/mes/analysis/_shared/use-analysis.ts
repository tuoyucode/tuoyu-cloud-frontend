import type { AnalysisApi } from '@tuoyu/shared/api/mes/analysis';

import type { MesEnumType } from '../../_shared/enums';
import type { AnalysisFilters, LabeledRow, RangeError } from './analysis-utils';

import { ref, watch } from 'vue';

import { exportAnalysis } from '@tuoyu/shared/api/mes/analysis';
import { message } from 'ant-design-vue';

import { $t } from '#/locales';

import { enumLabel } from '../../_shared/enums';
import {
  createFilters,
  exportFileName,
  MAX_DAYS,
  rangeError,
  rowLabel,
  toQuery,
} from './analysis-utils';

/** 统计期间错误的提示 */
export function rangeMessage(error: RangeError) {
  switch (error) {
    case 'empty': {
      return $t('mes.analysis.common.rangeEmpty');
    }
    case 'reversed': {
      return $t('mes.analysis.common.rangeReversed');
    }
    default: {
      return $t('mes.analysis.common.rangeTooLong', { days: MAX_DAYS });
    }
  }
}

/** 统计项的显示名称（按界面语言） */
export function labelOf(row: LabeledRow, dimension?: AnalysisApi.Dimension) {
  return rowLabel(
    row,
    dimension,
    (value) => $t(`mes.analysis.unassigned.${value}`),
    (type, value) => enumLabel(type as MesEnumType, value),
  );
}

/**
 * 报表页面的查询、加载状态与导出：
 * - 统计期间不合法时提示原因，不发请求；
 * - 加载失败时保留上一次的数据并标记 failed（失败原因已由请求层提示），页面显示重试；
 * - 切换维度或时间粒度后自动重新查询，其他条件点“查询”后生效。
 *
 * @param report 报表
 * @param fetch 按查询条件取数
 * @param defaultDimension 默认维度（没有维度的报表不传）
 */
export function useAnalysis<T>(
  report: AnalysisApi.Report,
  fetch: (query: AnalysisApi.Query) => Promise<T>,
  defaultDimension?: AnalysisApi.Dimension,
) {
  const filters = ref<AnalysisFilters>(createFilters(defaultDimension));
  const data = ref<T>();
  const loading = ref(false);
  const failed = ref(false);
  const exporting = ref(false);

  /** 当前条件对应的接口参数；条件不合法时提示并返回 undefined */
  function validQuery(): AnalysisApi.Query | undefined {
    const error = rangeError(filters.value.range);
    if (error) {
      message.warning(rangeMessage(error));
      return undefined;
    }
    return toQuery(filters.value);
  }

  async function load() {
    const query = validQuery();
    if (!query) {
      return;
    }
    loading.value = true;
    failed.value = false;
    try {
      data.value = await fetch(query);
    } catch {
      failed.value = true;
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    const { dimension, granularity } = filters.value;
    filters.value = createFilters(defaultDimension);
    // 维度或粒度有变化时由下面的监听重新查询
    if (
      dimension === filters.value.dimension &&
      granularity === filters.value.granularity
    ) {
      load();
    }
  }

  async function exportRows() {
    const query = validQuery();
    if (!query) {
      return;
    }
    exporting.value = true;
    try {
      await exportAnalysis(
        report,
        query,
        exportFileName($t(`mes.analysis.${report}.title`)),
      );
    } catch {
      // 失败原因（例如超过导出行数上限）已由请求层提示
    } finally {
      exporting.value = false;
    }
  }

  watch(
    () => [filters.value.dimension, filters.value.granularity],
    (current, previous) => {
      if (
        previous &&
        current.some((value, index) => value !== previous[index])
      ) {
        load();
      }
    },
  );

  return { data, exportRows, exporting, failed, filters, load, loading, reset };
}
