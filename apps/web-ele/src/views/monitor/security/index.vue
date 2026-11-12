<script lang="ts" setup>
import type { SecurityApi } from '@tuoyu/shared/api/monitor/security';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { formatDateTime } from '@vben/utils';

import { getSecurityOverview } from '@tuoyu/shared/api/monitor/security';
import {
  ElAlert,
  ElCard,
  ElSkeleton,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { $t } from '#/locales';

defineOptions({ name: 'MonitorSecurity' });

/** 卡片内边距：比 Element Plus 默认的 20px 紧凑 */
const CARD_BODY_STYLE = { padding: '12px 16px' };

const loading = ref(true);
const overview = ref<SecurityApi.Overview>();
/** 按生产模式预览：开发模式下的“警告”显示为“拒绝启动” */
const previewProduction = ref(false);

const problems = computed(() => overview.value?.productionProblems ?? 0);

/** 自检结果来自哪些服务：服务名与检查时间，鼠标悬停时显示 */
const sourceText = computed(() => {
  const sources = overview.value?.sources ?? [];
  return sources.length === 0
    ? $t('monitor.security.notChecked')
    : $t('monitor.security.source', {
        services: sources.map((source) => source.service).join(', '),
      });
});
const sourceTitle = computed(() =>
  (overview.value?.sources ?? [])
    .map((source) => `${source.service} · ${formatDateTime(source.checkedAt)}`)
    .join('\n'),
);

const banner = computed(() => {
  if (!overview.value) {
    return null;
  }
  if (overview.value.production) {
    return {
      message: $t('monitor.security.productionMode'),
      type: 'success' as const,
    };
  }
  if (problems.value === 0) {
    return {
      description: $t('monitor.security.allPassedDesc'),
      message: $t('monitor.security.allPassed'),
      type: 'success' as const,
    };
  }
  return previewProduction.value
    ? {
        description: $t('monitor.security.previewProblemsDesc'),
        message: $t('monitor.security.previewProblems', {
          count: problems.value,
        }),
        type: 'error' as const,
      }
    : {
        description: $t('monitor.security.devProblemsDesc'),
        message: $t('monitor.security.devProblems', { count: problems.value }),
        type: 'warning' as const,
      };
});

function statusTag(status: SecurityApi.CheckStatus) {
  switch (status) {
    case 'FAILED': {
      if (overview.value?.production) {
        return { text: $t('monitor.security.failed'), type: 'danger' as const };
      }
      return previewProduction.value
        ? { text: $t('monitor.security.blocked'), type: 'danger' as const }
        : { text: $t('monitor.security.warning'), type: 'warning' as const };
    }
    case 'NOT_APPLICABLE': {
      return {
        text: $t('monitor.security.notApplicable'),
        type: 'info' as const,
      };
    }
    case 'PASSED': {
      return { text: $t('monitor.security.passed'), type: 'success' as const };
    }
    default: {
      return { text: $t('monitor.security.skipped'), type: 'info' as const };
    }
  }
}

/** 运行时防护：名称、当前值、对应的环境变量或配置项 */
const protections = computed(() => {
  const p = overview.value?.protections;
  if (!p) {
    return [];
  }
  const crypto = p.apiCrypto;
  return [
    {
      key: 'TUOYU_REQUEST_MAX_BODY_SIZE',
      label: $t('monitor.security.requestMaxBodySize'),
      value: p.requestMaxBodySize,
    },
    {
      key: 'TUOYU_UPLOAD_MAX_FILE_SIZE',
      label: $t('monitor.security.uploadMaxFileSize'),
      value: p.uploadMaxFileSize,
    },
    {
      key: 'TUOYU_UPLOAD_MAX_REQUEST_SIZE',
      label: $t('monitor.security.uploadMaxRequestSize'),
      value: p.uploadMaxRequestSize,
    },
    {
      key: 'server.jetty.max-http-form-post-size',
      label: $t('monitor.security.formMaxSize'),
      value: p.formMaxSize,
    },
    {
      key: 'TUOYU_SERVER_MAX_THREADS',
      label: $t('monitor.security.maxThreads'),
      value: p.maxThreads.toLocaleString(),
    },
    {
      key: 'tuoyu.page.max-size',
      label: $t('monitor.security.pageMaxSize'),
      value: $t('monitor.security.pageMaxSizeValue', { count: p.pageMaxSize }),
    },
    {
      key: 'tuoyu.excel.max-export-rows',
      label: $t('monitor.security.excelMaxExportRows'),
      value: $t('monitor.security.rowsValue', {
        count: p.excelMaxExportRows.toLocaleString(),
      }),
    },
    {
      key: 'tuoyu.excel.max-import-rows',
      label: $t('monitor.security.excelMaxImportRows'),
      value: $t('monitor.security.rowsValue', {
        count: p.excelMaxImportRows.toLocaleString(),
      }),
    },
    {
      description: $t('monitor.security.trustedProxiesDesc'),
      key: 'TUOYU_TRUSTED_PROXIES',
      label: $t('monitor.security.trustedProxies'),
      value:
        p.trustedProxies.length > 0
          ? p.trustedProxies.join(', ')
          : $t('monitor.security.trustedProxiesNone'),
    },
    {
      description: $t('monitor.security.redisAllowlistDesc', {
        count: p.redisAllowlist.rejected,
        prefixes:
          p.redisAllowlist.extraPrefixes.join(', ') ||
          $t('monitor.security.none'),
      }),
      key: 'tuoyu.redis.allowed-type-prefixes',
      label: $t('monitor.security.redisAllowlist'),
      value: $t('monitor.security.redisAllowlistValue'),
    },
    {
      description: crypto.enabled
        ? [
            $t('monitor.security.apiCryptoDesc', {
              bits: crypto.keySize,
              https: crypto.requireHttps
                ? $t('monitor.security.requireHttps')
                : $t('monitor.security.httpsOptional'),
            }),
            crypto.rotating ? $t('monitor.security.rotating') : '',
          ]
            .filter(Boolean)
            .join(' · ')
        : undefined,
      key: 'TUOYU_API_CRYPTO_PRIVATE_KEY',
      label: $t('monitor.security.apiCrypto'),
      value: crypto.enabled
        ? crypto.algorithm
        : $t('monitor.security.apiCryptoOff'),
      warn: crypto.enabled && !crypto.requireHttps,
    },
    {
      key: 'tuoyu.tenant.enabled',
      label: $t('monitor.security.tenant'),
      value: p.tenantEnabled
        ? $t('monitor.security.tenantOn')
        : $t('monitor.security.tenantOff'),
    },
  ];
});

onMounted(async () => {
  try {
    overview.value = await getSecurityOverview();
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <Page>
    <div class="flex flex-col gap-4">
      <ElCard v-if="loading" :body-style="CARD_BODY_STYLE" shadow="never">
        <ElSkeleton :rows="3" animated />
      </ElCard>

      <template v-if="overview && banner">
        <ElAlert
          :closable="false"
          :title="banner.message"
          :type="banner.type"
          show-icon
        >
          <p v-if="banner.description">{{ banner.description }}</p>
          <label
            v-if="!overview.production && problems > 0"
            class="mt-2 flex cursor-pointer items-center gap-2 text-[13px]"
          >
            <ElSwitch v-model="previewProduction" size="small" />
            {{ $t('monitor.security.previewProduction') }}
          </label>
        </ElAlert>

        <!-- 启动自检 -->
        <ElCard :body-style="CARD_BODY_STYLE" shadow="never">
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <span class="font-medium">
                {{ $t('monitor.security.selfCheck') }}
              </span>
              <span :title="sourceTitle" class="text-xs text-muted-foreground">
                {{ sourceText }}
              </span>
            </div>
          </template>
          <ElTable :data="overview.checks" row-key="id" size="small">
            <ElTableColumn :label="$t('monitor.security.id')" width="72">
              <template #default="{ row }">
                <span class="font-mono text-muted-foreground">
                  {{ row.id }}
                </span>
              </template>
            </ElTableColumn>
            <ElTableColumn :label="$t('monitor.security.item')" min-width="320">
              <template #default="{ row }">
                <div class="font-medium">{{ row.title }}</div>
                <div
                  v-for="detail in row.details"
                  :key="detail"
                  class="break-all font-mono text-xs text-muted-foreground"
                >
                  {{ detail }}
                </div>
                <div class="text-xs text-muted-foreground">
                  {{
                    row.scope === 'RUNTIME'
                      ? $t('monitor.security.scopeRuntime')
                      : $t('monitor.security.scopeProduction')
                  }}
                  <template
                    v-if="
                      row.status !== 'NOT_APPLICABLE' &&
                      overview.sources.length > 1
                    "
                  >
                    ·
                    {{
                      $t('monitor.security.services', {
                        services: row.services.join(', '),
                      })
                    }}
                  </template>
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn :label="$t('monitor.security.status')" width="110">
              <template #default="{ row }">
                <ElTag :type="statusTag(row.status).type" disable-transitions>
                  {{ statusTag(row.status).text }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn
              :label="$t('monitor.security.action')"
              min-width="240"
            >
              <template #default="{ row }">
                <span class="text-[13px] text-muted-foreground">
                  {{ row.action ?? '—' }}
                </span>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElCard>

        <!-- 运行时防护 -->
        <ElCard :body-style="CARD_BODY_STYLE" shadow="never">
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <span class="font-medium">
                {{ $t('monitor.security.protections') }}
              </span>
              <span class="text-xs text-muted-foreground">
                {{ $t('monitor.security.protectionsHint') }}
              </span>
            </div>
          </template>
          <div class="grid grid-cols-1 gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
            <div
              v-for="item in protections"
              :key="item.key"
              class="flex min-w-0 flex-col gap-0.5 border-b border-border py-3"
            >
              <span class="text-[13px] text-muted-foreground">
                {{ item.label }}
              </span>
              <span
                :class="{ 'text-warning': item.warn }"
                class="text-lg font-semibold tabular-nums"
              >
                {{ item.value }}
              </span>
              <span
                v-if="item.description"
                class="text-xs text-muted-foreground"
              >
                {{ item.description }}
              </span>
              <span class="break-all font-mono text-xs text-muted-foreground">
                {{ item.key }}
              </span>
            </div>
          </div>
        </ElCard>

        <p class="text-xs text-muted-foreground">
          {{ $t('monitor.security.footnote') }}
        </p>
      </template>
    </div>
  </Page>
</template>
