<script lang="ts" setup>
import type { UserApi } from '@tuoyu/shared/api/system/user';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  assignRoleUsers,
  listUnallocatedUser,
} from '@tuoyu/shared/api/system/role';
import { toPageQuery } from '@tuoyu/shared/utils/page-query';
import { ElMessage } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import { useUserColumns, useUserSearchSchema } from './data';

const emit = defineEmits<{ success: [] }>();

type RoleRef = { roleId: string; roleName: string };

/** 要分配的角色 */
const role = ref<RoleRef>();

const selectedCount = ref(0);

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useUserSearchSchema(),
    submitOnChange: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-2',
  },
  gridEvents: {
    checkboxAll: updateSelectedCount,
    checkboxChange: updateSelectedCount,
  },
  gridOptions: {
    checkboxConfig: { highlight: true, reserve: true },
    columns: useUserColumns(false),
    height: 480,
    pagerConfig: { pageSize: 10, pageSizes: [10, 20, 50, 100] },
    proxyConfig: {
      ajax: {
        // 表格在弹窗打开后才渲染，此时已经能取到角色
        query: async ({ page }, formValues) => {
          const current = modalApi.getData() as RoleRef | undefined;
          if (!current) {
            return { items: [], total: 0 };
          }
          return await listUnallocatedUser({
            ...toPageQuery(page),
            ...formValues,
            roleId: current.roleId,
          });
        },
      },
    },
    rowConfig: { isHover: true, keyField: 'userId' },
    toolbarConfig: { refresh: true },
  } as VxeTableGridOptions<UserApi.User>,
});

/** 已勾选的用户，翻页后保留 */
function selectedUsers(): UserApi.User[] {
  return [
    ...gridApi.grid.getCheckboxReserveRecords(),
    ...gridApi.grid.getCheckboxRecords(),
  ] as UserApi.User[];
}

function updateSelectedCount() {
  selectedCount.value = selectedUsers().length;
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const users = selectedUsers();
    if (!role.value || users.length === 0) {
      ElMessage.warning($t('system.role.noUserSelected'));
      return;
    }
    modalApi.lock();
    try {
      await assignRoleUsers(
        role.value.roleId,
        users.map((user) => user.userId),
      );
      ElMessage.success($t('system.role.usersAdded', { count: users.length }));
      emit('success');
      modalApi.close();
    } finally {
      modalApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      role.value = modalApi.getData() as RoleRef;
      selectedCount.value = 0;
    }
  },
});
</script>

<template>
  <Modal
    :confirm-text="$t('system.role.addSelectedUsers', { count: selectedCount })"
    :title="$t('system.role.selectUsersTitle', { name: role?.roleName ?? '' })"
    class="w-full max-w-[880px]"
  >
    <Grid />
  </Modal>
</template>
