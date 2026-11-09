<script lang="ts" setup>
import type { SecurityApi } from '@tuoyu/shared/api/monitor/security';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { formatDateTime } from '@vben/utils';

import { getSecurityOverview } from '@tuoyu/shared/api/monitor/security';
import { Alert, Card, Switch, Table, Tag } from 'ant-design-vue';

import { $t } from '#/locales';

defineOptions({ name: 'MonitorSecurity' });

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

const checkColumns = computed(() => [
  { dataIndex: 'id', key: 'id', title: $t('monitor.security.id'), width: 72 },
  { key: 'item', title: $t('monitor.security.item') },
  { key: 'status', title: $t('monitor.security.status'), width: 110 },
  { dataIndex: 'action', key: 'action', title: $t('monitor.security.action') },
]);

function statusTag(status: SecurityApi.CheckStatus) {
  switch (status) {
    case 'FAILED': {
      if (overview.value?.production) {
        return { color: 'error', text: $t('monitor.security.failed') };
      }
      return previewProduction.value
        ? { color: 'error', text: $t('monitor.security.blocked') }
        : { color: 'warning', text: $t('monitor.security.warning') };
    }
    case 'NOT_APPLICABLE': {
      return { color: 'default', text: $t('monitor.security.notApplicable') };
    }
    case 'PASSED': {
      return { color: 'success', text: $t('monitor.security.passed') };
    }
    default: {
      return { color: 'default', text: $t('monitor.security.skipped') };
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
      <Card v-if="loading" :loading="true" size="small" />

      <template v-if="overview && banner">
        <Alert
          :description="banner.description"
          :message="banner.message"
          :type="banner.type"
          show-icon
        >
          <template v-if="!overview.production && problems > 0" #action>
            <label class="flex cursor-pointer items-center gap-2 text-[13px]">
              <Switch v-model:checked="previewProduction" size="small" />
              {{ $t('monitor.security.previewProduction') }}
            </label>
          </template>
        </Alert>

        <!-- 启动自检 -->
        <Card :title="$t('monitor.security.selfCheck')" size="small">
          <template #extra>
            <span :title="sourceTitle" class="text-xs text-muted-foreground">
              {{ sourceText }}
            </span>
          </template>
          <Table
            :columns="checkColumns"
            :data-source="overview.checks"
            :pagination="false"
            :scroll="{ x: 720 }"
            row-key="id"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'id'">
                <span class="font-mono text-muted-foreground">
                  {{ record.id }}
                </span>
              </template>
              <template v-else-if="column.key === 'item'">
                <div class="font-medium">{{ record.title }}</div>
                <div
                  v-for="detail in record.details"
                  :key="detail"
                  class="break-all font-mono text-xs text-muted-foreground"
                >
                  {{ detail }}
                </div>
                <div class="text-xs text-muted-foreground">
                  {{
                    record.scope === 'RUNTIME'
                      ? $t('monitor.security.scopeRuntime')
                      : $t('monitor.security.scopeProduction')
                  }}
                  <template
                    v-if="
                      record.status !== 'NOT_APPLICABLE' &&
                      overview.sources.length > 1
                    "
                  >
                    ·
                    {{
                      $t('monitor.security.services', {
                        services: record.services.join(', '),
                      })
                    }}
                  </template>
                </div>
              </template>
              <template v-else-if="column.key === 'status'">
                <Tag :bordered="false" :color="statusTag(record.status).color">
                  {{ statusTag(record.status).text }}
                </Tag>
              </template>
              <template v-else-if="column.key === 'action'">
                <span class="text-[13px] text-muted-foreground">
                  {{ record.action ?? '—' }}
                </span>
              </template>
            </template>
          </Table>
        </Card>

        <!-- 运行时防护 -->
        <Card :title="$t('monitor.security.protections')" size="small">
          <template #extra>
            <span class="text-xs text-muted-foreground">
              {{ $t('monitor.security.protectionsHint') }}
            </span>
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
        </Card>

        <p class="text-xs text-muted-foreground">
          {{ $t('monitor.security.footnote') }}
        </p>
      </template>
    </div>
  </Page>
</template>
