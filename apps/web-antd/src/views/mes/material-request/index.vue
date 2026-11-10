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
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import {
  Button,
  Dropdown,
  Menu,
  MenuItem,
  message,
  Modal,
  Popconfirm,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';
import EnumTag from '#/views/mes/_shared/enum-tag.vue';
import ProcessDrawer from '#/views/workflow/components/process-drawer.vue';

import {
  approvalDrawerData,
  hasApproval,
  isApproving,
  resultMessageKey,
} from './approval';
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
  message.success(
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

function onCancel(row: MaterialRequestApi.Request) {
  Modal.confirm({
    content: $t('mes.materialRequest.confirmCancel', { code: row.requestCode }),
    okButtonProps: { danger: true },
    okText: $t('mes.materialRequest.cancelRequest'),
    async onOk() {
      await cancelMaterialRequest(row.requestId);
      message.success($t('mes.materialRequest.cancelled'));
      reload();
    },
  });
}

function onDelete(row: MaterialRequestApi.Request) {
  Modal.confirm({
    content: $t('crud.confirmDelete', { name: row.requestCode }),
    okButtonProps: { danger: true },
    okText: $t('mes.materialRequest.delete'),
    async onOk() {
      await removeMaterialRequest([row.requestId]);
      message.success($t('crud.deleted'));
      reload();
    },
  });
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
  Modal.confirm({
    content: $t('mes.materialRequest.confirmWithdraw', {
      code: row.requestCode,
    }),
    okButtonProps: { danger: true },
    okText: $t('mes.materialRequest.withdrawApproval'),
    async onOk() {
      await cancelInstance(businessId);
      message.success($t('mes.materialRequest.withdrawn'));
      reload();
    },
  });
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
          <Button
            v-if="hasPermission('mes:materialRequest:add')"
            type="primary"
            @click="onCreate"
          >
            {{ $t('mes.materialRequest.create') }}
          </Button>
          <Button
            v-if="hasPermission('mes:materialRequest:add')"
            @click="generateApi.open()"
          >
            {{ $t('mes.materialRequest.generateTitle') }}
          </Button>
          <Button
            v-if="hasPermission('mes:materialRequest:export')"
            @click="onExport"
          >
            {{ $t('crud.export') }}
          </Button>
        </div>
      </template>

      <template #requestType="{ row }">
        <EnumTag :value="row.requestType" type="MaterialRequestType" />
      </template>

      <template #requestStatus="{ row }">
        <EnumTag :value="row.requestStatus" type="MaterialRequestStatus" />
      </template>

      <template #actions="{ row }">
        <Button
          v-if="hasPermission('mes:materialRequest:query')"
          size="small"
          type="link"
          @click="onDetail(row)"
        >
          {{ $t('common.detail') }}
        </Button>
        <Button
          v-if="isDraft(row) && hasPermission('mes:materialRequest:edit')"
          size="small"
          type="link"
          @click="onEdit(row)"
        >
          {{ $t('common.edit') }}
        </Button>
        <Popconfirm
          v-if="isDraft(row) && hasPermission('mes:materialRequest:submit')"
          :ok-text="$t('mes.materialRequest.submit')"
          :title="
            $t('mes.materialRequest.confirmSubmit', { code: row.requestCode })
          "
          placement="left"
          @confirm="onSubmit(row)"
        >
          <Button size="small" type="link">
            {{ $t('mes.materialRequest.submit') }}
          </Button>
        </Popconfirm>
        <Button
          v-if="
            isSubmitted(row) && hasPermission('mes:materialRequest:complete')
          "
          size="small"
          type="link"
          @click="onComplete(row)"
        >
          {{ $t('mes.materialRequest.complete') }}
        </Button>
        <Dropdown
          v-if="
            hasPermission('mes:materialRequest:query') ||
            canCancel(row) ||
            canRemove(row) ||
            canWithdraw(row)
          "
        >
          <Button size="small" type="link">{{ $t('common.more') }}</Button>
          <template #overlay>
            <Menu @click="({ key }) => onMore(row, key)">
              <MenuItem
                v-if="hasPermission('mes:materialRequest:query')"
                key="logs"
              >
                {{ $t('mes.materialRequest.logs') }}
              </MenuItem>
              <MenuItem v-if="canViewApproval(row)" key="approval">
                {{ $t('mes.materialRequest.viewApproval') }}
              </MenuItem>
              <MenuItem v-if="canWithdraw(row)" key="withdraw" danger>
                {{ $t('mes.materialRequest.withdrawApproval') }}
              </MenuItem>
              <MenuItem v-if="canCancel(row)" key="cancel" danger>
                {{ $t('mes.materialRequest.cancelRequest') }}
              </MenuItem>
              <MenuItem v-if="canRemove(row)" key="delete" danger>
                {{ $t('mes.materialRequest.delete') }}
              </MenuItem>
            </Menu>
          </template>
        </Dropdown>
      </template>
    </Grid>
  </Page>
</template>
