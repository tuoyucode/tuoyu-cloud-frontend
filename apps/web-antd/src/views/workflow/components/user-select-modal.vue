<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { UserApi } from '#/api/system/user';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { listUserOptions } from '#/api/system/user';
import { $t } from '#/locales';

/**
 * 选择用户（转办、委派、加签、抄送、修改办理人等）。
 * 打开时传入 { multiple, title, excludeIds }；确认后触发 select，参数为选中的用户
 */
const emit = defineEmits<{ select: [users: UserApi.Option[]] }>();

type OpenData = {
  /** 不能选择的用户，例如当前办理人 */
  excludeIds?: string[];
  multiple?: boolean;
  title?: string;
};

const multiple = ref(false);
const title = ref('');
const excludeIds = ref(new Set<string>());
const selectedCount = ref(0);

const searchSchema: VbenFormSchema[] = [
  {
    component: 'Input',
    componentProps: { placeholder: $t('crud.inputPlaceholder') },
    fieldName: 'userName',
    label: $t('workflow.common.userName'),
  },
  {
    component: 'Input',
    componentProps: { placeholder: $t('crud.inputPlaceholder') },
    fieldName: 'nickName',
    label: $t('workflow.common.nickName'),
  },
];

/** 表格列：单选时第一列为单选框，多选时为复选框 */
function userColumns(
  isMultiple: boolean,
): VxeTableGridOptions<UserApi.Option>['columns'] {
  return [
    { type: isMultiple ? 'checkbox' : 'radio', width: 48 },
    { field: 'userName', minWidth: 120, title: $t('workflow.common.userName') },
    { field: 'nickName', minWidth: 120, title: $t('workflow.common.nickName') },
    { field: 'deptName', minWidth: 140, title: $t('workflow.common.dept') },
  ];
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: searchSchema,
    submitOnChange: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-2',
  },
  gridEvents: {
    checkboxAll: updateSelectedCount,
    checkboxChange: updateSelectedCount,
    radioChange: updateSelectedCount,
  },
  gridOptions: {
    checkboxConfig: {
      checkMethod: ({ row }) => !excludeIds.value.has(String(row.userId)),
      highlight: true,
      reserve: true,
    },
    columns: userColumns(false),
    height: 460,
    pagerConfig: { pageSize: 10, pageSizes: [10, 20, 50, 100] },
    proxyConfig: {
      ajax: {
        // 选择用户接口只要求登录（办理人通常没有用户管理权限），只返回正常状态的用户
        query: async ({ page }, formValues) =>
          await listUserOptions({
            pageNum: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          }),
      },
    },
    radioConfig: {
      checkMethod: ({ row }) => !excludeIds.value.has(String(row.userId)),
      highlight: true,
      reserve: true,
    },
    rowConfig: { isHover: true, keyField: 'userId' },
    toolbarConfig: { refresh: true },
  } as VxeTableGridOptions<UserApi.Option>,
});

function selectedUsers(): UserApi.Option[] {
  const grid = gridApi.grid;
  if (multiple.value) {
    return [
      ...grid.getCheckboxReserveRecords(),
      ...grid.getCheckboxRecords(),
    ] as UserApi.Option[];
  }
  const row = (grid.getRadioRecord() ?? grid.getRadioReserveRecord()) as
    | undefined
    | UserApi.Option;
  return row ? [row] : [];
}

function updateSelectedCount() {
  selectedCount.value = selectedUsers().length;
}

/** 按单选、多选切换第一列 */
function applyMode() {
  gridApi.setGridOptions({ columns: userColumns(multiple.value) });
}

const [Modal, modalApi] = useVbenModal({
  onConfirm() {
    const users = selectedUsers();
    if (users.length === 0) {
      message.warning($t('workflow.common.noUserSelected'));
      return;
    }
    emit('select', users);
    modalApi.close();
  },
  onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    const data = (modalApi.getData() ?? {}) as OpenData;
    multiple.value = !!data.multiple;
    title.value = data.title || $t('workflow.common.selectUser');
    excludeIds.value = new Set((data.excludeIds ?? []).map(String));
    selectedCount.value = 0;
    applyMode();
  },
});
</script>

<template>
  <Modal
    :confirm-text="
      multiple
        ? $t('workflow.common.confirmUsers', { count: selectedCount })
        : $t('workflow.common.confirmUser')
    "
    :title="title"
    class="w-full max-w-[880px]"
  >
    <Grid />
  </Modal>
</template>
