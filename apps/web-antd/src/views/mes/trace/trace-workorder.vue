<script lang="ts" setup>
import type { TraceApi } from '@tuoyu/shared/api/mes/trace';

import { computed } from 'vue';

import {
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
  Table,
  TabPane,
  Tabs,
} from 'ant-design-vue';

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
    dataIndex: 'operationName',
    key: 'operationName',
    title: $t('mes.trace.operation'),
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
</script>

<template>
  <Card :title="workorder.workorderCode" size="small">
    <template #extra>
      <EnumTag :value="workorder.workorderStatus" type="WorkorderStatus" />
    </template>
    <Descriptions :column="{ xs: 1, sm: 2, xl: 3 }" bordered size="small">
      <DescriptionsItem :label="$t('mes.trace.product')">
        {{ workorder.materialCode }} {{ workorder.materialName }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.trace.batchCode')">
        <span class="font-mono">{{ workorder.batchCode }}</span>
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.trace.workshop')">
        {{
          [workorder.workshopName, workorder.lineName]
            .filter(Boolean)
            .join(' / ')
        }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.trace.quantities')" :span="2">
        {{
          $t('mes.trace.quantitiesValue', {
            completed: qty(workorder.completedQty),
            defect: qty(workorder.defectQty),
            plan: qty(workorder.planQty),
            stocked: qty(workorder.stockedQty),
            unit: workorder.unit ?? '',
          })
        }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.trace.snCount')">
        {{ workorder.snCount }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.trace.planTime')">
        {{ workorder.planStartTime ?? '-' }} ~
        {{ workorder.planEndTime ?? '-' }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.trace.actualTime')" :span="2">
        {{ workorder.actualStartTime ?? '-' }} ~
        {{ workorder.actualEndTime ?? '-' }}
      </DescriptionsItem>
      <DescriptionsItem
        v-if="workorder.currentSn"
        :label="$t('mes.trace.currentSn')"
        :span="3"
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
      </DescriptionsItem>
    </Descriptions>

    <Tabs class="mt-2">
      <TabPane
        key="tasks"
        :tab="$t('mes.trace.tabTasks', { count: workorder.tasks.length })"
      >
        <Table
          :columns="taskColumns()"
          :data-source="workorder.tasks"
          :pagination="false"
          row-key="taskId"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <EnumTag
              v-if="column.key === 'taskStatus'"
              :value="record.taskStatus"
              type="TaskStatus"
            />
            <template v-else-if="QTY_FIELDS.has(String(column.key))">
              {{ qty(record[String(column.key)]) }}
            </template>
          </template>
        </Table>
      </TabPane>
      <TabPane
        key="reports"
        :tab="tabTitle('reports', 'tabReports', reports.length)"
      >
        <Empty
          v-if="denied.has('reports')"
          :description="
            $t('mes.trace.noPermission', { name: sectionName('reports') })
          "
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
        />
        <Table
          v-else
          :columns="reportTableColumns"
          :data-source="reports"
          :pagination="false"
          row-key="reportId"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <EnumTag
              v-if="column.key === 'reportStatus'"
              :value="record.reportStatus"
              type="ReportStatus"
            />
            <template v-else-if="QTY_FIELDS.has(String(column.key))">
              {{ qty(record[String(column.key)]) }}
            </template>
          </template>
        </Table>
      </TabPane>
      <TabPane
        key="materials"
        :tab="tabTitle('materials', 'tabMaterials', workorder.materials.length)"
      >
        <Empty
          v-if="denied.has('materials')"
          :description="
            $t('mes.trace.noPermission', { name: sectionName('materials') })
          "
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
        />
        <Table
          v-else
          :columns="materialColumns()"
          :data-source="workorder.materials"
          :pagination="false"
          :row-key="
            (record: TraceApi.Material) =>
              `${record.requestId}-${record.materialCode}-${record.batchCode}`
          "
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <EnumTag
              v-if="column.key === 'requestType'"
              :value="record.requestType"
              type="MaterialRequestType"
            />
            <span v-else-if="column.key === 'batchCode'" class="font-mono">
              {{ record.batchCode }}
            </span>
            <template v-else-if="QTY_FIELDS.has(String(column.key))">
              {{ qty(record[String(column.key)]) }}
            </template>
          </template>
        </Table>
      </TabPane>
      <TabPane key="quality" :tab="qualityTitle">
        <h4 class="mb-2 font-medium">{{ $t('mes.trace.inspections') }}</h4>
        <Empty
          v-if="denied.has('inspections')"
          :description="
            $t('mes.trace.noPermission', { name: sectionName('inspections') })
          "
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
        />
        <Table
          v-else
          :columns="inspectionColumns()"
          :data-source="workorder.inspections"
          :pagination="false"
          row-key="inspectionId"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <EnumTag
              v-if="column.key === 'inspectionType'"
              :value="record.inspectionType"
              type="InspectionType"
            />
            <EnumTag
              v-else-if="column.key === 'inspectionResult'"
              :value="record.inspectionResult"
              type="InspectionResult"
            />
            <template v-else-if="QTY_FIELDS.has(String(column.key))">
              {{ qty(record[String(column.key)]) }}
            </template>
          </template>
        </Table>
        <h4 class="mb-2 mt-4 font-medium">{{ $t('mes.trace.defects') }}</h4>
        <Empty
          v-if="denied.has('defects')"
          :description="
            $t('mes.trace.noPermission', { name: sectionName('defects') })
          "
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
        />
        <Table
          v-else
          :columns="defectColumns()"
          :data-source="workorder.defects"
          :pagination="false"
          row-key="defectId"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <EnumTag
              v-if="column.key === 'sourceType'"
              :value="record.sourceType"
              type="DefectSource"
            />
            <EnumTag
              v-else-if="column.key === 'defectLevel'"
              :value="record.defectLevel"
              type="DefectLevel"
            />
            <EnumTag
              v-else-if="column.key === 'handleStatus'"
              :value="record.handleStatus"
              type="DefectHandleStatus"
            />
            <template v-else-if="QTY_FIELDS.has(String(column.key))">
              {{ qty(record[String(column.key)]) }}
            </template>
          </template>
        </Table>
      </TabPane>
      <TabPane
        key="stockIns"
        :tab="tabTitle('stockIns', 'tabStockIns', workorder.stockIns.length)"
      >
        <Empty
          v-if="denied.has('stockIns')"
          :description="
            $t('mes.trace.noPermission', { name: sectionName('stockIns') })
          "
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
        />
        <Table
          v-else
          :columns="stockInColumns()"
          :data-source="workorder.stockIns"
          :pagination="false"
          row-key="stockInId"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <EnumTag
              v-if="column.key === 'stockInStatus'"
              :value="record.stockInStatus"
              type="StockInStatus"
            />
            <template v-else-if="QTY_FIELDS.has(String(column.key))">
              {{ qty(record[String(column.key)]) }}
            </template>
          </template>
        </Table>
      </TabPane>
    </Tabs>
  </Card>
</template>
