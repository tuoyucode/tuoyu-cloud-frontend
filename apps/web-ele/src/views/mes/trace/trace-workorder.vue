<script lang="ts" setup>
import type { TraceApi } from '@tuoyu/shared/api/mes/trace';

import { computed, ref } from 'vue';

import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
import {
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElEmpty,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
} from 'element-plus';

import { $t } from '#/locales';

import EnumTag from '../_shared/enum-tag.vue';
import {
  defectColumns,
  flattenReports,
  inspectionColumns,
  materialColumns,
  qty,
  reportColumns,
  sectionName,
  stockInColumns,
  taskColumns,
} from './data';

/** 一个工单的追溯信息：基本信息与各类生产记录；没有权限的段显示提示 */
const props = withDefaults(
  defineProps<{
    deniedSections?: TraceApi.Section[];
    workorder: TraceApi.Workorder;
  }>(),
  { deniedSections: () => [] },
);

const denied = computed(() => new Set(props.deniedSections));

const activeTab = ref('tasks');

/** 描述列表的列数：超宽屏 3 列，小屏以上 2 列，更窄 1 列 */
const breakpoints = useBreakpoints(breakpointsTailwind);
const isSm = breakpoints.greaterOrEqual('sm');
const isXl = breakpoints.greaterOrEqual('xl');
const descColumns = computed(() => {
  if (isXl.value) {
    return 3;
  }
  return isSm.value ? 2 : 1;
});

/** 占多列的项：不超过当前列数 */
function span(count: number) {
  return Math.min(count, descColumns.value);
}

/** 页签标题：没有权限时不显示数量 */
function tabTitle(
  section: TraceApi.Section,
  key: 'tabMaterials' | 'tabReports' | 'tabStockIns',
  count: number,
) {
  return denied.value.has(section)
    ? $t('mes.trace.tabDenied', { name: sectionName(section) })
    : $t(`mes.trace.${key}`, { count });
}

/** 质量页签：检验与不良都没有权限时不显示数量，否则只计有权限的部分 */
const qualityTitle = computed(() => {
  if (denied.value.has('inspections') && denied.value.has('defects')) {
    return $t('mes.trace.tabDenied', { name: $t('mes.trace.quality') });
  }
  return $t('mes.trace.tabQuality', {
    count: props.workorder.inspections.length + props.workorder.defects.length,
  });
});

const reports = computed(() => flattenReports(props.workorder));

const reportTableColumns = computed(() => [
  {
    key: 'operationName',
    label: $t('mes.trace.operation'),
    prop: 'operationName',
  },
  ...reportColumns(),
]);

/** 数量列：保留后端精度，去掉多余的 0 */
const QTY_FIELDS = new Set([
  'actualQty',
  'defectQty',
  'inspectQty',
  'planQty',
  'qty',
  'qualifiedQty',
]);

function materialRowKey(record: TraceApi.Material) {
  return `${record.requestId}-${record.materialCode}-${record.batchCode}`;
}
</script>

<template>
  <ElCard :body-style="{ padding: '12px 16px' }" shadow="never">
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <span class="font-medium">{{ workorder.workorderCode }}</span>
        <EnumTag :value="workorder.workorderStatus" type="WorkorderStatus" />
      </div>
    </template>
    <ElDescriptions :column="descColumns" border size="small">
      <ElDescriptionsItem :label="$t('mes.trace.product')">
        {{ workorder.materialCode }} {{ workorder.materialName }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.trace.batchCode')">
        <span class="font-mono">{{ workorder.batchCode }}</span>
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.trace.workshop')">
        {{
          [workorder.workshopName, workorder.lineName]
            .filter(Boolean)
            .join(' / ')
        }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.trace.quantities')" :span="span(2)">
        {{
          $t('mes.trace.quantitiesValue', {
            completed: qty(workorder.completedQty),
            defect: qty(workorder.defectQty),
            plan: qty(workorder.planQty),
            stocked: qty(workorder.stockedQty),
            unit: workorder.unit ?? '',
          })
        }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.trace.snCount')">
        {{ workorder.snCount }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.trace.planTime')">
        {{ workorder.planStartTime ?? '-' }} ~
        {{ workorder.planEndTime ?? '-' }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.trace.actualTime')" :span="span(2)">
        {{ workorder.actualStartTime ?? '-' }} ~
        {{ workorder.actualEndTime ?? '-' }}
      </ElDescriptionsItem>
      <ElDescriptionsItem
        v-if="workorder.currentSn"
        :label="$t('mes.trace.currentSn')"
        :span="span(3)"
      >
        <span class="font-mono">{{ workorder.currentSn.snCode }}</span>
        <EnumTag
          :value="workorder.currentSn.snStatus"
          class="ml-2"
          type="SnStatus"
        />
        <span class="text-muted-foreground ml-2">
          {{ workorder.currentSn.createTime }}
        </span>
      </ElDescriptionsItem>
    </ElDescriptions>

    <ElTabs v-model="activeTab" class="mt-2">
      <ElTabPane
        :label="$t('mes.trace.tabTasks', { count: workorder.tasks.length })"
        name="tasks"
      >
        <ElTable :data="workorder.tasks" row-key="taskId" size="small">
          <ElTableColumn
            v-for="column in taskColumns()"
            :key="column.key"
            :label="column.label"
            :prop="column.prop"
            :width="column.width"
          >
            <template #default="{ row }">
              <EnumTag
                v-if="column.key === 'taskStatus'"
                :value="row.taskStatus"
                type="TaskStatus"
              />
              <template v-else-if="QTY_FIELDS.has(column.key)">
                {{ qty(row[column.prop]) }}
              </template>
              <template v-else>{{ row[column.prop] }}</template>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElTabPane>
      <ElTabPane
        :label="tabTitle('reports', 'tabReports', reports.length)"
        name="reports"
      >
        <ElEmpty
          v-if="denied.has('reports')"
          :description="
            $t('mes.trace.noPermission', { name: sectionName('reports') })
          "
          :image-size="60"
        />
        <ElTable v-else :data="reports" row-key="reportId" size="small">
          <ElTableColumn
            v-for="column in reportTableColumns"
            :key="column.key"
            :label="column.label"
            :prop="column.prop"
          >
            <template #default="{ row }">
              <EnumTag
                v-if="column.key === 'reportStatus'"
                :value="row.reportStatus"
                type="ReportStatus"
              />
              <template v-else-if="QTY_FIELDS.has(column.key)">
                {{ qty(row[column.prop]) }}
              </template>
              <template v-else>{{ row[column.prop] }}</template>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElTabPane>
      <ElTabPane
        :label="
          tabTitle('materials', 'tabMaterials', workorder.materials.length)
        "
        name="materials"
      >
        <ElEmpty
          v-if="denied.has('materials')"
          :description="
            $t('mes.trace.noPermission', { name: sectionName('materials') })
          "
          :image-size="60"
        />
        <ElTable
          v-else
          :data="workorder.materials"
          :row-key="materialRowKey"
          size="small"
        >
          <ElTableColumn
            v-for="column in materialColumns()"
            :key="column.key"
            :label="column.label"
            :prop="column.prop"
          >
            <template #default="{ row }">
              <EnumTag
                v-if="column.key === 'requestType'"
                :value="row.requestType"
                type="MaterialRequestType"
              />
              <span v-else-if="column.key === 'batchCode'" class="font-mono">
                {{ row.batchCode }}
              </span>
              <template v-else-if="QTY_FIELDS.has(column.key)">
                {{ qty(row[column.prop]) }}
              </template>
              <template v-else>{{ row[column.prop] }}</template>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElTabPane>
      <ElTabPane :label="qualityTitle" name="quality">
        <h4 class="mb-2 font-medium">{{ $t('mes.trace.inspections') }}</h4>
        <ElEmpty
          v-if="denied.has('inspections')"
          :description="
            $t('mes.trace.noPermission', { name: sectionName('inspections') })
          "
          :image-size="60"
        />
        <ElTable
          v-else
          :data="workorder.inspections"
          row-key="inspectionId"
          size="small"
        >
          <ElTableColumn
            v-for="column in inspectionColumns()"
            :key="column.key"
            :label="column.label"
            :prop="column.prop"
          >
            <template #default="{ row }">
              <EnumTag
                v-if="column.key === 'inspectionType'"
                :value="row.inspectionType"
                type="InspectionType"
              />
              <EnumTag
                v-else-if="column.key === 'inspectionResult'"
                :value="row.inspectionResult"
                type="InspectionResult"
              />
              <template v-else-if="QTY_FIELDS.has(column.key)">
                {{ qty(row[column.prop]) }}
              </template>
              <template v-else>{{ row[column.prop] }}</template>
            </template>
          </ElTableColumn>
        </ElTable>
        <h4 class="mb-2 mt-4 font-medium">{{ $t('mes.trace.defects') }}</h4>
        <ElEmpty
          v-if="denied.has('defects')"
          :description="
            $t('mes.trace.noPermission', { name: sectionName('defects') })
          "
          :image-size="60"
        />
        <ElTable
          v-else
          :data="workorder.defects"
          row-key="defectId"
          size="small"
        >
          <ElTableColumn
            v-for="column in defectColumns()"
            :key="column.key"
            :label="column.label"
            :prop="column.prop"
          >
            <template #default="{ row }">
              <EnumTag
                v-if="column.key === 'sourceType'"
                :value="row.sourceType"
                type="DefectSource"
              />
              <EnumTag
                v-else-if="column.key === 'defectLevel'"
                :value="row.defectLevel"
                type="DefectLevel"
              />
              <EnumTag
                v-else-if="column.key === 'handleStatus'"
                :value="row.handleStatus"
                type="DefectHandleStatus"
              />
              <template v-else-if="QTY_FIELDS.has(column.key)">
                {{ qty(row[column.prop]) }}
              </template>
              <template v-else>{{ row[column.prop] }}</template>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElTabPane>
      <ElTabPane
        :label="tabTitle('stockIns', 'tabStockIns', workorder.stockIns.length)"
        name="stockIns"
      >
        <ElEmpty
          v-if="denied.has('stockIns')"
          :description="
            $t('mes.trace.noPermission', { name: sectionName('stockIns') })
          "
          :image-size="60"
        />
        <ElTable
          v-else
          :data="workorder.stockIns"
          row-key="stockInId"
          size="small"
        >
          <ElTableColumn
            v-for="column in stockInColumns()"
            :key="column.key"
            :label="column.label"
            :prop="column.prop"
          >
            <template #default="{ row }">
              <EnumTag
                v-if="column.key === 'stockInStatus'"
                :value="row.stockInStatus"
                type="StockInStatus"
              />
              <template v-else-if="QTY_FIELDS.has(column.key)">
                {{ qty(row[column.prop]) }}
              </template>
              <template v-else>{{ row[column.prop] }}</template>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElTabPane>
    </ElTabs>
  </ElCard>
</template>
