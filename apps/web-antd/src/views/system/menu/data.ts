import type { MenuApi } from '@tuoyu/shared/api/system/menu';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { DictType, getDictOptions } from '@tuoyu/shared/api/system/dict';
import {
  isIconifyName,
  isJsonObject,
  MenuType,
  menuTypeOptions,
  PERMISSION_PATTERN,
  ROOT_PARENT_ID,
} from '@tuoyu/shared/pages/system/menu';

import { z } from '#/adapter/form';
import { $t } from '#/locales';

export {
  isIconifyName,
  MenuType,
  menuTypeOptions,
  ROOT_PARENT_ID,
} from '@tuoyu/shared/pages/system/menu';

/** 可选文本字段的校验：为空时通过 */
function optionalText(test: (value: string) => boolean, message: string) {
  return z
    .string()
    .refine((value) => value === '' || test(value), { message })
    .nullish();
}

/** 只在指定菜单类型下显示的字段 */
function showFor(...types: MenuApi.MenuType[]) {
  return {
    resolve: ({ values }: { values: Record<string, any> }) => ({
      if: types.includes(values.menuType),
    }),
    triggerFields: ['menuType'],
  };
}

/** 查询条件：一行最多 4 个 */
export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: $t('crud.inputPlaceholder') },
      fieldName: 'menuName',
      label: $t('system.menu.menuName'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: menuTypeOptions(),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'menuType',
      label: $t('system.menu.menuType'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: () => getDictOptions(DictType.SHOW_HIDE),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'visible',
      label: $t('system.menu.visible'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: () => getDictOptions(DictType.NORMAL_DISABLE),
        placeholder: $t('crud.selectPlaceholder'),
      },
      fieldName: 'status',
      label: $t('crud.status'),
    },
  ];
}

/** 表格列 */
export function useColumns(): VxeTableGridOptions<MenuApi.Menu>['columns'] {
  return [
    {
      field: 'menuName',
      minWidth: 220,
      slots: { default: 'menuName' },
      title: $t('system.menu.menuName'),
      treeNode: true,
    },
    {
      field: 'menuType',
      slots: { default: 'menuType' },
      title: $t('system.menu.menuType'),
      width: 90,
    },
    { field: 'orderNum', title: $t('crud.sort'), width: 90 },
    { field: 'perms', minWidth: 180, title: $t('system.menu.perms') },
    { field: 'component', minWidth: 180, title: $t('system.menu.component') },
    {
      cellRender: { name: 'CellDict', props: { dictType: DictType.SHOW_HIDE } },
      field: 'visible',
      title: $t('system.menu.visible'),
      width: 90,
    },
    {
      cellRender: {
        name: 'CellDict',
        props: { dictType: DictType.NORMAL_DISABLE },
      },
      field: 'status',
      title: $t('crud.status'),
      width: 90,
    },
    { field: 'createTime', title: $t('crud.createTime'), width: 170 },
    {
      align: 'right',
      field: 'actions',
      fixed: 'right',
      slots: { default: 'actions' },
      title: $t('crud.actions'),
      width: 200,
    },
  ];
}

/**
 * 新增、编辑表单：两列，长字段占整行。按菜单类型显示不同字段：
 * - 目录：图标、路由地址、是否外链、是否显示
 * - 菜单：在目录的基础上增加组件路径、路由参数、权限标识、是否缓存、激活菜单
 * - 按钮：权限标识
 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'TreeSelect',
      // 菜单树在抽屉打开时加载
      componentProps: {
        fieldNames: {
          children: 'children',
          label: 'menuName',
          value: 'menuId',
        },
        placeholder: $t('crud.selectPlaceholder'),
        showSearch: true,
        treeData: [],
        treeDefaultExpandedKeys: [ROOT_PARENT_ID],
        treeNodeFilterProp: 'menuName',
      },
      fieldName: 'parentId',
      formItemClass: 'md:col-span-2',
      label: $t('system.menu.parent'),
      rules: 'selectRequired',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        options: menuTypeOptions(),
        optionType: 'button',
      },
      defaultValue: MenuType.MENU,
      description: $t('system.menu.menuTypeHelp'),
      fieldName: 'menuType',
      formItemClass: 'md:col-span-2',
      label: $t('system.menu.menuType'),
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 50,
        placeholder: $t('system.menu.menuNamePlaceholder'),
      },
      fieldName: 'menuName',
      label: $t('system.menu.menuName'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0 },
      defaultValue: 0,
      fieldName: 'orderNum',
      label: $t('crud.sort'),
      rules: 'required',
    },
    {
      component: 'IconPicker',
      componentProps: {
        placeholder: $t('system.menu.iconPlaceholder'),
        prefix: 'lucide',
      },
      dependencies: showFor(MenuType.DIR, MenuType.MENU),
      description: $t('system.menu.iconHelp'),
      fieldName: 'icon',
      formItemClass: 'md:col-span-2',
      label: $t('system.menu.icon'),
      rules: optionalText(isIconifyName, $t('system.menu.iconInvalid')),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 200,
        placeholder: $t('system.menu.pathPlaceholder'),
      },
      dependencies: showFor(MenuType.DIR, MenuType.MENU),
      description: $t('system.menu.pathHelp'),
      fieldName: 'path',
      label: $t('system.menu.path'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 200,
        placeholder: $t('system.menu.componentPlaceholder'),
      },
      dependencies: showFor(MenuType.MENU),
      description: $t('system.menu.componentHelp'),
      fieldName: 'component',
      label: $t('system.menu.component'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 100,
        placeholder: $t('system.menu.permsPlaceholder'),
      },
      dependencies: showFor(MenuType.MENU, MenuType.BUTTON),
      description: $t('system.menu.permsHelp'),
      fieldName: 'perms',
      label: $t('system.menu.perms'),
      rules: optionalText(
        (value) => PERMISSION_PATTERN.test(value),
        $t('system.menu.permsInvalid'),
      ),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 255,
        placeholder: $t('system.menu.queryParamPlaceholder'),
      },
      dependencies: showFor(MenuType.MENU),
      description: $t('system.menu.queryParamHelp'),
      fieldName: 'queryParam',
      label: $t('system.menu.queryParam'),
      rules: optionalText(isJsonObject, $t('system.menu.queryParamInvalid')),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 255,
        placeholder: $t('system.menu.activeMenuPlaceholder'),
      },
      dependencies: showFor(MenuType.MENU),
      description: $t('system.menu.activeMenuHelp'),
      fieldName: 'activeMenu',
      label: $t('system.menu.activeMenu'),
    },
    {
      component: 'RadioGroup',
      // 选项在抽屉打开时从字典加载
      componentProps: { options: [] },
      defaultValue: 'N',
      dependencies: showFor(MenuType.DIR, MenuType.MENU),
      description: $t('system.menu.isFrameHelp'),
      fieldName: 'isFrame',
      label: $t('system.menu.isFrame'),
    },
    {
      component: 'RadioGroup',
      componentProps: { options: [] },
      defaultValue: 'Y',
      dependencies: showFor(MenuType.MENU),
      description: $t('system.menu.isCacheHelp'),
      fieldName: 'isCache',
      label: $t('system.menu.isCache'),
    },
    {
      component: 'RadioGroup',
      componentProps: { options: [] },
      defaultValue: '0',
      dependencies: showFor(MenuType.DIR, MenuType.MENU),
      description: $t('system.menu.visibleHelp'),
      fieldName: 'visible',
      label: $t('system.menu.visible'),
    },
    {
      component: 'RadioGroup',
      componentProps: { options: [] },
      defaultValue: '0',
      description: $t('system.menu.statusHelp'),
      fieldName: 'status',
      label: $t('crud.status'),
    },
    {
      component: 'Textarea',
      componentProps: {
        maxlength: 500,
        placeholder: $t('crud.remarkPlaceholder'),
        rows: 3,
      },
      fieldName: 'remark',
      formItemClass: 'md:col-span-2',
      label: $t('crud.remark'),
    },
  ];
}

/** 加载表单中依赖字典的选项 */
export async function loadFormOptions() {
  const [yesNo, showHide, status] = await Promise.all([
    getDictOptions(DictType.YES_NO),
    getDictOptions(DictType.SHOW_HIDE),
    getDictOptions(DictType.NORMAL_DISABLE),
  ]);
  return {
    isCache: yesNo,
    isFrame: yesNo,
    status,
    visible: showHide,
  };
}
