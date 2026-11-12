<script lang="ts" setup>
import type { MenuApi } from '@tuoyu/shared/api/system/menu';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  addMenu,
  getMenu,
  listMenu,
  updateMenu,
} from '@tuoyu/shared/api/system/menu';
import { toMenuForm, toMenuParentTree } from '@tuoyu/shared/pages/system/menu';
import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { loadFormOptions, ROOT_PARENT_ID, useFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

/** 编辑时的菜单 ID；新增时为空 */
const menuId = ref<string>();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-4',
});

/** 上级菜单的可选树：编辑时排除本菜单及其下级 */
async function loadParentTree() {
  return toMenuParentTree(await listMenu(), menuId.value);
}

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    drawerApi.lock();
    try {
      const data = toMenuForm((await formApi.getValues()) as MenuApi.Form);
      await (menuId.value
        ? updateMenu({ ...data, menuId: menuId.value })
        : addMenu(data));
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
    const data = drawerApi.getData() as
      | undefined
      | { menuId?: string; values?: Partial<MenuApi.Form> };
    menuId.value = data?.menuId;
    await formApi.resetForm();
    drawerApi.lock();
    try {
      const [options, parentTree] = await Promise.all([
        loadFormOptions(),
        loadParentTree(),
      ]);
      formApi.updateSchema([
        ...Object.entries(options).map(([fieldName, fieldOptions]) => ({
          componentProps: { options: fieldOptions },
          fieldName,
        })),
        { componentProps: { data: parentTree }, fieldName: 'parentId' },
      ]);
      // 新增时的预填值，例如“新增下级”的上级菜单和类型
      await formApi.setValues(
        menuId.value
          ? await getMenu(menuId.value)
          : { parentId: ROOT_PARENT_ID, ...data?.values },
      );
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  menuId.value ? $t('system.menu.edit') : $t('system.menu.create'),
);
</script>

<template>
  <Drawer
    :confirm-text="$t('crud.save')"
    :title="title"
    class="w-full max-w-[640px]"
  >
    <Form />
  </Drawer>
</template>
