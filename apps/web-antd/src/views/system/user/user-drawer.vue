<script lang="ts" setup>
import type { PostApi } from '#/api/system/post';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addUser,
  getUser,
  listPostOptions,
  updateUser,
} from '#/api/system/user';
import { $t } from '#/locales';
import { ApiCryptoUnavailableError } from '#/utils/api-crypto';

import { loadFormOptions, toUserForm, useFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

/** 编辑时的用户 ID；新增时为空 */
const userId = ref<string>();

/** 岗位选项对应的部门；填充表单时同步设置，避免把填充当作切换部门而清空岗位 */
let postDeptId: string | undefined;

const [Form, formApi] = useVbenForm({
  handleValuesChange(values, fieldsChanged) {
    const deptId = values.deptId as string | undefined;
    if (fieldsChanged.includes('deptId') && deptId !== postDeptId) {
      onDeptChange(deptId);
    }
  },
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-4',
});

/** 加载部门下的岗位；没有岗位查询权限时为空 */
async function loadPosts(deptId?: string): Promise<PostApi.Post[]> {
  if (!deptId) {
    return [];
  }
  try {
    return await listPostOptions(deptId);
  } catch {
    return [];
  }
}

function setPostOptions(posts: PostApi.Post[]) {
  formApi.updateSchema([
    { componentProps: { options: posts }, fieldName: 'postIds' },
  ]);
}

/** 切换部门后岗位选项随之变化，去掉不属于新部门的岗位 */
async function onDeptChange(deptId?: string) {
  postDeptId = deptId;
  const posts = await loadPosts(deptId);
  setPostOptions(posts);
  const values = await formApi.getValues();
  const selected = (values.postIds as string[] | undefined) ?? [];
  const available = new Set(posts.map((post) => post.postId));
  await formApi.setFieldValue(
    'postIds',
    selected.filter((id) => available.has(id)),
  );
}

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    drawerApi.lock();
    try {
      const form = toUserForm(await formApi.getValues(), userId.value);
      await (userId.value ? updateUser(form) : addUser(form));
      message.success($t('crud.saved'));
      emit('success');
      drawerApi.close();
    } catch (error) {
      // 新增用户需要加密发送初始密码；浏览器无法加密时请求不会发出，这里说明原因
      if (error instanceof ApiCryptoUnavailableError) {
        message.error(error.message);
        return;
      }
      throw error;
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
      | { deptId?: string; userId?: string };
    userId.value = data?.userId;
    const editing = Boolean(userId.value);
    postDeptId = undefined;
    await formApi.resetForm();
    drawerApi.lock();
    try {
      const [options, detail] = await Promise.all([
        loadFormOptions(),
        getUser(userId.value),
      ]);
      formApi.updateSchema([
        { componentProps: { options: options.gender }, fieldName: 'gender' },
        { componentProps: { options: options.status }, fieldName: 'status' },
        { componentProps: { options: detail.roles }, fieldName: 'roleIds' },
        // 登录账号创建后不能修改；密码只在新增时设置，之后用“重置密码”
        { componentProps: { disabled: editing }, fieldName: 'userName' },
        {
          dependencies: { if: !editing, triggerFields: ['userName'] },
          fieldName: 'password',
        },
      ]);
      if (editing && detail.user) {
        postDeptId = detail.user.deptId;
        setPostOptions(detail.posts ?? []);
        await formApi.setValues({
          ...detail.user,
          postIds: detail.postIds ?? [],
          roleIds: detail.roleIds ?? [],
        });
      } else if (data?.deptId) {
        // 新增时默认选中左侧部门树当前选中的部门
        postDeptId = data.deptId;
        setPostOptions(await loadPosts(data.deptId));
        await formApi.setFieldValue('deptId', data.deptId);
      } else {
        setPostOptions([]);
      }
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  userId.value ? $t('system.user.edit') : $t('system.user.create'),
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
