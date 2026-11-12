<script lang="ts" setup>
import type { OnlineApi } from '@tuoyu/shared/api/monitor/online';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page } from '@vben/common-ui';

import { forceLogout, listOnline } from '@tuoyu/shared/api/monitor/online';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { ElButton, ElMessage, ElPopconfirm, ElTag } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import { useColumns, useSearchSchema } from './data';

defineOptions({ name: 'MonitorOnline' });

/** 是否为当前浏览器自己的会话（由后端按本次请求的令牌标出） */
function isSelf(row: OnlineApi.Online) {
  return row.current === true;
}

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
        // 后端一次返回全部在线会话，在前端分页
        query: async ({ page }, formValues) => {
          const { items } = await listOnline(formValues);
          const start = (page.currentPage - 1) * page.pageSize;
          return {
            items: items.slice(start, start + page.pageSize),
            total: items.length,
          };
        },
      },
    },
    rowConfig: { isHover: true, keyField: 'sessionId' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<OnlineApi.Online>,
});

async function onForceLogout(row: OnlineApi.Online) {
  await forceLogout(row.sessionId);
  ElMessage.success($t('monitor.online.loggedOut', { name: row.userName }));
  gridApi.query();
}
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('monitor.online.list')">
      <template #userName="{ row }">
        <span>{{ row.userName }}</span>
        <ElTag v-if="isSelf(row)" class="ml-2" disable-transitions>
          {{ $t('monitor.online.self') }}
        </ElTag>
      </template>

      <template #actions="{ row }">
        <ElPopconfirm
          v-if="hasPermission('monitor:online:forceLogout') && !isSelf(row)"
          :title="
            $t('monitor.online.confirmForceLogout', { name: row.userName })
          "
          placement="left"
          width="280"
          @confirm="onForceLogout(row)"
        >
          <template #reference>
            <ElButton link size="small" type="danger">
              {{ $t('monitor.online.forceLogoutShort') }}
            </ElButton>
          </template>
          <!-- 气泡确认框只有标题，说明放在按钮上方 -->
          <template #actions="{ confirm, cancel }">
            <p class="mb-2 text-left text-xs text-muted-foreground">
              {{ $t('monitor.online.forceLogoutDesc') }}
            </p>
            <ElButton size="small" @click="cancel">
              {{ $t('common.cancel') }}
            </ElButton>
            <ElButton size="small" type="danger" @click="confirm">
              {{ $t('monitor.online.forceLogout') }}
            </ElButton>
          </template>
        </ElPopconfirm>
      </template>
    </Grid>
  </Page>
</template>
