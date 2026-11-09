<script lang="ts" setup>
import type { LogininfoApi } from '@tuoyu/shared/api/monitor/logininfo';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import {
  cleanLogininfo,
  exportLogininfo,
  listLogininfo,
  removeLogininfo,
  unlockAccount,
} from '@tuoyu/shared/api/monitor/logininfo';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { Button, message, Modal, Popconfirm } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import { toQuery, useColumns, useSearchSchema } from './data';

defineOptions({ name: 'MonitorLogininfo' });

/** 登录状态：1 失败。账号因密码错误被锁定时，登录日志中一定有失败记录 */
const STATUS_FAILED = '1';

/** 已勾选的行数，用于启用“删除所选” */
const selectedCount = ref(0);

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useSearchSchema(),
    submitOnChange: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  },
  gridEvents: {
    checkboxAll: updateSelectedCount,
    checkboxChange: updateSelectedCount,
  },
  gridOptions: {
    checkboxConfig: { highlight: true },
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    pagerConfig: { pageSize: 10, pageSizes: [10, 20, 50, 100] },
    proxyConfig: {
      ajax: {
        query: async ({ page, sorts }, formValues) => {
          selectedCount.value = 0;
          return await listLogininfo({
            ...toQuery(formValues),
            ...toPageQuery(page, sorts),
          });
        },
      },
      sort: true,
    },
    rowConfig: { isHover: true, keyField: 'infoId' },
    sortConfig: { remote: true, trigger: 'cell' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<LogininfoApi.Logininfo>,
});

function updateSelectedCount() {
  selectedCount.value = gridApi.grid.getCheckboxRecords().length;
}

function reload() {
  gridApi.query();
}

async function onDelete(row: LogininfoApi.Logininfo) {
  await removeLogininfo([row.infoId]);
  message.success($t('crud.deleted'));
  reload();
}

async function onUnlock(row: LogininfoApi.Logininfo) {
  await unlockAccount(row.userName);
  message.success($t('monitor.logininfo.unlocked', { name: row.userName }));
}

function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as LogininfoApi.Logininfo[];
  if (rows.length === 0) {
    return;
  }
  Modal.confirm({
    content: $t('crud.confirmBatchDelete', { count: rows.length }),
    okButtonProps: { danger: true },
    okText: $t('crud.batchDelete'),
    async onOk() {
      await removeLogininfo(rows.map((row) => row.infoId));
      message.success($t('crud.deleted'));
      reload();
    },
  });
}

function onClean() {
  Modal.confirm({
    content: $t('monitor.logininfo.confirmClean'),
    okButtonProps: { danger: true },
    okText: $t('monitor.logininfo.clean'),
    title: $t('monitor.logininfo.cleanTitle'),
    async onOk() {
      await cleanLogininfo();
      message.success($t('monitor.logininfo.cleaned'));
      reload();
    },
  });
}

async function onExport() {
  const values = await gridApi.formApi.getValues();
  const fileName = `${$t('monitor.logininfo.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportLogininfo(toQuery(values), fileName);
}
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('monitor.logininfo.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <Button
            v-if="hasPermission('monitor:logininfo:remove')"
            :disabled="selectedCount === 0"
            danger
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </Button>
          <Button
            v-if="hasPermission('monitor:logininfo:remove')"
            danger
            @click="onClean"
          >
            {{ $t('monitor.logininfo.clean') }}
          </Button>
          <Button
            v-if="hasPermission('monitor:logininfo:export')"
            @click="onExport"
          >
            {{ $t('crud.export') }}
          </Button>
        </div>
      </template>

      <template #actions="{ row }">
        <Popconfirm
          v-if="
            row.status === STATUS_FAILED &&
            hasPermission('monitor:logininfo:unlock')
          "
          :description="$t('monitor.logininfo.unlockDesc')"
          :ok-text="$t('monitor.logininfo.unlock')"
          :title="$t('monitor.logininfo.confirmUnlock', { name: row.userName })"
          placement="left"
          @confirm="onUnlock(row)"
        >
          <Button size="small" type="link">
            {{ $t('monitor.logininfo.unlockShort') }}
          </Button>
        </Popconfirm>
        <Popconfirm
          v-if="hasPermission('monitor:logininfo:remove')"
          :ok-button-props="{ danger: true }"
          :ok-text="$t('monitor.logininfo.delete')"
          :title="$t('monitor.logininfo.confirmDelete')"
          placement="left"
          @confirm="onDelete(row)"
        >
          <Button danger size="small" type="link">
            {{ $t('common.delete') }}
          </Button>
        </Popconfirm>
      </template>
    </Grid>
  </Page>
</template>
