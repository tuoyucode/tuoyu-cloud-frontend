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
import { ElButton, ElMessage, ElMessageBox, ElPopconfirm } from 'element-plus';

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

/** 危险操作的确认框；取消时返回 false */
async function confirmDanger(
  content: string,
  title: string,
  confirmText: string,
) {
  try {
    await ElMessageBox.confirm(content, title, {
      cancelButtonText: $t('common.cancel'),
      confirmButtonClass: 'el-button--danger',
      confirmButtonText: confirmText,
      type: 'warning',
    });
    return true;
  } catch {
    return false;
  }
}

async function onDelete(row: LogininfoApi.Logininfo) {
  await removeLogininfo([row.infoId]);
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onUnlock(row: LogininfoApi.Logininfo) {
  await unlockAccount(row.userName);
  ElMessage.success($t('monitor.logininfo.unlocked', { name: row.userName }));
}

async function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as LogininfoApi.Logininfo[];
  if (rows.length === 0) {
    return;
  }
  const confirmed = await confirmDanger(
    $t('crud.confirmBatchDelete', { count: rows.length }),
    $t('crud.batchDelete'),
    $t('crud.batchDelete'),
  );
  if (!confirmed) {
    return;
  }
  await removeLogininfo(rows.map((row) => row.infoId));
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onClean() {
  const confirmed = await confirmDanger(
    $t('monitor.logininfo.confirmClean'),
    $t('monitor.logininfo.cleanTitle'),
    $t('monitor.logininfo.clean'),
  );
  if (!confirmed) {
    return;
  }
  await cleanLogininfo();
  ElMessage.success($t('monitor.logininfo.cleaned'));
  reload();
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
          <ElButton
            v-if="hasPermission('monitor:logininfo:remove')"
            :disabled="selectedCount === 0"
            plain
            type="danger"
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('monitor:logininfo:remove')"
            plain
            type="danger"
            @click="onClean"
          >
            {{ $t('monitor.logininfo.clean') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('monitor:logininfo:export')"
            @click="onExport"
          >
            {{ $t('crud.export') }}
          </ElButton>
        </div>
      </template>

      <template #actions="{ row }">
        <ElPopconfirm
          v-if="
            row.status === STATUS_FAILED &&
            hasPermission('monitor:logininfo:unlock')
          "
          :title="$t('monitor.logininfo.confirmUnlock', { name: row.userName })"
          placement="left"
          width="280"
          @confirm="onUnlock(row)"
        >
          <template #reference>
            <ElButton link size="small" type="primary">
              {{ $t('monitor.logininfo.unlockShort') }}
            </ElButton>
          </template>
          <!-- 气泡确认框只有标题，说明放在按钮上方 -->
          <template #actions="{ confirm, cancel }">
            <p class="mb-2 text-left text-xs text-muted-foreground">
              {{ $t('monitor.logininfo.unlockDesc') }}
            </p>
            <ElButton size="small" @click="cancel">
              {{ $t('common.cancel') }}
            </ElButton>
            <ElButton size="small" type="primary" @click="confirm">
              {{ $t('monitor.logininfo.unlock') }}
            </ElButton>
          </template>
        </ElPopconfirm>
        <ElPopconfirm
          v-if="hasPermission('monitor:logininfo:remove')"
          :cancel-button-text="$t('common.cancel')"
          :confirm-button-text="$t('monitor.logininfo.delete')"
          :title="$t('monitor.logininfo.confirmDelete')"
          confirm-button-type="danger"
          placement="left"
          width="240"
          @confirm="onDelete(row)"
        >
          <template #reference>
            <ElButton link size="small" type="danger">
              {{ $t('common.delete') }}
            </ElButton>
          </template>
        </ElPopconfirm>
      </template>
    </Grid>
  </Page>
</template>
