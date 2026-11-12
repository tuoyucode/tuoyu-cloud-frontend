<script lang="ts" setup>
import type { NoticeApi } from '@tuoyu/shared/api/system/notice';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import {
  listNotice,
  removeNotice,
  updateNotice,
} from '@tuoyu/shared/api/system/notice';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import {
  ElButton,
  ElMessage,
  ElMessageBox,
  ElPopconfirm,
  ElSwitch,
} from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import { useColumns, useSearchSchema } from './data';
import NoticeDrawer from './notice-drawer.vue';

defineOptions({ name: 'SystemNotice' });

/** 字典 sys_notice_status：0 正常，1 关闭 */
const STATUS_NORMAL = '0';
const STATUS_CLOSED = '1';

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: NoticeDrawer,
  destroyOnClose: true,
});

/** 已勾选的行数，用于启用“删除所选” */
const selectedCount = ref(0);

/** 正在切换状态的行，避免重复点击 */
const switching = ref(new Set<string>());

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
        query: async ({ page }, formValues) => {
          selectedCount.value = 0;
          return await listNotice({
            ...toPageQuery(page),
            ...formValues,
          });
        },
      },
    },
    rowConfig: { isHover: true, keyField: 'noticeId' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<NoticeApi.Notice>,
});

function updateSelectedCount() {
  selectedCount.value = gridApi.grid.getCheckboxRecords().length;
}

function reload() {
  gridApi.query();
}

function onCreate() {
  drawerApi.setData({}).open();
}

function onEdit(row: NoticeApi.Notice) {
  drawerApi.setData({ noticeId: row.noticeId }).open();
}

async function onDelete(row: NoticeApi.Notice) {
  await removeNotice([row.noticeId]);
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as NoticeApi.Notice[];
  if (rows.length === 0) {
    return;
  }
  try {
    await ElMessageBox.confirm(
      $t('crud.confirmBatchDelete', { count: rows.length }),
      $t('crud.batchDelete'),
      {
        cancelButtonText: $t('common.cancel'),
        confirmButtonClass: 'el-button--danger',
        confirmButtonText: $t('crud.batchDelete'),
        type: 'warning',
      },
    );
  } catch {
    // 取消
    return;
  }
  await removeNotice(rows.map((row) => row.noticeId));
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onStatusChange(row: NoticeApi.Notice, checked: boolean) {
  const status = checked ? STATUS_NORMAL : STATUS_CLOSED;
  switching.value.add(row.noticeId);
  try {
    // 后端没有单独修改状态的接口，带上整行数据修改（列表数据已包含内容）
    await updateNotice({ ...row, status });
    row.status = status;
    ElMessage.success(
      $t(checked ? 'system.notice.opened' : 'system.notice.closed', {
        name: row.noticeTitle,
      }),
    );
  } finally {
    switching.value.delete(row.noticeId);
  }
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <Grid :table-title="$t('system.notice.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <ElButton
            v-if="hasPermission('system:notice:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('system.notice.create') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('system:notice:remove')"
            :disabled="selectedCount === 0"
            plain
            type="danger"
            @click="onBatchDelete"
          >
            {{ $t('crud.batchDelete') }}
          </ElButton>
        </div>
      </template>

      <template #status="{ row }">
        <ElSwitch
          :disabled="!hasPermission('system:notice:edit')"
          :loading="switching.has(row.noticeId)"
          :model-value="row.status === STATUS_NORMAL"
          @change="(checked) => onStatusChange(row, checked as boolean)"
        />
      </template>

      <template #actions="{ row }">
        <ElButton
          v-if="hasPermission('system:notice:edit')"
          link
          size="small"
          type="primary"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </ElButton>
        <ElPopconfirm
          v-if="hasPermission('system:notice:remove')"
          :cancel-button-text="$t('common.cancel')"
          :confirm-button-text="$t('system.notice.delete')"
          :title="$t('crud.confirmDelete', { name: row.noticeTitle })"
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
