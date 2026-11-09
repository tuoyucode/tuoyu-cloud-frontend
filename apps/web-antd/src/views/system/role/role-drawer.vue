<script lang="ts" setup>
import type { RoleApi } from '@tuoyu/shared/api/system/role';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  addRole,
  getMenuTree,
  getRole,
  getRoleDeptTree,
  getRoleMenuTree,
  updateRole,
  updateRolePermission,
} from '@tuoyu/shared/api/system/role';
import { Alert, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { loadFormOptions, useFormSchema } from './data';
import PermissionTree from './permission-tree.vue';
import { withAncestors } from './tree-utils';

const emit = defineEmits<{ success: [] }>();

/** 字典 sys_normal_disable：1 停用 */
const STATUS_DISABLED = '1';

/** 编辑时的角色；新增时为空 */
const role = ref<RoleApi.Role>();
/** 编辑时角色现有的数据权限，修改菜单权限时原样提交 */
const deptIds = ref<string[]>([]);

const menus = ref<RoleApi.MenuNode[]>([]);
const checkedMenuIds = ref<string[]>([]);
const menuLinkage = ref(true);
/** 菜单权限是否改动过；没改动时编辑只保存基础信息 */
const menuChanged = ref(false);

const permissionTree = ref<InstanceType<typeof PermissionTree>>();

/** 菜单树或角色现有权限没有加载成功（例如没有菜单查询权限） */
const permissionUnavailable = ref(false);

/**
 * 后端查询角色已有的菜单和部门时只看启用的角色，停用角色读到的是空列表，
 * 这时保存权限会清空原有权限，所以停用的角色不能修改权限
 */
const roleDisabled = computed(() => role.value?.status === STATUS_DISABLED);

const permissionLocked = computed(
  () => roleDisabled.value || permissionUnavailable.value,
);

/** 不能修改菜单权限时的说明 */
const lockedTip = computed(() => {
  if (permissionUnavailable.value) {
    return $t('system.role.permissionUnavailable');
  }
  return roleDisabled.value ? $t('system.role.disabledRoleTip') : '';
});

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-4',
});

async function save() {
  const values = (await formApi.getValues()) as RoleApi.Form;
  const menuIds = permissionTree.value?.getSavedKeys() ?? [];
  const current = role.value;
  if (!current) {
    await addRole({
      ...values,
      menuCheckStrictly: menuLinkage.value,
      menuIds,
    });
    return;
  }
  await updateRole({ ...values, roleId: current.roleId });
  if (menuChanged.value && !permissionLocked.value) {
    await updateRolePermission({
      dataScope: current.dataScope ?? '1',
      deptCheckStrictly: current.deptCheckStrictly ?? true,
      deptIds: deptIds.value,
      menuCheckStrictly: menuLinkage.value,
      menuIds,
      roleId: current.roleId,
    });
  }
}

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    drawerApi.lock();
    try {
      await save();
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
    const data = drawerApi.getData() as undefined | { roleId?: string };
    const roleId = data?.roleId;
    role.value = undefined;
    deptIds.value = [];
    menus.value = [];
    checkedMenuIds.value = [];
    menuLinkage.value = true;
    menuChanged.value = false;
    permissionUnavailable.value = false;
    await formApi.resetForm();
    drawerApi.lock();
    try {
      const options = await loadFormOptions();
      formApi.updateSchema([
        { componentProps: { options: options.status }, fieldName: 'status' },
      ]);
      if (!roleId) {
        const tree = await getMenuTree().catch(() => null);
        permissionUnavailable.value = tree === null;
        menus.value = tree ?? [];
        return;
      }
      // 权限树加载失败时仍可修改基础信息
      const [detail, menuTree, deptTree] = await Promise.all([
        getRole(roleId),
        getRoleMenuTree(roleId).catch(() => null),
        getRoleDeptTree(roleId).catch(() => null),
      ]);
      role.value = detail;
      await formApi.setValues(detail);
      if (!menuTree || !deptTree) {
        permissionUnavailable.value = true;
        return;
      }
      menus.value = menuTree.menus;
      menuLinkage.value = detail.menuCheckStrictly ?? true;
      checkedMenuIds.value = menuTree.checkedKeys.map(String);
      // 父子联动时后端返回的部门不含上级，按保存时的规则补全
      const checkedDepts = deptTree.checkedKeys.map(String);
      deptIds.value =
        (detail.deptCheckStrictly ?? true)
          ? withAncestors(deptTree.depts, checkedDepts)
          : checkedDepts;
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  role.value ? $t('system.role.edit') : $t('system.role.create'),
);
</script>

<template>
  <Drawer
    :confirm-text="$t('crud.save')"
    :title="title"
    class="w-full max-w-[640px]"
  >
    <Form />
    <div class="mt-2 flex flex-col gap-2">
      <div class="font-medium">{{ $t('system.role.menuPermission') }}</div>
      <Alert
        v-if="permissionLocked"
        :message="lockedTip"
        show-icon
        type="info"
      />
      <PermissionTree
        ref="permissionTree"
        v-model:checked-keys="checkedMenuIds"
        v-model:linkage="menuLinkage"
        :disabled="permissionLocked"
        :tree-data="menus"
        @change="menuChanged = true"
      />
    </div>
  </Drawer>
</template>
