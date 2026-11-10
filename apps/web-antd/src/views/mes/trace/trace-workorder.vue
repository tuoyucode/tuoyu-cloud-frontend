<script lang="ts" setup>
import type { TraceApi } from '@tuoyu/shared/api/mes/trace';

import { computed } from 'vue';

import {
  Card,
  Descriptions,
  DescriptionsItem,
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
  stockInColumns,
  taskColumns,
} from './data';

/** 一个工单的追溯信息：基本信息与各类生产记录 */
const props = defineProps<{ workorder: TraceApi.Workorder }>();

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
        :tab="$t('mes.trace.tabReports', { count: reports.length })"
      >
        <Table
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
        :tab="
          $t('mes.trace.tabMaterials', { count: workorder.materials.length })
        "
      >
        <Table
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
      <TabPane
        key="quality"
        :tab="
          $t('mes.trace.tabQuality', {
            count: workorder.inspections.length + workorder.defects.length,
          })
        "
      >
        <h4 class="mb-2 font-medium">{{ $t('mes.trace.inspections') }}</h4>
        <Table
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
        <Table
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
        :tab="$t('mes.trace.tabStockIns', { count: workorder.stockIns.length })"
      >
        <Table
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
