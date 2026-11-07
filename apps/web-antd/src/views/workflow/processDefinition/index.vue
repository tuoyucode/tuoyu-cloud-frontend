<script lang="ts" setup>
import type { PublishTab } from './data';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { DefinitionApi } from '#/api/workflow/definition';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';

import {
  Button,
  Dropdown,
  Menu,
  message,
  Modal,
  Popconfirm,
  Radio,
  Switch,
  Tag,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  activeDefinition,
  copyDefinition,
  exportDefinition,
  listDefinition,
  listUnpublishedDefinition,
  publishDefinition,
  removeDefinition,
  unpublishDefinition,
} from '#/api/workflow/definition';
import { $t } from '#/locales';
import { toPageQuery } from '#/utils/page-query';
import { hasPermission } from '#/utils/permission';

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
  message.success(
    $t('workflow.processDefinition.publishedName', { name: row.flowName }),
  );
  reload();
}

async function onUnpublish(row: DefinitionApi.Definition) {
  await unpublishDefinition(row.id);
  message.success(
    $t('workflow.processDefinition.unpublishedName', { name: row.flowName }),
  );
  reload();
}

async function onCopy(row: DefinitionApi.Definition) {
  await copyDefinition(row.id);
  message.success($t('workflow.processDefinition.copied'));
  if (tab.value === 'unpublished') {
    reload();
  }
}

async function onExport(row: DefinitionApi.Definition) {
  await exportDefinition(row.id, exportFileName(row));
}

async function onDelete(row: DefinitionApi.Definition) {
  await removeDefinition([row.id]);
  message.success($t('crud.deleted'));
  reload();
}

function onBatchDelete() {
  const rows = selectedRows();
  if (rows.length === 0) {
    return;
  }
  Modal.confirm({
    content: $t('workflow.processDefinition.confirmBatchDelete', {
      count: rows.length,
    }),
    okButtonProps: { danger: true },
    okText: $t('crud.batchDelete'),
    async onOk() {
      await removeDefinition(rows.map((row) => row.id));
      message.success($t('crud.deleted'));
      reload();
    },
  });
}

async function onActiveChange(row: DefinitionApi.Definition, checked: boolean) {
  switching.value.add(row.id);
  try {
    await activeDefinition(row.id, checked);
    row.activityStatus = checked ? ACTIVE : 0;
    message.success(
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

function publishColor(status?: number) {
  switch (status) {
    case PublishStatus.EXPIRED: {
      return 'default';
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
              <Radio.Group
                v-model:value="tab"
                button-style="solid"
                @change="onTabChange"
              >
                <Radio.Button value="published">
                  {{ $t('workflow.processDefinition.published') }}
                </Radio.Button>
                <Radio.Button value="unpublished">
                  {{ $t('workflow.processDefinition.unpublished') }}
                </Radio.Button>
              </Radio.Group>
              <Button
                v-if="hasPermission('workflow:definition:add')"
                type="primary"
                @click="onCreate"
              >
                {{ $t('workflow.processDefinition.create') }}
              </Button>
              <Button
                v-if="hasPermission('workflow:definition:import')"
                @click="onImport"
              >
                {{ $t('workflow.processDefinition.import') }}
              </Button>
              <Button
                v-if="hasPermission('workflow:definition:remove')"
                :disabled="selectedCount === 0"
                danger
                @click="onBatchDelete"
              >
                {{ $t('crud.batchDelete') }}
              </Button>
            </div>
          </template>

          <template #isPublish="{ row }">
            <Tag :bordered="false" :color="publishColor(row.isPublish)">
              {{ $t(publishStatusKey(row.isPublish)) }}
            </Tag>
          </template>

          <template #activityStatus="{ row }">
            <Switch
              :checked="row.activityStatus === ACTIVE"
              :checked-children="$t('workflow.processDefinition.active')"
              :disabled="!hasPermission('workflow:definition:active')"
              :loading="switching.has(row.id)"
              :un-checked-children="$t('workflow.processDefinition.suspend')"
              @change="(checked) => onActiveChange(row, checked as boolean)"
            />
          </template>

          <template #actions="{ row }">
            <Button size="small" type="link" @click="onDesign(row)">
              {{
                row.isPublish === PublishStatus.PUBLISHED
                  ? $t('workflow.processDefinition.view')
                  : $t('workflow.processDefinition.design')
              }}
            </Button>
            <template v-if="row.isPublish === PublishStatus.PUBLISHED">
              <Popconfirm
                v-if="hasPermission('workflow:definition:publish')"
                :description="$t('workflow.processDefinition.unpublishHelp')"
                :ok-text="$t('workflow.processDefinition.unpublish')"
                :title="
                  $t('workflow.processDefinition.confirmUnpublish', {
                    name: row.flowName,
                  })
                "
                placement="left"
                @confirm="onUnpublish(row)"
              >
                <Button size="small" type="link">
                  {{ $t('workflow.processDefinition.unpublish') }}
                </Button>
              </Popconfirm>
            </template>
            <template v-else>
              <Button
                v-if="hasPermission('workflow:definition:edit')"
                size="small"
                type="link"
                @click="onEdit(row)"
              >
                {{ $t('common.edit') }}
              </Button>
              <Popconfirm
                v-if="hasPermission('workflow:definition:publish')"
                :description="$t('workflow.processDefinition.publishHelp')"
                :ok-text="$t('workflow.processDefinition.publish')"
                :title="
                  $t('workflow.processDefinition.confirmPublish', {
                    name: row.flowName,
                  })
                "
                placement="left"
                @confirm="onPublish(row)"
              >
                <Button size="small" type="link">
                  {{ $t('workflow.processDefinition.publish') }}
                </Button>
              </Popconfirm>
            </template>
            <Popconfirm
              v-if="hasPermission('workflow:definition:remove')"
              :description="$t('workflow.processDefinition.deleteHelp')"
              :ok-button-props="{ danger: true }"
              :ok-text="$t('workflow.processDefinition.delete')"
              :title="$t('crud.confirmDelete', { name: row.flowName })"
              placement="left"
              @confirm="onDelete(row)"
            >
              <Button danger size="small" type="link">
                {{ $t('common.delete') }}
              </Button>
            </Popconfirm>
            <Dropdown v-if="moreActions.length > 0" placement="bottomRight">
              <Button size="small" type="link">
                {{ $t('workflow.common.more') }}
              </Button>
              <template #overlay>
                <Menu
                  :items="moreActions"
                  @click="({ key }) => onMoreAction(row, String(key))"
                />
              </template>
            </Dropdown>
          </template>
        </Grid>
      </div>
    </div>
  </Page>
</template>
