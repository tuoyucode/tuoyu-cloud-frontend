<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { OnlineApi } from '#/api/monitor/online';

import { Page } from '@vben/common-ui';

import { Button, message, Popconfirm, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { forceLogout, listOnline } from '#/api/monitor/online';
import { $t } from '#/locales';
import { hasPermission } from '#/utils/permission';

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
  message.success($t('monitor.online.loggedOut', { name: row.userName }));
  gridApi.query();
}
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('monitor.online.list')">
      <template #userName="{ row }">
        <span>{{ row.userName }}</span>
        <Tag
          v-if="isSelf(row)"
          :bordered="false"
          class="ml-2"
          color="processing"
        >
          {{ $t('monitor.online.self') }}
        </Tag>
      </template>

      <template #actions="{ row }">
        <Popconfirm
          v-if="hasPermission('monitor:online:forceLogout') && !isSelf(row)"
          :description="$t('monitor.online.forceLogoutDesc')"
          :ok-button-props="{ danger: true }"
          :ok-text="$t('monitor.online.forceLogout')"
          :title="
            $t('monitor.online.confirmForceLogout', { name: row.userName })
          "
          placement="left"
          @confirm="onForceLogout(row)"
        >
          <Button danger size="small" type="link">
            {{ $t('monitor.online.forceLogoutShort') }}
          </Button>
        </Popconfirm>
      </template>
    </Grid>
  </Page>
</template>
