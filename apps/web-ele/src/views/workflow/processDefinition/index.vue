<script lang="ts" setup>
import type { DefinitionApi } from '@tuoyu/shared/api/workflow/definition';

import type { PublishTab } from './data';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';

import {
  activeDefinition,
  copyDefinition,
  exportDefinition,
  listDefinition,
  listUnpublishedDefinition,
  publishDefinition,
  removeDefinition,
  unpublishDefinition,
} from '@tuoyu/shared/api/workflow/definition';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import {
  ElButton,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElMessage,
  ElMessageBox,
  ElRadioButton,
  ElRadioGroup,
  ElSwitch,
  ElTag,
} from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import ActionConfirm from '../components/action-confirm.vue';
import CategoryTree from '../components/category-tree.vue';
import {
  ACTIVE,
  designPath,
  exportFileName,
  PublishStatus,
  publishStatusKey,
  useColumns,
  useSearchSchema,
} from './data';
import DefinitionDrawer from './definition-drawer.vue';
import ImportModal from './import-modal.vue';

defineOptions({ name: 'WorkflowProcessDefinition' });

const router = useRouter();

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: DefinitionDrawer,
  destroyOnClose: true,
});

const [ImportDefinitionModal, importModalApi] = useVbenModal({
  connectedComponent: ImportModal,
  destroyOnClose: true,
});

/** 显示已发布还是未发布的流程 */
const tab = ref<PublishTab>('published');

/** 左侧选中的分类 */
const category = ref<string>();

const selectedCount = ref(0);

/** 正在切换激活状态的行 */
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
          const query = {
            ...toPageQuery(page),
            ...formValues,
            category: category.value,
          };
          return await (tab.value === 'published'
            ? listDefinition(query)
            : listUnpublishedDefinition(query));
        },
      },
    },
    rowConfig: { isHover: true, keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<DefinitionApi.Definition>,
});

function selectedRows() {
  return gridApi.grid.getCheckboxRecords() as DefinitionApi.Definition[];
}

function updateSelectedCount() {
  selectedCount.value = selectedRows().length;
}

function reload() {
  gridApi.query();
}

function onTabChange() {
  gridApi.reload();
}

function onCategoryChange() {
  gridApi.reload();
}

function onCreate() {
  drawerApi.setData({ category: category.value }).open();
}

function onEdit(row: DefinitionApi.Definition) {
  drawerApi.setData({ id: row.id }).open();
}

function onImport() {
  importModalApi.setData({ category: category.value }).open();
}

function onDesign(row: DefinitionApi.Definition) {
  router.push(designPath(row));
}

async function onPublish(row: DefinitionApi.Definition) {
  // 有中间节点未配置办理人时后端拒绝，提示节点名称
  await publishDefinition(row.id);
  ElMessage.success(
    $t('workflow.processDefinition.publishedName', { name: row.flowName }),
  );
  reload();
}

async function onUnpublish(row: DefinitionApi.Definition) {
  await unpublishDefinition(row.id);
  ElMessage.success(
    $t('workflow.processDefinition.unpublishedName', { name: row.flowName }),
  );
  reload();
}

async function onCopy(row: DefinitionApi.Definition) {
  await copyDefinition(row.id);
  ElMessage.success($t('workflow.processDefinition.copied'));
  if (tab.value === 'unpublished') {
    reload();
  }
}

async function onExport(row: DefinitionApi.Definition) {
  await exportDefinition(row.id, exportFileName(row));
}

async function onDelete(row: DefinitionApi.Definition) {
  await removeDefinition([row.id]);
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onBatchDelete() {
  const rows = selectedRows();
  if (rows.length === 0) {
    return;
  }
  try {
    await ElMessageBox.confirm(
      $t('workflow.processDefinition.confirmBatchDelete', {
        count: rows.length,
      }),
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
  await removeDefinition(rows.map((row) => row.id));
  ElMessage.success($t('crud.deleted'));
  reload();
}

async function onActiveChange(row: DefinitionApi.Definition, checked: boolean) {
  switching.value.add(row.id);
  try {
    await activeDefinition(row.id, checked);
    row.activityStatus = checked ? ACTIVE : 0;
    ElMessage.success(
      $t(
        checked
          ? 'workflow.processDefinition.activated'
          : 'workflow.processDefinition.suspended',
        { name: row.flowName },
      ),
    );
  } finally {
    switching.value.delete(row.id);
  }
}

/** 行内“更多”菜单中当前用户有权限的操作 */
const moreActions = computed(() => {
  const actions: { key: string; label: string }[] = [];
  if (hasPermission('workflow:definition:copy')) {
    actions.push({ key: 'copy', label: $t('workflow.processDefinition.copy') });
  }
  if (hasPermission('workflow:definition:export')) {
    actions.push({
      key: 'export',
      label: $t('workflow.processDefinition.export'),
    });
  }
  return actions;
});

function onMoreAction(row: DefinitionApi.Definition, key: string) {
  switch (key) {
    case 'copy': {
      onCopy(row);
      break;
    }
    case 'export': {
      onExport(row);
      break;
    }
  }
}

/** 发布状态的标签类型：已发布为成功色，未发布为警告色，已失效为中性色 */
function publishType(status?: number): 'info' | 'success' | 'warning' {
  switch (status) {
    case PublishStatus.EXPIRED: {
      return 'info';
    }
    case PublishStatus.PUBLISHED: {
      return 'success';
    }
    default: {
      return 'warning';
    }
  }
}
</script>

<template>
  <Page auto-content-height>
    <Drawer @success="reload" />
    <ImportDefinitionModal @success="reload" />
    <div class="flex h-full gap-3">
      <CategoryTree
        v-model:category="category"
        class="hidden w-60 shrink-0 md:flex"
        @change="onCategoryChange"
      />
      <div class="min-w-0 flex-1">
        <Grid :table-title="$t('workflow.processDefinition.list')">
          <template #toolbar-actions>
            <div class="flex flex-wrap items-center gap-2">
              <ElRadioGroup v-model="tab" @change="onTabChange">
                <ElRadioButton value="published">
                  {{ $t('workflow.processDefinition.published') }}
                </ElRadioButton>
                <ElRadioButton value="unpublished">
                  {{ $t('workflow.processDefinition.unpublished') }}
                </ElRadioButton>
              </ElRadioGroup>
              <ElButton
                v-if="hasPermission('workflow:definition:add')"
                type="primary"
                @click="onCreate"
              >
                {{ $t('workflow.processDefinition.create') }}
              </ElButton>
              <ElButton
                v-if="hasPermission('workflow:definition:import')"
                @click="onImport"
              >
                {{ $t('workflow.processDefinition.import') }}
              </ElButton>
              <ElButton
                v-if="hasPermission('workflow:definition:remove')"
                :disabled="selectedCount === 0"
                plain
                type="danger"
                @click="onBatchDelete"
              >
                {{ $t('crud.batchDelete') }}
              </ElButton>
            </div>
          </template>

          <template #isPublish="{ row }">
            <ElTag :type="publishType(row.isPublish)" disable-transitions>
              {{ $t(publishStatusKey(row.isPublish)) }}
            </ElTag>
          </template>

          <template #activityStatus="{ row }">
            <ElSwitch
              :active-text="$t('workflow.processDefinition.active')"
              :disabled="!hasPermission('workflow:definition:active')"
              :inactive-text="$t('workflow.processDefinition.suspend')"
              :loading="switching.has(row.id)"
              :model-value="row.activityStatus === ACTIVE"
              inline-prompt
              @change="(checked) => onActiveChange(row, checked as boolean)"
            />
          </template>

          <template #actions="{ row }">
            <ElButton link size="small" type="primary" @click="onDesign(row)">
              {{
                row.isPublish === PublishStatus.PUBLISHED
                  ? $t('workflow.processDefinition.view')
                  : $t('workflow.processDefinition.design')
              }}
            </ElButton>
            <template v-if="row.isPublish === PublishStatus.PUBLISHED">
              <ActionConfirm
                v-if="hasPermission('workflow:definition:publish')"
                :confirm-text="$t('workflow.processDefinition.unpublish')"
                :description="$t('workflow.processDefinition.unpublishHelp')"
                :title="
                  $t('workflow.processDefinition.confirmUnpublish', {
                    name: row.flowName,
                  })
                "
                @confirm="onUnpublish(row)"
              >
                <ElButton link size="small" type="primary">
                  {{ $t('workflow.processDefinition.unpublish') }}
                </ElButton>
              </ActionConfirm>
            </template>
            <template v-else>
              <ElButton
                v-if="hasPermission('workflow:definition:edit')"
                link
                size="small"
                type="primary"
                @click="onEdit(row)"
              >
                {{ $t('common.edit') }}
              </ElButton>
              <ActionConfirm
                v-if="hasPermission('workflow:definition:publish')"
                :confirm-text="$t('workflow.processDefinition.publish')"
                :description="$t('workflow.processDefinition.publishHelp')"
                :title="
                  $t('workflow.processDefinition.confirmPublish', {
                    name: row.flowName,
                  })
                "
                @confirm="onPublish(row)"
              >
                <ElButton link size="small" type="primary">
                  {{ $t('workflow.processDefinition.publish') }}
                </ElButton>
              </ActionConfirm>
            </template>
            <ActionConfirm
              v-if="hasPermission('workflow:definition:remove')"
              :confirm-text="$t('workflow.processDefinition.delete')"
              :description="$t('workflow.processDefinition.deleteHelp')"
              :title="$t('crud.confirmDelete', { name: row.flowName })"
              danger
              @confirm="onDelete(row)"
            >
              <ElButton link size="small" type="danger">
                {{ $t('common.delete') }}
              </ElButton>
            </ActionConfirm>
            <ElDropdown
              v-if="moreActions.length > 0"
              placement="bottom-end"
              @command="(key: string) => onMoreAction(row, key)"
            >
              <ElButton class="ml-3" link size="small" type="primary">
                {{ $t('workflow.common.more') }}
              </ElButton>
              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem
                    v-for="action in moreActions"
                    :key="action.key"
                    :command="action.key"
                  >
                    {{ action.label }}
                  </ElDropdownItem>
                </ElDropdownMenu>
              </template>
            </ElDropdown>
          </template>
        </Grid>
      </div>
    </div>
  </Page>
</template>
