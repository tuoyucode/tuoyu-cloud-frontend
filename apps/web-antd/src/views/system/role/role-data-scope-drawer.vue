<script lang="ts" setup>
import type { RoleApi } from '#/api/system/role';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Alert, Descriptions, Form, message, Select } from 'ant-design-vue';

import {
  getRole,
  getRoleDeptTree,
  getRoleMenuTree,
  updateRolePermission,
} from '#/api/system/role';
import { $t } from '#/locales';

import { DATA_SCOPE_CUSTOM, useDataScopeOptions } from './data';
import PermissionTree from './permission-tree.vue';
import { withAncestors } from './tree-utils';

const emit = defineEmits<{ success: [] }>();

const scopeOptions = useDataScopeOptions();

const role = ref<RoleApi.Role>();
/** 角色现有的菜单权限，保存数据权限时原样提交 */
const menuIds = ref<string[]>([]);

const dataScope = ref<RoleApi.DataScope>('1');
const depts = ref<RoleApi.DeptNode[]>([]);
const checkedDeptIds = ref<string[]>([]);
const deptLinkage = ref(true);
const loading = ref(false);
/** 加载失败时不允许保存，避免覆盖掉原有权限 */
const loadFailed = ref(false);
/** 自定义数据权限没有勾选部门 */
const deptError = ref(false);

const permissionTree = ref<InstanceType<typeof PermissionTree>>();

const isCustom = computed(() => dataScope.value === DATA_SCOPE_CUSTOM);

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const current = role.value;
    if (!current || loadFailed.value) {
      return;
    }
    const deptIds = isCustom.value
      ? (permissionTree.value?.getSavedKeys() ?? [])
      : [];
    deptError.value = isCustom.value && deptIds.length === 0;
    if (deptError.value) {
      return;
    }
    drawerApi.lock();
    try {
      await updateRolePermission({
        dataScope: dataScope.value,
        deptCheckStrictly: deptLinkage.value,
        deptIds,
        menuCheckStrictly: current.menuCheckStrictly ?? true,
        menuIds: menuIds.value,
        roleId: current.roleId,
      });
      message.success($t('crud.saved'));
      emit('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    const { roleId } = drawerApi.getData() as { roleId: string };
    role.value = undefined;
    menuIds.value = [];
    depts.value = [];
    checkedDeptIds.value = [];
    deptError.value = false;
    loadFailed.value = true;
    loading.value = true;
    drawerApi.lock();
    try {
      const [detail, menuTree, deptTree] = await Promise.all([
        getRole(roleId),
        getRoleMenuTree(roleId),
        getRoleDeptTree(roleId),
      ]);
      role.value = detail;
      dataScope.value = detail.dataScope ?? '1';
      deptLinkage.value = detail.deptCheckStrictly ?? true;
      depts.value = deptTree.depts;
      checkedDeptIds.value = deptTree.checkedKeys.map(String);
      // 父子联动时后端返回的菜单不含上级，按保存时的规则补全
      const checkedMenus = menuTree.checkedKeys.map(String);
      menuIds.value =
        (detail.menuCheckStrictly ?? true)
          ? withAncestors(menuTree.menus, checkedMenus)
          : checkedMenus;
      loadFailed.value = false;
    } finally {
      loading.value = false;
      drawerApi.unlock();
    }
  },
});
</script>

<template>
  <Drawer
    :confirm-text="$t('system.role.saveDataPermission')"
    :title="$t('system.role.dataPermission')"
    class="w-full max-w-[560px]"
  >
    <div class="flex flex-col gap-4">
      <Alert
        v-if="loadFailed && !loading"
        :message="$t('system.role.permissionUnavailable')"
        show-icon
        type="error"
      />
      <Descriptions v-if="role" :column="1" bordered size="small">
        <Descriptions.Item :label="$t('system.role.roleName')">
          {{ role.roleName }}
        </Descriptions.Item>
        <Descriptions.Item :label="$t('system.role.roleKey')">
          <span class="font-mono">{{ role.roleKey }}</span>
        </Descriptions.Item>
      </Descriptions>

      <Form v-if="!loadFailed" layout="vertical">
        <Form.Item
          :extra="$t('system.role.dataScopeHelp')"
          :label="$t('system.role.dataScope')"
          required
        >
          <Select v-model:value="dataScope" :options="scopeOptions" />
        </Form.Item>
        <Form.Item
          v-if="isCustom"
          :help="deptError ? $t('system.role.deptScopeRequired') : undefined"
          :label="$t('system.role.deptScope')"
          :validate-status="deptError ? 'error' : undefined"
          required
        >
          <PermissionTree
            ref="permissionTree"
            v-model:checked-keys="checkedDeptIds"
            v-model:linkage="deptLinkage"
            :tree-data="depts"
            @change="deptError = false"
          />
        </Form.Item>
      </Form>

      <Alert
        v-if="!loadFailed && !isCustom"
        :message="$t('system.role.dataScopeNoDept')"
        show-icon
        type="info"
      />
    </div>
  </Drawer>
</template>
