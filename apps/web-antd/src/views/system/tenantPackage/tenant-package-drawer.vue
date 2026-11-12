<script lang="ts" setup>
import type { RoleApi } from '@tuoyu/shared/api/system/role';
import type { TenantPackageApi } from '@tuoyu/shared/api/system/tenantPackage';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { getMenuTree } from '@tuoyu/shared/api/system/role';
import {
  addTenantPackage,
  getTenantPackage,
  updateTenantPackage,
} from '@tuoyu/shared/api/system/tenantPackage';
import {
  canShowWithLinkage,
  withoutSelectedAncestors,
} from '@tuoyu/shared/pages/system/permission-tree';
import { Alert, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';
import PermissionTree from '#/views/system/role/permission-tree.vue';

import { loadFormOptions, useFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

/** 编辑时的套餐 ID；新增时为空 */
const packageId = ref<string>();

const menus = ref<RoleApi.MenuNode[]>([]);
/** 界面上勾选的菜单（父子联动时不含半选的上级） */
const checkedMenuIds = ref<string[]>([]);
/** 套餐原有的菜单；菜单树加载失败时原样提交 */
const originalMenuIds = ref<string[]>([]);
/** 父子联动只影响勾选方式，不随套餐保存；联动时保存勾选的菜单加上它们的全部上级 */
const menuLinkage = ref(true);
/** 菜单树没有加载成功（例如没有菜单查询权限） */
const menuUnavailable = ref(false);

const permissionTree = ref<InstanceType<typeof PermissionTree>>();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-4',
});

async function save() {
  const values = (await formApi.getValues()) as TenantPackageApi.Form;
  const menuIds = menuUnavailable.value
    ? originalMenuIds.value
    : (permissionTree.value?.getSavedKeys() ?? []);
  const data: TenantPackageApi.Form = {
    menuIds,
    packageName: values.packageName?.trim(),
    remark: values.remark,
    status: values.status,
  };
  await (packageId.value
    ? updateTenantPackage({ ...data, packageId: packageId.value })
    : addTenantPackage(data));
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
    const data = drawerApi.getData() as undefined | { packageId?: string };
    packageId.value = data?.packageId;
    menus.value = [];
    checkedMenuIds.value = [];
    originalMenuIds.value = [];
    menuLinkage.value = true;
    menuUnavailable.value = false;
    await formApi.resetForm();
    drawerApi.lock();
    try {
      const [options, tree, detail] = await Promise.all([
        loadFormOptions(),
        getMenuTree().catch(() => null),
        packageId.value ? getTenantPackage(packageId.value) : null,
      ]);
      formApi.updateSchema([
        { componentProps: { options: options.status }, fieldName: 'status' },
      ]);
      menuUnavailable.value = tree === null;
      menus.value = tree ?? [];
      if (detail) {
        await formApi.setValues(detail);
        originalMenuIds.value = (detail.menuIds ?? []).map(String);
        // 套餐保存的是勾选的菜单加上全部上级：父子联动显示时去掉有下级被选中的上级；
        // 联动无法原样显示时（例如只选了目录、没选下级）改为不联动，避免打开即改变内容
        menuLinkage.value = canShowWithLinkage(
          menus.value,
          originalMenuIds.value,
        );
        checkedMenuIds.value = menuLinkage.value
          ? withoutSelectedAncestors(menus.value, originalMenuIds.value)
          : originalMenuIds.value;
      }
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  packageId.value
    ? $t('system.tenantPackage.edit')
    : $t('system.tenantPackage.create'),
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
      <div class="font-medium">{{ $t('system.tenantPackage.menus') }}</div>
      <div class="text-muted-foreground text-xs">
        {{ $t('system.tenantPackage.menusHelp') }}
      </div>
      <Alert
        v-if="menuUnavailable"
        :message="$t('system.tenantPackage.menuUnavailable')"
        show-icon
        type="info"
      />
      <PermissionTree
        ref="permissionTree"
        v-model:checked-keys="checkedMenuIds"
        v-model:linkage="menuLinkage"
        :disabled="menuUnavailable"
        :tree-data="menus"
      />
    </div>
  </Drawer>
</template>
