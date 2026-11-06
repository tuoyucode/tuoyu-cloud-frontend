<script lang="ts" setup>
import type { DeptApi } from '#/api/system/dept';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addDept,
  getDept,
  listDept,
  listDeptExcludeChild,
  listDeptUsers,
  updateDept,
} from '#/api/system/dept';
import { DictType, getDictOptions } from '#/api/system/dict';
import { $t } from '#/locales';
import { hasPermission } from '#/utils/permission';
import { listToTree } from '#/utils/tree';

import {
  isRootDept,
  leaderLabel,
  ROOT_PARENT_ID,
  STATUS_NORMAL,
  useFormSchema,
} from './data';

const emit = defineEmits<{ success: [] }>();

/** 编辑时的部门 ID；新增时为空 */
const deptId = ref<string>();

/** 编辑的是否根部门（没有上级） */
const editingRoot = ref(false);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-4',
});

/**
 * 上级部门的可选树。编辑时排除本部门及其下级；停用的部门下不能新增部门，设为不可选
 */
async function loadParentTree() {
  const depts = await (deptId.value
    ? listDeptExcludeChild(deptId.value)
    : listDept());
  const nodes = depts.map((dept) => ({
    ...dept,
    disabled: dept.status !== STATUS_NORMAL,
  }));
  return listToTree(nodes, 'deptId', 'parentId');
}

/**
 * 负责人的可选用户：本部门的用户。没有查看用户的权限时，只保留当前负责人
 */
async function loadLeaderOptions(record?: DeptApi.Dept) {
  const options: { label: string; value: string }[] = [];
  if (deptId.value && hasPermission('system:user:list')) {
    const users = await listDeptUsers(deptId.value);
    options.push(
      ...users.map((user) => ({
        label: leaderLabel(user),
        value: user.userId,
      })),
    );
  }
  const leader = record?.leader;
  if (leader && !options.some((option) => option.value === leader)) {
    options.unshift({ label: record?.leaderName || leader, value: leader });
  }
  return options;
}

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    drawerApi.lock();
    try {
      const values = (await formApi.getValues()) as DeptApi.Form;
      const data: DeptApi.Form = {
        ...values,
        parentId: editingRoot.value ? ROOT_PARENT_ID : values.parentId,
      };
      await (deptId.value
        ? updateDept({ ...data, deptId: deptId.value })
        : addDept(data));
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
      | { deptId?: string; values?: Partial<DeptApi.Form> };
    deptId.value = data?.deptId;
    editingRoot.value = false;
    await formApi.resetForm();
    drawerApi.lock();
    try {
      const [statusOptions, parentTree, record] = await Promise.all([
        getDictOptions(DictType.NORMAL_DISABLE),
        loadParentTree(),
        deptId.value ? getDept(deptId.value) : undefined,
      ]);
      editingRoot.value = record ? isRootDept(record.parentId) : false;
      const leaderOptions = await loadLeaderOptions(record);
      formApi.updateSchema([
        { componentProps: { options: statusOptions }, fieldName: 'status' },
        { componentProps: { treeData: parentTree }, fieldName: 'parentId' },
        {
          componentProps: {
            // 新部门还没有用户，保存后再选择负责人
            disabled: !deptId.value,
            options: leaderOptions,
          },
          description: deptId.value
            ? $t('system.dept.leaderHelp')
            : $t('system.dept.leaderCreateHelp'),
          fieldName: 'leader',
        },
      ]);
      if (record) {
        await formApi.setValues(record);
      } else if (data?.values) {
        // 新增时的预填值，例如“新增下级”的上级部门
        await formApi.setValues(data.values);
      }
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  deptId.value ? $t('system.dept.edit') : $t('system.dept.create'),
);
</script>

<template>
  <Drawer
    :confirm-text="$t('crud.save')"
    :title="title"
    class="w-full max-w-[560px]"
  >
    <Form />
  </Drawer>
</template>
