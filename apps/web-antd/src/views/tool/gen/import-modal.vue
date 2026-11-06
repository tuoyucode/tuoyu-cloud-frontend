<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { GenApi } from '#/api/tool/gen';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { importTables, listDbTable } from '#/api/tool/gen';
import { $t } from '#/locales';

import { useImportColumns, useImportSearchSchema } from './data';

const emit = defineEmits<{ success: [] }>();

const DEFAULT_DATA_NAME = 'master';

const selectedCount = ref(0);

/** 查询时使用的数据源：导入时必须与列表中的表来自同一个数据源 */
const dataName = ref(DEFAULT_DATA_NAME);

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useImportSearchSchema(),
    submitOnChange: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-3',
  },
  gridEvents: {
    checkboxAll: updateSelectedCount,
    checkboxChange: updateSelectedCount,
  },
  gridOptions: {
    checkboxConfig: { highlight: true, reserve: true },
    columns: useImportColumns(),
    height: 480,
    pagerConfig: { pageSize: 10, pageSizes: [10, 20, 50, 100] },
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const next = formValues?.dataName || DEFAULT_DATA_NAME;
          if (next !== dataName.value) {
            // 换了数据源，之前勾选的表不再适用
            gridApi.grid.clearCheckboxReserve();
            gridApi.grid.clearCheckboxRow();
            dataName.value = next;
          }
          updateSelectedCount();
          return await listDbTable({
            pageNum: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
            dataName: next,
          });
        },
      },
    },
    rowConfig: { isHover: true, keyField: 'tableName' },
    toolbarConfig: { refresh: true },
  } as VxeTableGridOptions<GenApi.DbTable>,
});

/** 已勾选的表，翻页后保留 */
function selectedTables(): GenApi.DbTable[] {
  return [
    ...gridApi.grid.getCheckboxReserveRecords(),
    ...gridApi.grid.getCheckboxRecords(),
  ] as GenApi.DbTable[];
}

function updateSelectedCount() {
  selectedCount.value = selectedTables().length;
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const tables = selectedTables();
    if (tables.length === 0) {
      message.warning($t('tool.gen.noTableSelected'));
      return;
    }
    modalApi.lock();
    try {
      await importTables(
        tables.map((table) => table.tableName),
        dataName.value,
      );
      message.success($t('tool.gen.imported', { count: tables.length }));
      emit('success');
      modalApi.close();
    } finally {
      modalApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      selectedCount.value = 0;
      dataName.value = DEFAULT_DATA_NAME;
    }
  },
});
</script>

<template>
  <Modal
    :confirm-text="$t('tool.gen.importSelected', { count: selectedCount })"
    :title="$t('tool.gen.importTitle')"
    class="w-full max-w-[880px]"
  >
    <Grid />
  </Modal>
</template>
