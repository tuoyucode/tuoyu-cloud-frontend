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
import { listToTree } from '@tuoyu/shared/utils/tree';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import {
  loadFormOptions,
  MenuType,
  ROOT_PARENT_ID,
  useFormSchema,
} from './data';

const emit = defineEmits<{ success: [] }>();

/** 编辑时的菜单 ID；新增时为空 */
const menuId = ref<string>();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-4',
});

/**
 * 上级菜单的可选树：最上面是“顶级”，按钮不能作为上级；编辑时排除本菜单及其下级
 */
async function loadParentTree() {
  const menus = await listMenu();
  const candidates = menus.filter(
    (menu) => menu.menuType !== MenuType.BUTTON && menu.menuId !== menuId.value,
  );
  // 本菜单被排除后，它的下级找不到上级，会成为根节点，这里一并去掉
  const ids = new Set(candidates.map((menu) => String(menu.menuId)));
  const tree = listToTree(candidates, 'menuId', 'parentId').filter(
    (node) =>
      String(node.parentId) === String(ROOT_PARENT_ID) ||
      ids.has(String(node.parentId)),
  );
  return [
    {
      children: tree,
      menuId: ROOT_PARENT_ID,
      menuName: $t('system.menu.root'),
    },
  ];
}

/**
 * 只提交当前菜单类型用到的字段；隐藏字段使用默认值，避免切换类型后残留旧值
 */
function toSubmit(values: MenuApi.Form): MenuApi.Form {
  const data: MenuApi.Form = {
    ...values,
    isCache: values.isCache ?? 'Y',
    isFrame: values.isFrame ?? 'N',
    visible: values.visible ?? '0',
  };
  if (data.menuType !== MenuType.MENU) {
    data.component = '';
    data.queryParam = '';
    data.activeMenu = '';
  }
  if (data.menuType === MenuType.DIR) {
    data.perms = '';
  }
  if (data.menuType === MenuType.BUTTON) {
    data.path = '';
    data.icon = '';
    data.isFrame = 'N';
    data.visible = '0';
  }
  return data;
}

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    drawerApi.lock();
    try {
      const data = toSubmit((await formApi.getValues()) as MenuApi.Form);
      await (menuId.value
        ? updateMenu({ ...data, menuId: menuId.value })
        : addMenu(data));
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
        { componentProps: { treeData: parentTree }, fieldName: 'parentId' },
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
