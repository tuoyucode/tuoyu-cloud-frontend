<script lang="ts" setup>
import type { SnApi } from '@tuoyu/shared/api/mes/sn';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page, useVbenModal } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import { exportSn, listSn } from '@tuoyu/shared/api/mes/sn';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { Button } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import EnumTag from '../_shared/enum-tag.vue';
import { SCRAPPABLE_STATUSES, useColumns, useSearchSchema } from './data';
import SnGenerateModal from './sn-generate-modal.vue';
import SnScrapModal from './sn-scrap-modal.vue';

defineOptions({ name: 'MesSn' });

const [GenerateModal, generateModalApi] = useVbenModal({
  connectedComponent: SnGenerateModal,
  destroyOnClose: true,
});

const [ScrapModal, scrapModalApi] = useVbenModal({
  connectedComponent: SnScrapModal,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useSearchSchema(),
    submitOnChange: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  },
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    pagerConfig: { pageSize: 10, pageSizes: [10, 20, 50, 100] },
    proxyConfig: {
      ajax: {
        query: async ({ page, sorts }, formValues) =>
          await listSn({ ...toPageQuery(page, sorts), ...formValues }),
      },
      sort: true,
    },
    rowConfig: { isHover: true, keyField: 'snId' },
    sortConfig: { remote: true },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<SnApi.Sn>,
});

function reload() {
  gridApi.query();
}

function onGenerate() {
  generateModalApi.open();
}

function onScrap(row: SnApi.Sn) {
  scrapModalApi.setData(row).open();
}

/** 导出当前查询条件下的序列号（用于打印标签） */
async function onExport() {
  const query = await gridApi.formApi.getValues();
  const fileName = `${$t('mes.sn.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportSn(query, fileName);
}
</script>

<template>
  <Page auto-content-height>
    <GenerateModal @success="reload" />
    <ScrapModal @success="reload" />
    <Grid :table-title="$t('mes.sn.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <Button
            v-if="hasPermission('mes:sn:generate')"
            type="primary"
            @click="onGenerate"
          >
            {{ $t('mes.sn.generate') }}
          </Button>
          <Button v-if="hasPermission('mes:sn:export')" @click="onExport">
            {{ $t('mes.sn.exportLabels') }}
          </Button>
        </div>
      </template>

      <template #snCode="{ row }">
        <span class="font-mono">{{ row.snCode }}</span>
      </template>

      <template #snStatus="{ row }">
        <EnumTag :value="row.snStatus" type="SnStatus" />
      </template>

      <template #actions="{ row }">
        <Button
          v-if="
            hasPermission('mes:sn:scrap') &&
            SCRAPPABLE_STATUSES.has(row.snStatus)
          "
          danger
          size="small"
          type="link"
          @click="onScrap(row)"
        >
          {{ $t('mes.sn.scrap') }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
