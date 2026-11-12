<script lang="ts" setup>
import type { RoleApi } from '@tuoyu/shared/api/system/role';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  getRole,
  getRoleDeptTree,
  getRoleMenuTree,
  updateRolePermission,
} from '@tuoyu/shared/api/system/role';
import { withAncestors } from '@tuoyu/shared/pages/system/permission-tree';
import {
  ElAlert,
  ElDescriptions,
  ElDescriptionsItem,
  ElForm,
  ElFormItem,
  ElMessage,
  ElOption,
  ElSelect,
} from 'element-plus';

import { $t } from '#/locales';

import { DATA_SCOPE_CUSTOM, useDataScopeOptions } from './data';
import PermissionTree from './permission-tree.vue';

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
      // 权限覆盖接口同时覆盖菜单与数据权限，菜单权限按读到的原样提交
      await updateRolePermission({
        dataScope: dataScope.value,
        deptCheckStrictly: deptLinkage.value,
        deptIds,
        menuCheckStrictly: current.menuCheckStrictly ?? true,
        menuIds: menuIds.value,
        roleId: current.roleId,
      });
      ElMessage.success($t('crud.saved'));
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
      <ElAlert
        v-if="loadFailed && !loading"
        :closable="false"
        :title="$t('system.role.permissionUnavailable')"
        show-icon
        type="error"
      />
      <ElDescriptions v-if="role" :column="1" border size="small">
        <ElDescriptionsItem :label="$t('system.role.roleName')">
          {{ role.roleName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('system.role.roleKey')">
          <span class="font-mono">{{ role.roleKey }}</span>
        </ElDescriptionsItem>
      </ElDescriptions>

      <ElForm v-if="!loadFailed" label-position="top">
        <ElFormItem :label="$t('system.role.dataScope')" required>
          <ElSelect v-model="dataScope" class="w-full">
            <ElOption
              v-for="option in scopeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </ElSelect>
          <div class="text-muted-foreground mt-1 text-xs leading-5">
            {{ $t('system.role.dataScopeHelp') }}
          </div>
        </ElFormItem>
        <ElFormItem
          v-if="isCustom"
          :error="deptError ? $t('system.role.deptScopeRequired') : ''"
          :label="$t('system.role.deptScope')"
          required
        >
          <PermissionTree
            ref="permissionTree"
            v-model:checked-keys="checkedDeptIds"
            v-model:linkage="deptLinkage"
            :tree-data="depts"
            class="w-full"
            @change="deptError = false"
          />
        </ElFormItem>
      </ElForm>

      <ElAlert
        v-if="!loadFailed && !isCustom"
        :closable="false"
        :title="$t('system.role.dataScopeNoDept')"
        show-icon
        type="info"
      />
    </div>
  </Drawer>
</template>
