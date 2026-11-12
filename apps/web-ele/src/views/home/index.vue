<script lang="ts" setup>
import type { HomeApi } from '@tuoyu/shared/api/system/home';

import type { MenuRecordRaw } from '@vben/types';

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useAccessStore, useUserStore } from '@vben/stores';
import { formatDateTime } from '@vben/utils';

import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';
import { getHomeOverview } from '@tuoyu/shared/api/system/home';
import {
  ElButton,
  ElCard,
  ElSkeleton,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

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

/** 卡片内边距：比 Element Plus 默认的 20px 紧凑，与统计数字的字号相称 */
const CARD_BODY_STYLE = { padding: '12px 16px' };

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
          <ElTag disable-transitions type="info">
            {{ $t('page.home.environment') }} <b>{{ overview.profile }}</b>
          </ElTag>
          <ElTag disable-transitions type="info">
            {{ $t('page.home.deploymentMode') }}
            <b>{{ $t(`page.home.${overview.deploymentMode}`) }}</b>
          </ElTag>
          <ElTag disable-transitions type="info">
            {{ $t('page.home.tenant') }}
            <b>{{
              overview.tenantEnabled
                ? $t('page.home.tenantOn')
                : $t('page.home.tenantOff')
            }}</b>
          </ElTag>
          <ElTag
            v-if="overview.version"
            class="font-mono"
            disable-transitions
            type="info"
          >
            {{ overview.version }}
          </ElTag>
        </div>
      </div>

      <!-- 统计 -->
      <div
        v-if="overview"
        class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <ElCard
          v-if="overview.onlineUsers !== null"
          :body-style="CARD_BODY_STYLE"
          shadow="never"
        >
          <div class="text-[13px] text-muted-foreground">
            {{ $t('page.home.onlineUsers') }}
          </div>
          <div class="text-[26px] font-semibold tabular-nums">
            {{ overview.onlineUsers }}
          </div>
        </ElCard>
        <ElCard
          v-if="overview.loginStats"
          :body-style="CARD_BODY_STYLE"
          shadow="never"
        >
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
        </ElCard>
        <ElCard
          v-if="overview.operationStats"
          :body-style="CARD_BODY_STYLE"
          shadow="never"
        >
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
        </ElCard>
        <ElCard
          v-if="overview.security"
          :body-style="CARD_BODY_STYLE"
          :class="{ 'border-warning!': hasProblems }"
          shadow="never"
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
        </ElCard>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <!-- 服务状态 -->
        <ElCard
          v-if="overview?.services"
          :body-style="CARD_BODY_STYLE"
          class="lg:col-span-2"
          shadow="never"
        >
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <span class="font-medium">{{ $t('page.home.services') }}</span>
              <span class="text-xs text-muted-foreground">
                {{ $t('page.home.servicesSource') }}
              </span>
            </div>
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
                <ElTag
                  :type="service.instances > 0 ? 'success' : 'danger'"
                  disable-transitions
                >
                  {{
                    service.instances > 0
                      ? $t('page.home.running')
                      : $t('page.home.noInstance')
                  }}
                </ElTag>
              </span>
            </div>
          </div>
        </ElCard>

        <div class="flex flex-col gap-4">
          <!-- 安全自检摘要 -->
          <ElCard
            v-if="overview?.security"
            :body-style="CARD_BODY_STYLE"
            shadow="never"
          >
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <span class="font-medium">{{ $t('page.home.selfCheck') }}</span>
                <ElButton
                  v-if="canOpen(SECURITY_PATH)"
                  link
                  size="small"
                  type="primary"
                  @click="open(SECURITY_PATH)"
                >
                  {{ $t('page.home.viewSecurity') }}
                </ElButton>
              </div>
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
          </ElCard>

          <!-- 常用功能 -->
          <ElCard
            v-if="quickLinks.length > 0"
            :body-style="CARD_BODY_STYLE"
            shadow="never"
          >
            <template #header>
              <span class="font-medium">{{ $t('page.home.quickLinks') }}</span>
            </template>
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <ElButton
                v-for="link in quickLinks"
                :key="link.path"
                class="!ml-0"
                @click="open(link.path)"
              >
                {{ link.name }}
              </ElButton>
            </div>
          </ElCard>
        </div>
      </div>

      <!-- 最近操作 -->
      <ElCard
        v-if="overview?.recentOperations"
        :body-style="CARD_BODY_STYLE"
        shadow="never"
      >
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <span class="font-medium">
              {{ $t('page.home.recentOperations') }}
            </span>
            <ElButton
              v-if="canOpen(OPERLOG_PATH)"
              link
              size="small"
              type="primary"
              @click="open(OPERLOG_PATH)"
            >
              {{ $t('page.home.viewAll') }}
            </ElButton>
          </div>
        </template>
        <ElTable
          :data="overview.recentOperations"
          row-key="operId"
          size="small"
        >
          <ElTableColumn
            :label="$t('page.home.operTime')"
            prop="operTime"
            width="170"
          />
          <ElTableColumn
            :label="$t('page.home.operName')"
            min-width="100"
            prop="operName"
          />
          <ElTableColumn
            :label="$t('page.home.module')"
            min-width="120"
            prop="title"
          />
          <ElTableColumn :label="$t('page.home.operType')" min-width="90">
            <template #default="{ row }">
              {{ operTypes.get(String(row.businessType)) ?? '-' }}
            </template>
          </ElTableColumn>
          <ElTableColumn
            :label="$t('page.home.operIp')"
            min-width="120"
            prop="operIp"
          />
          <ElTableColumn
            :label="$t('page.home.costTime')"
            align="right"
            min-width="90"
          >
            <template #default="{ row }">
              <span class="tabular-nums">{{ row.costTime }} ms</span>
            </template>
          </ElTableColumn>
          <ElTableColumn :label="$t('page.home.result')" min-width="80">
            <template #default="{ row }">
              <ElTag
                :type="row.status === 0 ? 'success' : 'danger'"
                disable-transitions
              >
                {{
                  row.status === 0
                    ? $t('page.home.success')
                    : $t('page.home.failure')
                }}
              </ElTag>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElCard>

      <ElCard v-if="loading" :body-style="CARD_BODY_STYLE" shadow="never">
        <ElSkeleton :rows="3" animated />
      </ElCard>
    </div>
  </Page>
</template>
