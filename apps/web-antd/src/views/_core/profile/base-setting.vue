<script lang="ts" setup>
import type { ProfileApi } from '#/api/system/profile';

import { onMounted, ref, watch } from 'vue';

import { useUserStore } from '@vben/stores';

import { Button, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { DictType, getDictOptions } from '#/api/system/dict';
import { updateProfile } from '#/api/system/profile';
import { $t } from '#/locales';

import { toFormValues, toProfileForm, useBaseSchema } from './data';

const props = defineProps<{ user: ProfileApi.User }>();
const emit = defineEmits<{ saved: [] }>();

const userStore = useUserStore();
const saving = ref(false);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useBaseSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-4',
});

async function fillForm(user: ProfileApi.User) {
  await formApi.setValues(toFormValues(user));
}

async function handleSave() {
  const { valid } = await formApi.validate();
  if (!valid) {
    return;
  }
  saving.value = true;
  try {
    const data = toProfileForm(await formApi.getValues());
    await updateProfile(data);
    // 页头显示的是昵称，直接更新，不必重新加载用户信息
    if (userStore.userInfo && data.nickName) {
      userStore.setUserInfo({ ...userStore.userInfo, realName: data.nickName });
    }
    message.success($t('crud.saved'));
    emit('saved');
  } finally {
    saving.value = false;
  }
}

watch(() => props.user, fillForm);

onMounted(async () => {
  await fillForm(props.user);
  const gender = await getDictOptions(DictType.USER_GENDER);
  formApi.updateSchema([
    { componentProps: { options: gender }, fieldName: 'gender' },
  ]);
});
</script>

<template>
  <div class="max-w-3xl">
    <Form />
    <Button :loading="saving" type="primary" @click="handleSave">
      {{ $t('page.profile.saveProfile') }}
    </Button>
  </div>
</template>
