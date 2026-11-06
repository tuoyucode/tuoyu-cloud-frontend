<script lang="ts" setup>
import type { MenuRecordRaw } from '@vben/types';

import type { HomeApi } from '#/api/system/home';

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useAccessStore, useUserStore } from '@vben/stores';
import { formatDateTime } from '@vben/utils';

import { Button, Card, Table, Tag } from 'ant-design-vue';

import { DictType, getDictOptions } from '#/api/system/dict';
import { getHomeOverview } from '#/api/system/home';
import { $t } from '#/locales';

defineOptions({ name: 'Home' });

/** 常用功能的候选页面（只显示当前用户菜单中有的） */
const QUICK_LINK_PATHS = [
  '/system/user',
  '/system/role',
  '/system/post',
  '/system/dict',
  '/monitor/online',
  '/tool/gen',
];
const SECURITY_PATH = '/monitor/security';
const OPERLOG_PATH = '/system/log/operlog';

const router = useRouter();
const userStore = useUserStore();
const accessStore = useAccessStore();

const loading = ref(true);
const overview = ref<HomeApi.Overview>();
const operTypes = ref(new Map<string, string>());

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 9) return $t('page.home.greeting.morning');
  if (hour < 12) return $t('page.home.greeting.forenoon');
  if (hour < 18) return $t('page.home.greeting.afternoon');
  return $t('page.home.greeting.evening');
});

/** 当前用户菜单中的全部页面（按完整路径） */
const menuPages = computed(() => {
  const pages = new Map<string, string>();
  const walk = (menus: MenuRecordRaw[]) => {
    for (const menu of menus) {
      if (menu.children?.length) {
        walk(menu.children);
      } else {
        pages.set(menu.path, menu.name);
      }
    }
  };
  walk(accessStore.accessMenus);
  return pages;
});

const quickLinks = computed(() =>
  QUICK_LINK_PATHS.filter((path) => menuPages.value.has(path)).map((path) => ({
    name: menuPages.value.get(path),
    path,
  })),
);

const canOpen = (path: string) => menuPages.value.has(path);

const hasProblems = computed(
  () => (overview.value?.security?.productionProblems ?? 0) > 0,
);

const operationColumns = computed(() => [
  { dataIndex: 'operTime', title: $t('page.home.operTime'), width: 170 },
  { dataIndex: 'operName', title: $t('page.home.operName') },
  { dataIndex: 'title', title: $t('page.home.module') },
  { dataIndex: 'businessType', key: 'type', title: $t('page.home.operType') },
  { dataIndex: 'operIp', title: $t('page.home.operIp') },
  {
    align: 'right' as const,
    dataIndex: 'costTime',
    key: 'cost',
    title: $t('page.home.costTime'),
  },
  { dataIndex: 'status', key: 'status', title: $t('page.home.result') },
]);

function open(path: string) {
  router.push(path);
}

onMounted(async () => {
  try {
    overview.value = await getHomeOverview();
    if (overview.value.recentOperations) {
      const options = await getDictOptions(DictType.OPER_TYPE);
      operTypes.value = new Map(options.map((o) => [o.value, o.label]));
    }
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <Page>
    <div class="flex flex-col gap-4">
      <!-- 问候与运行环境 -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-xl font-semibold">
          {{ greeting }}，{{ userStore.userInfo?.realName }}
        </h2>
        <div v-if="overview" class="flex flex-wrap gap-2">
          <Tag :bordered="false">
            {{ $t('page.home.environment') }} <b>{{ overview.profile }}</b>
          </Tag>
          <Tag :bordered="false">
            {{ $t('page.home.deploymentMode') }}
            <b>{{ $t(`page.home.${overview.deploymentMode}`) }}</b>
          </Tag>
          <Tag :bordered="false">
            {{ $t('page.home.tenant') }}
            <b>{{
              overview.tenantEnabled
                ? $t('page.home.tenantOn')
                : $t('page.home.tenantOff')
            }}</b>
          </Tag>
          <Tag v-if="overview.version" :bordered="false" class="font-mono">
            {{ overview.version }}
          </Tag>
        </div>
      </div>

      <!-- 统计 -->
      <div
        v-if="overview"
        class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Card v-if="overview.onlineUsers !== null" size="small">
          <div class="text-[13px] text-muted-foreground">
            {{ $t('page.home.onlineUsers') }}
          </div>
          <div class="text-[26px] font-semibold tabular-nums">
            {{ overview.onlineUsers }}
          </div>
        </Card>
        <Card v-if="overview.loginStats" size="small">
          <div class="text-[13px] text-muted-foreground">
            {{ $t('page.home.loginRecords') }}
          </div>
          <div class="text-[26px] font-semibold tabular-nums">
            {{ overview.loginStats.total.toLocaleString() }}
          </div>
          <div class="text-xs text-muted-foreground">
            {{
              $t('page.home.loginFailures', {
                count: overview.loginStats.failures,
              })
            }}
          </div>
        </Card>
        <Card v-if="overview.operationStats" size="small">
          <div class="text-[13px] text-muted-foreground">
            {{ $t('page.home.operations') }}
          </div>
          <div class="text-[26px] font-semibold tabular-nums">
            {{ overview.operationStats.total.toLocaleString() }}
          </div>
          <div class="text-xs text-muted-foreground">
            {{
              $t('page.home.operationErrors', {
                count: overview.operationStats.failures,
              })
            }}
          </div>
        </Card>
        <Card
          v-if="overview.security"
          :class="{ 'border-warning': hasProblems }"
          size="small"
        >
          <div class="text-[13px] text-muted-foreground">
            {{ $t('page.home.selfCheck') }}
          </div>
          <div
            :class="{
              'text-warning': hasProblems,
              'text-success': !hasProblems,
            }"
            class="text-[26px] font-semibold tabular-nums"
          >
            {{
              $t('page.home.problems', {
                count: overview.security.productionProblems,
              })
            }}
          </div>
          <div class="text-xs text-muted-foreground">
            {{
              hasProblems
                ? $t('page.home.blockedInProduction')
                : $t('page.home.allPassed')
            }}
          </div>
        </Card>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <!-- 服务状态 -->
        <Card
          v-if="overview?.services"
          :title="$t('page.home.services')"
          class="lg:col-span-2"
          size="small"
        >
          <template #extra>
            <span class="text-xs text-muted-foreground">
              {{ $t('page.home.servicesSource') }}
            </span>
          </template>
          <div class="divide-y divide-border">
            <div
              v-for="service in overview.services"
              :key="service.name"
              class="flex items-center justify-between gap-3 py-2.5"
            >
              <span class="font-mono text-[13px]">{{ service.name }}</span>
              <span class="flex items-center gap-3">
                <span class="text-[13px] text-muted-foreground tabular-nums">
                  {{ $t('page.home.instances', { count: service.instances }) }}
                </span>
                <Tag
                  :color="service.instances > 0 ? 'success' : 'error'"
                  :bordered="false"
                >
                  {{
                    service.instances > 0
                      ? $t('page.home.running')
                      : $t('page.home.noInstance')
                  }}
                </Tag>
              </span>
            </div>
          </div>
        </Card>

        <div class="flex flex-col gap-4">
          <!-- 安全自检摘要 -->
          <Card
            v-if="overview?.security"
            :title="$t('page.home.selfCheck')"
            size="small"
          >
            <template v-if="canOpen(SECURITY_PATH)" #extra>
              <Button size="small" type="link" @click="open(SECURITY_PATH)">
                {{ $t('page.home.viewSecurity') }}
              </Button>
            </template>
            <p :class="hasProblems ? 'text-warning' : 'text-success'">
              {{
                hasProblems
                  ? `${$t('page.home.problems', { count: overview.security.productionProblems })} · ${$t('page.home.blockedInProduction')}`
                  : $t('page.home.allPassed')
              }}
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              {{
                $t('page.home.checkedAt', {
                  time: formatDateTime(overview.security.checkedAt),
                })
              }}
            </p>
          </Card>

          <!-- 常用功能 -->
          <Card
            v-if="quickLinks.length > 0"
            :title="$t('page.home.quickLinks')"
            size="small"
          >
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Button
                v-for="link in quickLinks"
                :key="link.path"
                @click="open(link.path)"
              >
                {{ link.name }}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <!-- 最近操作 -->
      <Card
        v-if="overview?.recentOperations"
        :title="$t('page.home.recentOperations')"
        size="small"
      >
        <template v-if="canOpen(OPERLOG_PATH)" #extra>
          <Button size="small" type="link" @click="open(OPERLOG_PATH)">
            {{ $t('page.home.viewAll') }}
          </Button>
        </template>
        <Table
          :columns="operationColumns"
          :data-source="overview.recentOperations"
          :pagination="false"
          :scroll="{ x: 720 }"
          row-key="operId"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'type'">
              {{ operTypes.get(String(record.businessType)) ?? '-' }}
            </template>
            <template v-else-if="column.key === 'cost'">
              <span class="tabular-nums">{{ record.costTime }} ms</span>
            </template>
            <template v-else-if="column.key === 'status'">
              <Tag
                :color="record.status === 0 ? 'success' : 'error'"
                :bordered="false"
              >
                {{
                  record.status === 0
                    ? $t('page.home.success')
                    : $t('page.home.failure')
                }}
              </Tag>
            </template>
          </template>
        </Table>
      </Card>

      <Card v-if="loading" :loading="true" size="small" />
    </div>
  </Page>
</template>
