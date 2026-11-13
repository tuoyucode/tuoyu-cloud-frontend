<script lang="ts" setup>
import type { MaterialRequestApi } from '@tuoyu/shared/api/mes/materialRequest';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { formatDate } from '@vben/utils';

import {
  cancelMaterialRequest,
  exportMaterialRequest,
  getMaterialRequestLogs,
  listMaterialRequest,
  removeMaterialRequest,
  submitMaterialRequest,
} from '@tuoyu/shared/api/mes/materialRequest';
import { cancelInstance } from '@tuoyu/shared/api/workflow/instance';
import {
  approvalDrawerData,
  hasApproval,
  isApproving,
  resultMessageKey,
} from '@tuoyu/shared/pages/mes/material-request';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import {
  ElButton,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElMessage,
  ElMessageBox,
  ElPopconfirm,
} from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';
import EnumTag from '#/views/mes/_shared/enum-tag.vue';
import ProcessDrawer from '#/views/workflow/components/process-drawer.vue';

import CompleteModal from './complete-modal.vue';
import { useColumns, useSearchSchema } from './data';
import DetailDrawer from './detail-drawer.vue';
import GenerateModal from './generate-modal.vue';
import MaterialRequestDrawer from './material-request-drawer.vue';
import StatusLogModal from './status-log-modal.vue';

defineOptions({ name: 'MesMaterialRequest' });

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: MaterialRequestDrawer,
  destroyOnClose: true,
});
const [Detail, detailApi] = useVbenDrawer({
  connectedComponent: DetailDrawer,
  destroyOnClose: true,
});
const [Generate, generateApi] = useVbenModal({
  connectedComponent: GenerateModal,
  destroyOnClose: true,
});
const [Complete, completeApi] = useVbenModal({
  connectedComponent: CompleteModal,
  destroyOnClose: true,
});
const [Logs, logsApi] = useVbenModal({
  connectedComponent: StatusLogModal,
  destroyOnClose: true,
});
const [Approval, approvalApi] = useVbenDrawer({
  connectedComponent: ProcessDrawer,
  destroyOnClose: true,
});

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
        query: async ({ page, sorts }, formValues) =>
          await listMaterialRequest({
            ...toPageQuery(page, sorts),
            ...formValues,
          }),
      },
      sort: true,
    },
    rowConfig: { isHover: true, keyField: 'requestId' },
    sortConfig: { remote: true },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<MaterialRequestApi.Request>,
});

function reload() {
  gridApi.query();
}

function isDraft(row: MaterialRequestApi.Request) {
  return row.requestStatus === 'draft';
}

function isSubmitted(row: MaterialRequestApi.Request) {
  return row.requestStatus === 'submitted';
}

function canCancel(row: MaterialRequestApi.Request) {
  return (
    (isDraft(row) || isSubmitted(row)) &&
    hasPermission('mes:materialRequest:cancel')
  );
}

function canRemove(row: MaterialRequestApi.Request) {
  return isDraft(row) && hasPermission('mes:materialRequest:remove');
}

function canViewApproval(row: MaterialRequestApi.Request) {
  return hasApproval(row) && hasPermission('mes:materialRequest:query');
}

function canWithdraw(row: MaterialRequestApi.Request) {
  return (
    isApproving(row.requestStatus) &&
    hasPermission('mes:materialRequest:submit')
  );
}

function onCreate() {
  formDrawerApi.setData({}).open();
}

function onEdit(row: MaterialRequestApi.Request) {
  formDrawerApi.setData({ requestId: row.requestId }).open();
}

function onDetail(row: MaterialRequestApi.Request) {
  detailApi.setData({ requestId: row.requestId }).open();
}

/** 生成后打开编辑抽屉，便于核对与调整申请数量 */
function onGenerated(requestId: string) {
  reload();
  formDrawerApi.setData({ requestId }).open();
}

async function onSubmit(row: MaterialRequestApi.Request) {
  const status = await submitMaterialRequest(row.requestId);
  ElMessage.success(
    $t(
      resultMessageKey(
        status,
        'mes.materialRequest.submittedForApproval',
        'mes.materialRequest.submitted',
      ),
    ),
  );
  reload();
}

function onComplete(row: MaterialRequestApi.Request) {
  completeApi.setData({ requestId: row.requestId }).open();
}

/**
 * 危险操作的确认框：确认后执行，执行期间确认按钮显示加载，
 * 失败时（原因由请求层提示）确认框保持打开
 */
async function confirmDanger(
  content: string,
  okText: string,
  action: () => Promise<unknown>,
  successKey: string,
) {
  try {
    await ElMessageBox.confirm(content, okText, {
      async beforeClose(type, instance, done) {
        if (type !== 'confirm') {
          done();
          return;
        }
        instance.confirmButtonLoading = true;
        try {
          await action();
          done();
        } catch {
          // 失败原因由请求层提示
        } finally {
          instance.confirmButtonLoading = false;
        }
      },
      cancelButtonText: $t('common.cancel'),
      confirmButtonClass: 'el-button--danger',
      confirmButtonText: okText,
      type: 'warning',
    });
  } catch {
    // 取消
    return;
  }
  ElMessage.success($t(successKey));
  reload();
}

function onCancel(row: MaterialRequestApi.Request) {
  confirmDanger(
    $t('mes.materialRequest.confirmCancel', { code: row.requestCode }),
    $t('mes.materialRequest.cancelRequest'),
    () => cancelMaterialRequest(row.requestId),
    'mes.materialRequest.cancelled',
  );
}

function onDelete(row: MaterialRequestApi.Request) {
  confirmDanger(
    $t('crud.confirmDelete', { name: row.requestCode }),
    $t('mes.materialRequest.delete'),
    () => removeMaterialRequest([row.requestId]),
    'crud.deleted',
  );
}

async function onExport() {
  const query = await gridApi.formApi.getValues();
  const fileName = `${$t('mes.materialRequest.exportFileName')}_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
  await exportMaterialRequest(query, fileName);
}

function onLogs(row: MaterialRequestApi.Request) {
  logsApi
    .setData({
      enumType: 'MaterialRequestStatus',
      load: () => getMaterialRequestLogs(row.requestId),
      title: $t('mes.materialRequest.logsTitle', { code: row.requestCode }),
    })
    .open();
}

/** 审批记录与流程图（框架的流程抽屉，只读） */
function onApproval(row: MaterialRequestApi.Request) {
  if (!row.approvalBusinessId) {
    return;
  }
  approvalApi
    .setData(approvalDrawerData(row.approvalBusinessId, row.requestCode))
    .open();
}

/** 撤销审批：只有发起人可以撤销（工作流校验），撤销后回到草稿 */
function onWithdraw(row: MaterialRequestApi.Request) {
  const businessId = row.approvalBusinessId;
  if (!businessId) {
    return;
  }
  confirmDanger(
    $t('mes.materialRequest.confirmWithdraw', { code: row.requestCode }),
    $t('mes.materialRequest.withdrawApproval'),
    () => cancelInstance(businessId),
    'mes.materialRequest.withdrawn',
  );
}

function onMore(row: MaterialRequestApi.Request, key: number | string) {
  switch (key) {
    case 'approval': {
      onApproval(row);
      break;
    }
    case 'cancel': {
      onCancel(row);
      break;
    }
    case 'delete': {
      onDelete(row);
      break;
    }
    case 'withdraw': {
      onWithdraw(row);
      break;
    }
    default: {
      onLogs(row);
    }
  }
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="reload" />
    <Detail />
    <Generate @success="onGenerated" />
    <Complete @success="reload" />
    <Logs />
    <Approval />
    <Grid :table-title="$t('mes.materialRequest.list')">
      <template #toolbar-actions>
        <div class="flex gap-2">
          <ElButton
            v-if="hasPermission('mes:materialRequest:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('mes.materialRequest.create') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('mes:materialRequest:add')"
            @click="generateApi.open()"
          >
            {{ $t('mes.materialRequest.generateTitle') }}
          </ElButton>
          <ElButton
            v-if="hasPermission('mes:materialRequest:export')"
            @click="onExport"
          >
            {{ $t('crud.export') }}
          </ElButton>
        </div>
      </template>

      <template #requestType="{ row }">
        <EnumTag :value="row.requestType" type="MaterialRequestType" />
      </template>

      <template #requestStatus="{ row }">
        <EnumTag :value="row.requestStatus" type="MaterialRequestStatus" />
      </template>

      <template #actions="{ row }">
        <ElButton
          v-if="hasPermission('mes:materialRequest:query')"
          link
          size="small"
          type="primary"
          @click="onDetail(row)"
        >
          {{ $t('common.detail') }}
        </ElButton>
        <ElButton
          v-if="isDraft(row) && hasPermission('mes:materialRequest:edit')"
          link
          size="small"
          type="primary"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </ElButton>
        <ElPopconfirm
          v-if="isDraft(row) && hasPermission('mes:materialRequest:submit')"
          :cancel-button-text="$t('common.cancel')"
          :confirm-button-text="$t('mes.materialRequest.submit')"
          :title="
            $t('mes.materialRequest.confirmSubmit', { code: row.requestCode })
          "
          placement="left"
          width="260"
          @confirm="onSubmit(row)"
        >
          <template #reference>
            <ElButton link size="small" type="primary">
              {{ $t('mes.materialRequest.submit') }}
            </ElButton>
          </template>
        </ElPopconfirm>
        <ElButton
          v-if="
            isSubmitted(row) && hasPermission('mes:materialRequest:complete')
          "
          link
          size="small"
          type="primary"
          @click="onComplete(row)"
        >
          {{ $t('mes.materialRequest.complete') }}
        </ElButton>
        <ElDropdown
          v-if="
            hasPermission('mes:materialRequest:query') ||
            canCancel(row) ||
            canRemove(row) ||
            canWithdraw(row)
          "
          class="ml-3 align-middle"
          placement="bottom-end"
          trigger="click"
          @command="(key: string) => onMore(row, key)"
        >
          <ElButton link size="small" type="primary">
            {{ $t('common.more') }}
          </ElButton>
          <template #dropdown>
            <ElDropdownMenu>
              <ElDropdownItem
                v-if="hasPermission('mes:materialRequest:query')"
                command="logs"
              >
                {{ $t('mes.materialRequest.logs') }}
              </ElDropdownItem>
              <ElDropdownItem v-if="canViewApproval(row)" command="approval">
                {{ $t('mes.materialRequest.viewApproval') }}
              </ElDropdownItem>
              <ElDropdownItem
                v-if="canWithdraw(row)"
                class="!text-destructive"
                command="withdraw"
              >
                {{ $t('mes.materialRequest.withdrawApproval') }}
              </ElDropdownItem>
              <ElDropdownItem
                v-if="canCancel(row)"
                class="!text-destructive"
                command="cancel"
              >
                {{ $t('mes.materialRequest.cancelRequest') }}
              </ElDropdownItem>
              <ElDropdownItem
                v-if="canRemove(row)"
                class="!text-destructive"
                command="delete"
              >
                {{ $t('mes.materialRequest.delete') }}
              </ElDropdownItem>
            </ElDropdownMenu>
          </template>
        </ElDropdown>
      </template>
    </Grid>
  </Page>
</template>
